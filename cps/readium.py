"""Readium Web Publication Manifest (RWPM) for EPUB files.

The Readium ts-toolkit navigator in the browser needs a manifest and a position list; it does not read EPUB zips.
``build_publication`` derives both from the EPUB, and ``read_resource`` serves single zip members.
"""

import mimetypes
import os
import posixpath
import re
import zipfile
from functools import lru_cache
from typing import Any
from urllib.parse import quote, unquote

from lxml import etree  # pyright: ignore[reportAttributeAccessIssue]
from lxml import html as lxml_html  # pyright: ignore[reportAttributeAccessIssue]

OPF_NS = "http://www.idpf.org/2007/opf"
DC_NS = "http://purl.org/dc/elements/1.1/"
NCX_NS = "http://www.daisy.org/z3986/2005/ncx/"
XHTML_NS = "http://www.w3.org/1999/xhtml"
OPS_NS = "http://www.idpf.org/2007/ops"
CONTAINER_NS = "urn:oasis:names:tc:opendocument:xmlns:container"

EPUB_PROFILE = "https://readium.org/webpub-manifest/profiles/epub"
MANIFEST_CONTEXT = "https://readium.org/webpub-manifest/context.jsonld"
XHTML_TYPES = {"application/xhtml+xml", "text/html"}
POSITION_CHARS = 1024

_parser = etree.XMLParser(resolve_entities=False, no_network=True, recover=False)


class EpubError(Exception):
    """The file is not a readable EPUB."""


def _q(ns, name):
    return f"{{{ns}}}{name}"


def _read_xml(archive, name):
    try:
        return etree.fromstring(archive.read(name), parser=_parser)
    except (KeyError, etree.XMLSyntaxError) as error:
        raise EpubError(f"cannot read {name}") from error


def _resolve(base_dir, href):
    """Zip member path for an href relative to ``base_dir`` (fragment and query dropped)."""
    path = unquote(href.split("#", 1)[0].split("?", 1)[0])
    return posixpath.normpath(posixpath.join(base_dir, path))


def _href(member, fragment=""):
    """URL form of a zip path: Readium resolves link hrefs as URLs, so spaces, '#', '?' and '%' must be escaped."""
    return quote(member, safe="/") + (f"#{quote(fragment, safe='')}" if fragment else "")


def _text(node):
    return " ".join("".join(node.itertext()).split()) if node is not None else ""


def parse_opf(archive):
    """Return (opf_path, opf_root) located through META-INF/container.xml."""
    container = _read_xml(archive, "META-INF/container.xml")
    rootfile = container.find(f".//{_q(CONTAINER_NS, 'rootfile')}")
    if rootfile is None or not rootfile.get("full-path"):
        raise EpubError("container.xml has no rootfile")
    opf_path = rootfile.get("full-path")
    return opf_path, _read_xml(archive, opf_path)


def _metadata(opf):
    meta = opf.find(_q(OPF_NS, "metadata"))

    def values(name):
        return [_text(n) for n in meta.findall(_q(DC_NS, name)) if _text(n)] if meta is not None else []

    title = (values("title") or ["Untitled"])[0]
    result: dict[str, Any] = {"title": title, "@type": "http://schema.org/Book", "conformsTo": EPUB_PROFILE}
    if values("identifier"):
        result["identifier"] = values("identifier")[0]
    if values("language"):
        result["language"] = values("language")
    if values("creator"):
        result["author"] = [{"name": name} for name in values("creator")]
    if values("publisher"):
        result["publisher"] = [{"name": name} for name in values("publisher")]
    if values("description"):
        result["description"] = values("description")[0]
    layout = None
    if meta is not None:
        for node in meta.findall(_q(OPF_NS, "meta")):
            if node.get("property") == "rendition:layout":
                layout = _text(node)
    if layout == "pre-paginated":
        result["layout"] = "fixed"
    spine = opf.find(_q(OPF_NS, "spine"))
    direction = spine.get("page-progression-direction") if spine is not None else None
    if direction in ("ltr", "rtl"):
        result["readingProgression"] = direction
    return result


def _toc_link(base_dir, href, title, content_paths):
    """A ToC entry whose href is the zip path (+ fragment); entries pointing outside the reading order are dropped."""
    if not href:
        return None
    member = _resolve(base_dir, href)
    if member not in content_paths:
        return None
    fragment = unquote(href.split("#", 1)[1]) if "#" in href else ""
    return {"title": title, "href": _href(member, fragment)}


def _nav_list(ol, base_dir, content_paths):
    items = []
    for li in ol.findall(_q(XHTML_NS, "li")):
        anchor = li.find(_q(XHTML_NS, "a"))
        if anchor is None:
            anchor = li.find(_q(XHTML_NS, "span"))
        child_ol = li.find(_q(XHTML_NS, "ol"))
        children = _nav_list(child_ol, base_dir, content_paths) if child_ol is not None else []
        link = _toc_link(base_dir, anchor.get("href") if anchor is not None else None, _text(anchor), content_paths)
        if link is None and children:
            # a heading without a target: promote its children
            items.extend(children)
            continue
        if link is not None:
            if children:
                link["children"] = children
            items.append(link)
    return items


def _toc_from_nav(archive, nav_path, content_paths):
    root = _read_xml(archive, nav_path)
    base_dir = posixpath.dirname(nav_path)
    for nav in root.iter(_q(XHTML_NS, "nav")):
        if nav.get(_q(OPS_NS, "type")) == "toc":
            ol = nav.find(_q(XHTML_NS, "ol"))
            return _nav_list(ol, base_dir, content_paths) if ol is not None else []
    return []


def _ncx_points(parent, base_dir, content_paths):
    items = []
    for point in parent.findall(_q(NCX_NS, "navPoint")):
        label = _text(point.find(f"{_q(NCX_NS, 'navLabel')}/{_q(NCX_NS, 'text')}"))
        content = point.find(_q(NCX_NS, "content"))
        children = _ncx_points(point, base_dir, content_paths)
        link = _toc_link(base_dir, content.get("src") if content is not None else None, label, content_paths)
        if link is None and children:
            items.extend(children)
            continue
        if link is not None:
            if children:
                link["children"] = children
            items.append(link)
    return items


def _toc_from_ncx(archive, ncx_path, content_paths):
    root = _read_xml(archive, ncx_path)
    nav_map = root.find(_q(NCX_NS, "navMap"))
    return _ncx_points(nav_map, posixpath.dirname(ncx_path), content_paths) if nav_map is not None else []


def _content_length(archive, member):
    """Characters of visible text in a spine document (drives the position list)."""
    try:
        root = etree.fromstring(archive.read(member), parser=_parser)
    except (KeyError, etree.XMLSyntaxError):
        return 0
    body = root.find(f".//{_q(XHTML_NS, 'body')}")
    if body is None:
        return 0
    skipped = {_q(XHTML_NS, "script"), _q(XHTML_NS, "style")}
    chars = 0
    for node in body.iter():
        if node.tag in skipped:
            continue
        if node.text and node.tag not in skipped:
            chars += len(node.text.strip())
        if node.tail and node.getparent() is not None and node.getparent().tag not in skipped:
            chars += len(node.tail.strip())
    return chars


def build_publication(epub_path):
    """Return ``(manifest, positions)`` as RWPM-shaped dicts for the EPUB at ``epub_path``.

    The manifest has no ``links``: the caller adds the ``self`` and position-list links for the URL it serves them at.
    """
    try:
        archive = zipfile.ZipFile(epub_path)
    except (OSError, zipfile.BadZipFile) as error:
        raise EpubError("not a zip file") from error
    with archive:
        opf_path, opf = parse_opf(archive)
        base_dir = posixpath.dirname(opf_path)
        items = {}
        for item in opf.iterfind(f"{_q(OPF_NS, 'manifest')}/{_q(OPF_NS, 'item')}"):
            if item.get("id") and item.get("href"):
                items[item.get("id")] = {
                    "path": _resolve(base_dir, item.get("href")),
                    "type": item.get("media-type", "application/octet-stream"),
                    "properties": (item.get("properties") or "").split(),
                }
        spine = opf.find(_q(OPF_NS, "spine"))
        reading_order = []
        for itemref in spine.findall(_q(OPF_NS, "itemref")) if spine is not None else []:
            item = items.get(itemref.get("idref"))
            if item and item["type"] in XHTML_TYPES and itemref.get("linear") != "no":
                reading_order.append(item)
        if not reading_order:
            raise EpubError("empty reading order")
        content_paths = {item["path"] for item in reading_order}

        toc = []
        nav = next((i for i in items.values() if "nav" in i["properties"]), None)
        if nav is not None:
            toc = _toc_from_nav(archive, nav["path"], content_paths)
        if not toc and spine is not None and spine.get("toc") in items:
            toc = _toc_from_ncx(archive, items[spine.get("toc")]["path"], content_paths)

        lengths = [max(1, _content_length(archive, item["path"])) for item in reading_order]
        total = sum(lengths)
        manifest = {
            "@context": MANIFEST_CONTEXT,
            "metadata": _metadata(opf),
            "readingOrder": [{"href": _href(item["path"]), "type": item["type"]} for item in reading_order],
            "resources": [
                {"href": _href(item["path"]), "type": item["type"]}
                for item in items.values()
                if item["path"] not in content_paths and not item["path"].endswith(".ncx")
            ],
            "toc": toc,
        }
        positions, number, before = [], 1, 0
        for item, length in zip(reading_order, lengths):
            count = max(1, -(-length // POSITION_CHARS))
            for index in range(count):
                positions.append(
                    {
                        "href": _href(item["path"]),
                        "type": item["type"],
                        "locations": {
                            "position": number,
                            "progression": index / count,
                            "totalProgression": (before + length * index / count) / total,
                        },
                    }
                )
                number += 1
            before += length
        return manifest, {"total": len(positions), "positions": positions}


MAX_RESOURCE_BYTES = 64 * 1024 * 1024
_TYPE_OVERRIDES = {
    ".xhtml": "application/xhtml+xml",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".ncx": "application/x-dtbncx+xml",
    ".otf": "font/otf",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".webp": "image/webp",
}


# Chapters render in a same-origin iframe (allow-scripts + allow-same-origin) that can reach the logged-in session,
# so an uploaded EPUB must not carry executable content: Readium only blocks storage, not DOM access to the parent.
_URL_ATTRS = {"href", "src", "action", "formaction", "data"}


def _drop(node):
    """Remove ``node`` but keep the text that followed it."""
    parent = node.getparent()
    if node.tail:
        previous = node.getprevious()
        if previous is not None:
            previous.tail = (previous.tail or "") + node.tail
        else:
            parent.text = (parent.text or "") + node.tail
    parent.remove(node)


def strip_active_content(data, media_type):
    """Markup without ``<script>``, ``on*`` handlers, ``srcdoc`` and ``javascript:`` URLs.

    Every XHTML/HTML/SVG resource is parsed (a byte-level prefilter misses obfuscated forms such as ``java&#9;script:``
    or entity-encoded names) but only re-serialised when something was removed, so clean documents keep their exact
    bytes. Other media types pass through. ``None`` means the markup cannot be parsed and so cannot be cleaned; a
    browser would not render such an XHTML/SVG file either.
    """
    if media_type not in XHTML_TYPES and media_type != "image/svg+xml":
        return data
    try:
        if media_type == "text/html":
            root = lxml_html.document_fromstring(data)
        else:
            root = etree.fromstring(data, parser=_parser)
    except (etree.XMLSyntaxError, etree.ParserError, ValueError):
        return None
    changed = False
    for node in list(root.iter()):
        if not isinstance(node.tag, str):
            continue
        if etree.QName(node).localname.lower() == "script":
            _drop(node)
            changed = True
            continue
        for name, value in list(node.attrib.items()):
            local = name.rsplit("}", 1)[-1].lower()
            if (
                local.startswith("on")
                or local == "srcdoc"
                or (local in _URL_ATTRS and re.sub(r"[\s\x00-\x1f]", "", value).lower().startswith("javascript:"))
            ):
                del node.attrib[name]
                changed = True
    if not changed:
        return data
    tree = root.getroottree()
    if media_type == "text/html":
        return lxml_html.tostring(tree, encoding="utf-8", doctype="<!DOCTYPE html>")
    return etree.tostring(tree, xml_declaration=True, encoding="utf-8")


def read_resource(epub_path, member):
    """Bytes and media type of one zip member, or ``None`` when it does not exist.

    ``member`` comes from the URL: reject anything that is not a plain relative path inside the archive.
    """
    if not member or member.startswith("/") or ".." in member.split("/") or "\\" in member or "\x00" in member:
        return None
    try:
        with zipfile.ZipFile(epub_path) as archive:
            info = archive.getinfo(member)
            if info.is_dir() or info.file_size > MAX_RESOURCE_BYTES:
                return None
            data = archive.read(info)
    except (KeyError, OSError, zipfile.BadZipFile):
        return None
    suffix = posixpath.splitext(member)[1].lower()
    media_type = _TYPE_OVERRIDES.get(suffix) or mimetypes.guess_type(member)[0] or "application/octet-stream"
    data = strip_active_content(data, media_type)
    if data is None:
        return None
    return data, media_type


@lru_cache(maxsize=32)
def _cached_publication(epub_path, mtime_ns, size):
    return build_publication(epub_path)


def load_publication(epub_path):
    """``build_publication`` memoised on the file's identity, so a replaced EPUB is parsed again."""
    stat = os.stat(epub_path)
    return _cached_publication(epub_path, stat.st_mtime_ns, stat.st_size)
