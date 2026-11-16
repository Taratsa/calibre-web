"""Newsletter clippings ("kliping"): Markdown files with YAML frontmatter.

Each clipping is one ``<id>.md`` file. The file is the only source of truth: a YAML frontmatter block carries the
metadata, the Markdown body carries the transcribed text. Unknown frontmatter keys are kept on every rewrite.

This module is the data layer and must not depend on the web/UI layer (see the ``clippings-store-is-pure`` contract
in ``.importlinter``).
"""

import datetime
import os
import re
from dataclasses import dataclass
from pathlib import Path

import yaml
from unidecode import unidecode

from .clean_html import clean_string

MAX_DOCUMENT_BYTES = 1024 * 1024
MAX_FRONTMATTER_BYTES = 64 * 1024
MAX_LIST_ITEMS = 50

STATUSES = ("draft", "published")
# Known frontmatter keys, in the order they are written.
KNOWN_KEYS = (
    "number",
    "title",
    "publication",
    "date",
    "issue",
    "page",
    "authors",
    "tags",
    "language",
    "source_url",
    "status",
)
LIST_KEYS = {"authors", "tags"}
TEXT_LIMITS = {"title": 300, "publication": 200, "issue": 100, "page": 50, "language": 35, "source_url": 2000}

ID_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,119}")
DATE_RE = re.compile(r"(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?")
LANGUAGE_RE = re.compile(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*")
_CLOSING_FENCE_RE = re.compile(r"^(?:---|\.\.\.)[ \t]*$", re.MULTILINE)
_LIST_SPLIT_RE = re.compile(r"[,\n]")
TRASH_DIR = ".trash"


class ClippingError(ValueError):
    """Invalid clipping content (bad frontmatter, failed validation)."""


class ClippingNotFound(LookupError):
    pass


@dataclass(frozen=True)
class Clipping:
    id: str
    meta: dict
    body: str
    extra: dict
    mtime: float


@dataclass(frozen=True)
class Summary:
    id: str
    meta: dict
    mtime: float
    haystack: str


# --------------------------------------------------------------------------- parsing


def parse_document(text):
    """Split a document into ``(frontmatter_dict, body)``. No frontmatter block yields ``({}, text)``."""
    text = text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    if not text.startswith("---\n"):
        return {}, text
    rest = text[4:]
    closing = _CLOSING_FENCE_RE.search(rest)
    if closing is None:
        raise ClippingError("Frontmatter block is not closed with a '---' line")
    raw = rest[: closing.start()]
    if len(raw.encode("utf-8")) > MAX_FRONTMATTER_BYTES:
        raise ClippingError(f"Frontmatter is larger than {MAX_FRONTMATTER_BYTES // 1024} KiB")
    try:
        data = yaml.safe_load(raw) if raw.strip() else {}
    except (yaml.YAMLError, ValueError) as ex:
        raise ClippingError(f"Frontmatter is not valid YAML: {ex}") from ex
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise ClippingError("Frontmatter must be a YAML mapping (key: value)")
    body = rest[closing.end() :]
    body = body.removeprefix("\n")
    return data, body


def _text(value, field):
    if value is None:
        return ""
    if isinstance(value, datetime.datetime):
        return value.date().isoformat()
    if isinstance(value, datetime.date):
        return value.isoformat()
    if isinstance(value, bool) or not isinstance(value, str | int | float):
        raise ClippingError(f"'{field}' must be plain text")
    text = str(value).strip()
    limit = TEXT_LIMITS.get(field)
    if limit and len(text) > limit:
        raise ClippingError(f"'{field}' is longer than {limit} characters")
    return text


def _list(value, field):
    if value is None:
        return []
    items = _LIST_SPLIT_RE.split(value) if isinstance(value, str) else value
    if not isinstance(items, list):
        raise ClippingError(f"'{field}' must be a list")
    result = []
    for item in items:
        text = _text(item, field)
        if len(text) > 200:
            raise ClippingError(f"An entry of '{field}' is longer than 200 characters")
        if text and text not in result:
            result.append(text)
    if len(result) > MAX_LIST_ITEMS:
        raise ClippingError(f"'{field}' has more than {MAX_LIST_ITEMS} entries")
    return result


def _date(value):
    text = _text(value, "date")
    if not text:
        return ""
    match = DATE_RE.fullmatch(text)
    if match is None:
        raise ClippingError("'date' must be YYYY, YYYY-MM or YYYY-MM-DD")
    year, month, day = (int(part) if part else None for part in match.groups())
    try:
        datetime.date(year, month or 1, day or 1)
    except ValueError as ex:
        raise ClippingError("'date' is not a valid calendar date") from ex
    return text


def _number(value):
    """Stable numeric alias (``/kliping/<number>/`` redirects to the id URL). 0 means "none"."""
    if value is None:
        return 0
    if isinstance(value, bool) or not isinstance(value, int | str):
        raise ClippingError("'number' must be a positive whole number")
    text = str(value).strip()
    if not text:
        return 0
    if not text.isascii() or not text.isdigit() or int(text) < 1:
        raise ClippingError("'number' must be a positive whole number")
    return int(text)


def normalize_meta(raw):
    """Validate raw frontmatter. Returns ``(meta, extra)``: every known key present, plus untouched unknown keys."""
    meta = {}
    for key in KNOWN_KEYS:
        value = raw.get(key)
        if key in LIST_KEYS:
            meta[key] = _list(value, key)
        elif key == "date":
            meta[key] = _date(value)
        elif key == "number":
            meta[key] = _number(value)
        else:
            meta[key] = _text(value, key)
    if not meta["title"]:
        raise ClippingError("'title' is required")
    meta["status"] = meta["status"].lower() or "draft"
    if meta["status"] not in STATUSES:
        raise ClippingError("'status' must be one of: {}".format(", ".join(STATUSES)))
    if meta["language"] and not LANGUAGE_RE.fullmatch(meta["language"]):
        raise ClippingError("'language' must be a language code such as 'id' or 'nl'")
    if meta["source_url"] and not re.match(r"https?://\S+$", meta["source_url"]):
        raise ClippingError("'source_url' must be an http(s) URL")
    extra = {str(key): value for key, value in raw.items() if key not in KNOWN_KEYS}
    return meta, extra


def dump_document(meta, body, extra=None):
    """Serialise to ``---\\nfrontmatter\\n---\\nbody``. Empty known fields are omitted; ``extra`` keys follow."""
    data = {}
    for key in KNOWN_KEYS:
        value = meta.get(key)
        if not value and key != "title":
            continue
        if key == "date" and DATE_RE.fullmatch(value).group(3):
            value = datetime.date.fromisoformat(value)  # unquoted `date: 1998-05-01`
        data[key] = value
    for key, value in (extra or {}).items():
        data.setdefault(key, value)
    front = yaml.safe_dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False, width=1000)
    return "---\n{}---\n{}\n".format(front, body.strip("\n"))


def slugify(title, date=""):
    ascii_title = re.sub(r"[^a-z0-9]+", "-", unidecode(title).lower()).strip("-")[:80].strip("-")
    slug = "-".join(part for part in (date, ascii_title) if part)
    return slug or "clipping"


def render_markdown(body):
    """Markdown -> sanitised HTML (same sanitiser as book comments / OCR output)."""
    import markdown2

    html = markdown2.markdown(
        body, extras=["tables", "fenced-code-blocks", "strike", "cuddled-lists", "break-on-newline"]
    )
    return clean_string(str(html))


# --------------------------------------------------------------------------- storage


class ClippingStore:
    def __init__(self, root):
        self.root = Path(root)
        self._cache = {}  # id -> (mtime_ns, size, Summary)

    def _path(self, clipping_id):
        if not ID_RE.fullmatch(clipping_id or ""):
            raise ClippingNotFound(clipping_id)
        return self.root / (clipping_id + ".md")

    def _read(self, path):
        stat = path.stat()
        if stat.st_size > MAX_DOCUMENT_BYTES:
            raise ClippingError(f"File is larger than {MAX_DOCUMENT_BYTES // 1024 // 1024} MiB")
        raw, body = parse_document(path.read_text(encoding="utf-8"))
        meta, extra = normalize_meta(raw)
        return Clipping(path.stem, meta, body, extra, stat.st_mtime)

    def summaries(self):
        """All parseable clippings, newest ``date`` first. Unparseable files are skipped (see ``broken``)."""
        found = {}
        broken = {}
        try:
            entries = [entry for entry in os.scandir(self.root) if entry.is_file() and entry.name.endswith(".md")]
        except FileNotFoundError:
            entries = []
        for entry in entries:
            clipping_id = entry.name[:-3]
            if not ID_RE.fullmatch(clipping_id):
                continue
            stat = entry.stat()
            cached = self._cache.get(clipping_id)
            if cached and cached[0] == stat.st_mtime_ns and cached[1] == stat.st_size:
                found[clipping_id] = cached
                continue
            try:
                clipping = self._read(Path(entry.path))
            except (ClippingError, OSError, UnicodeDecodeError) as ex:
                broken[clipping_id] = str(ex)
                continue
            meta = clipping.meta
            haystack = "\n".join(
                [meta["title"], meta["publication"], meta["issue"], *meta["authors"], *meta["tags"], clipping.body]
            ).lower()
            found[clipping_id] = (stat.st_mtime_ns, stat.st_size, Summary(clipping_id, meta, clipping.mtime, haystack))
        self._cache = found
        ordered = sorted((item[2] for item in found.values()), key=lambda s: s.meta["title"].lower())
        ordered.sort(key=lambda s: s.meta["date"], reverse=True)  # stable: undated last, ties by title
        return ordered, broken

    def get(self, clipping_id):
        path = self._path(clipping_id)
        try:
            return self._read(path)
        except FileNotFoundError as ex:
            raise ClippingNotFound(clipping_id) from ex

    def read_raw(self, clipping_id):
        try:
            return self._path(clipping_id).read_text(encoding="utf-8")
        except FileNotFoundError as ex:
            raise ClippingNotFound(clipping_id) from ex

    def _check_body(self, text):
        if len(text.encode("utf-8")) > MAX_DOCUMENT_BYTES:
            raise ClippingError(f"Document is larger than {MAX_DOCUMENT_BYTES // 1024 // 1024} MiB")

    def _next_number(self):
        """Highest number ever used (live files and ``.trash``) plus one, so a deleted clipping's number is never reused."""
        used = [summary.meta["number"] for summary in self.summaries()[0]]
        trash = self.root / TRASH_DIR
        if trash.is_dir():
            for entry in os.scandir(trash):
                if not entry.name.endswith(".md"):
                    continue
                try:
                    raw, __ = parse_document(Path(entry.path).read_text(encoding="utf-8"))
                    used.append(_number(raw.get("number")))
                except (ClippingError, OSError, UnicodeDecodeError):
                    continue
        return max(used, default=0) + 1

    def create(self, meta, body, extra=None):
        meta = {**meta, "number": self._next_number()}
        text = dump_document(meta, body, extra)
        self._check_body(text)
        self.root.mkdir(parents=True, exist_ok=True)
        base = slugify(meta["title"], meta["date"])
        for counter in range(1, 1000):
            candidate = base if counter == 1 else f"{base}-{counter}"
            if not ID_RE.fullmatch(candidate):
                candidate = candidate[:110].strip("-") + f"-{counter}"
            try:
                with open(self.root / (candidate + ".md"), "x", encoding="utf-8") as handle:
                    handle.write(text)
            except FileExistsError:
                continue
            return self.get(candidate)
        raise ClippingError("Could not find a free file name for this clipping")

    def update(self, clipping_id, meta, body, extra=None):
        path = self._path(clipping_id)
        if not path.is_file():
            raise ClippingNotFound(clipping_id)
        meta = {**meta, "number": self.get(clipping_id).meta["number"] or self._next_number()}
        text = dump_document(meta, body, extra)
        self._check_body(text)
        tmp = path.with_name(f".{clipping_id}.tmp")
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)
        return self.get(clipping_id)

    def delete(self, clipping_id):
        """Move the file to ``.trash/`` (never unlinks)."""
        path = self._path(clipping_id)
        if not path.is_file():
            raise ClippingNotFound(clipping_id)
        trash = self.root / TRASH_DIR
        trash.mkdir(exist_ok=True)
        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        os.replace(path, trash / (f"{stamp}_{clipping_id}.md"))
