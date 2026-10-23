"""Document text extraction: PDFs via a TurboOCR server, EPUBs directly."""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import posixpath
import threading
import time
import zipfile
from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
from html import escape
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Protocol, cast
from urllib.parse import unquote

import lxml.etree as etree

from . import config, logger
from .clean_html import clean_string
from .file_helper import get_temp_dir
from .gdriveutils import getFileFromEbooksFolder
from .ocr_layout import build_document_html

log = logger.create()

CACHE_VERSION = 6
PDF_FORMAT = "PDF"
EPUB_FORMAT = "EPUB"
# Bump when text extraction or page layout cleanup changes. Each only invalidates its own format's cached results
# (a PDF re-run costs GPU time, so PDFs are not invalidated by EPUB changes and vice versa).
EPUB_EXTRACT_VERSION = 2
PDF_LAYOUT_VERSION = 2
_ocr_lock = threading.Lock()
ProgressCallback = Callable[[int, int], None]


class BookRecord(Protocol):
    id: int
    path: str
    title: str


class FormatRecord(Protocol):
    name: str
    format: str




class DriveFile(Protocol):
    def GetContentFile(self, filename: str) -> None: ...


class OcrUnavailableError(RuntimeError):
    """Raised when document extraction is unavailable."""


class OcrNotReadyError(RuntimeError):
    """Raised when a document has not been OCR'd yet and extraction was not allowed."""


class OcrBookNotFoundError(FileNotFoundError):
    """Raised when a book does not contain an accessible OCR format."""


@dataclass(frozen=True)
class OcrDocument:
    markdown_html: str
    page_count: int
    pages_routed_to_ocr: int
    processing_time_ms: int


@dataclass(frozen=True)
class _ExtractedDocument:
    content: str
    page_count: int
    pages_routed_to_ocr: int
    processing_time_ms: int


def _cache_directory() -> Path:
    directory = Path(os.environ.get("OCR_CACHE_DIR", "/config/ocr-cache/results"))
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _cache_details(
    book: BookRecord, data: FormatRecord, book_format: str, document_path: Path
) -> tuple[Path, dict[str, object]]:
    stat = document_path.stat()
    mtime_ns = None if config.config_use_google_drive else stat.st_mtime_ns
    request: dict[str, object] = {
        "version": CACHE_VERSION,
        "book_id": book.id,
        "format": book_format,
        "name": data.name,
        "size": stat.st_size,
        "mtime_ns": mtime_ns,
    }
    if book_format == EPUB_FORMAT:
        request["extract_version"] = EPUB_EXTRACT_VERSION
    else:
        request["layout_version"] = PDF_LAYOUT_VERSION
    fingerprint = json.dumps(request, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(fingerprint.encode()).hexdigest()
    return _cache_directory() / f"{book.id}-{digest}.json", request


def _load_cache(path: Path) -> OcrDocument | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        result = payload["result"]
        if result["status"] != "ready":
            return None
        return OcrDocument(
            markdown_html=result["markdown_html"],
            page_count=int(result["page_count"]),
            pages_routed_to_ocr=int(result["pages_routed_to_ocr"]),
            processing_time_ms=int(result["processing_time_ms"]),
        )
    except (OSError, KeyError, TypeError, ValueError):
        return None


def _save_cache(path: Path, request: dict[str, object], result: dict[str, object]) -> None:
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps({"request": request, "result": result}, ensure_ascii=False),
        encoding="utf-8",
    )
    temporary.replace(path)


def ready_ocr_entries() -> list[tuple[int, str, int]]:
    entries: dict[tuple[int, str], int] = {}
    for path in _cache_directory().glob("*.json"):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            cache_request = payload["request"]
            result = payload["result"]
            book_format = str(cache_request["format"]).lower()
            if (
                cache_request.get("version") != CACHE_VERSION
                or result.get("status") != "ready"
                or book_format not in {PDF_FORMAT.lower(), EPUB_FORMAT.lower()}
            ):
                continue
            key = (int(cache_request["book_id"]), book_format)
            entries[key] = max(entries.get(key, 0), path.stat().st_mtime_ns)
        except (OSError, KeyError, TypeError, ValueError):
            continue
    return [(book_id, book_format, mtime_ns) for (book_id, book_format), mtime_ns in sorted(entries.items())]


def _local_document_path(book: BookRecord, data: FormatRecord, book_format: str) -> Path:
    return Path(config.get_book_path()) / book.path / f"{data.name}.{book_format.lower()}"


@contextmanager
def _document_path(book: BookRecord, data: FormatRecord, book_format: str) -> Generator[Path, None, None]:
    suffix = f".{book_format.lower()}"
    if not config.config_use_google_drive:
        document_path = _local_document_path(book, data, book_format)
        if not document_path.is_file():
            raise OcrBookNotFoundError(f"{book_format} not found at {document_path}")
        yield document_path
        return

    drive_file = cast(
        DriveFile | None,
        getFileFromEbooksFolder(book.path, f"{data.name}{suffix}"),
    )
    if drive_file is None:
        raise OcrBookNotFoundError(f"{book_format} not found on Google Drive")

    temp_dir = Path(get_temp_dir())
    with NamedTemporaryFile(
        prefix=f"ocr-{book.id}-",
        suffix=suffix,
        dir=temp_dir,
        delete=False,
    ) as staged:
        document_path = Path(staged.name)
    try:
        drive_file.GetContentFile(str(document_path))
        yield document_path
    finally:
        with contextlib.suppress(OSError):
            document_path.unlink()


def _turboocr_url() -> str:
    url = os.environ.get("TURBOOCR_URL", "").strip().rstrip("/")
    if not url:
        raise OcrUnavailableError("TURBOOCR_URL is not configured")
    return url


def _turboocr_timeout_seconds() -> int:
    return max(1, int(os.environ.get("TURBOOCR_TIMEOUT_SECONDS", "900")))


def _turboocr_idle_seconds() -> int:
    return max(1, int(os.environ.get("TURBOOCR_IDLE_SECONDS", "120")))


def _stream_pdf(pdf_path: Path, on_progress: ProgressCallback | None = None) -> _ExtractedDocument:
    import requests

    started = time.perf_counter()
    deadline = started + _turboocr_timeout_seconds()
    pages: dict[int, dict[str, object]] = {}
    expected_pages: int | None = None
    failed_pages = 0
    ended = False
    with _ocr_lock, pdf_path.open("rb") as pdf_file:
        try:
            response = requests.post(
                f"{_turboocr_url()}/ocr/stream",
                params={"mode": "auto", "as_blocks": "1", "tables": "1", "autorotate": "1"},
                data=pdf_file,
                headers={"Content-Type": "application/pdf"},
                stream=True,
                timeout=(10, _turboocr_idle_seconds()),
            )
        except requests.RequestException as exc:
            raise OcrUnavailableError(f"TurboOCR request failed: {exc}") from exc
        with response:
            if response.status_code != 200:
                raise OcrUnavailableError(f"TurboOCR returned HTTP {response.status_code}: {response.text[:300]}")
            try:
                for line in response.iter_lines():
                    if time.perf_counter() > deadline:
                        raise OcrUnavailableError(f"OCR processing exceeded {_turboocr_timeout_seconds()} seconds")
                    if not line:
                        continue
                    event = json.loads(line)
                    kind = event.get("event")
                    if kind == "meta":
                        expected_pages = int(event["pages"])
                    elif kind == "page":
                        pages[int(event["page_index"])] = event
                        if on_progress and expected_pages:
                            on_progress(len(pages), expected_pages)
                    elif kind == "page_error":
                        failed_pages += 1
                    elif kind == "error":
                        raise OcrUnavailableError(f"TurboOCR failed mid-stream: {event.get('code')}")
                    elif kind == "end":
                        ended = True
                        failed_pages = max(failed_pages, int(event.get("failed", 0)))
            except requests.RequestException as exc:
                raise OcrUnavailableError(f"TurboOCR stream interrupted: {exc}") from exc
            except (ValueError, KeyError, TypeError) as exc:
                raise OcrUnavailableError(f"TurboOCR returned an invalid stream: {exc}") from exc
    if not ended or failed_pages or expected_pages is None or len(pages) != expected_pages:
        raise OcrUnavailableError(
            f"TurboOCR result incomplete: {len(pages)}/{expected_pages} pages, {failed_pages} failed, ended={ended}"
        )
    content = build_document_html(pages)
    return _ExtractedDocument(
        content=content,
        page_count=expected_pages,
        pages_routed_to_ocr=sum(1 for page in pages.values() if page.get("mode") == "ocr"),
        processing_time_ms=int((time.perf_counter() - started) * 1000),
    )


def _extract_pdf(pdf_path: Path, on_progress: ProgressCallback | None = None) -> _ExtractedDocument:
    try:
        return _stream_pdf(pdf_path, on_progress)
    except OcrUnavailableError:
        raise
    except Exception as exc:
        log.error_or_exception(exc)
        raise OcrUnavailableError(str(exc)) from exc


def _epub_path(rootfile: str, href: str) -> str | None:
    path = posixpath.normpath(
        posixpath.join(posixpath.dirname(rootfile), unquote(href.split("#", 1)[0].split("?", 1)[0]))
    )
    if path in {"", ".", ".."} or path.startswith(("../", "/")):
        return None
    return path


def _epub_spine_paths(archive: zipfile.ZipFile) -> list[str]:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False, recover=True)
    archive_names = set(archive.namelist())
    container = etree.fromstring(archive.read("META-INF/container.xml"), parser=parser)
    rootfiles = container.xpath("//*[local-name()='rootfile']")
    if not rootfiles:
        raise OcrUnavailableError("EPUB container has no rootfile")
    rootfile = rootfiles[0].get("full-path")
    if not rootfile:
        raise OcrUnavailableError("EPUB container has no OPF path")
    opf_path = posixpath.normpath(unquote(rootfile).lstrip("/"))
    if opf_path not in archive_names:
        raise OcrUnavailableError("EPUB OPF file is missing")
    package = etree.fromstring(archive.read(opf_path), parser=parser)
    manifest = {
        item.get("id"): item
        for item in package.xpath("//*[local-name()='manifest']/*[local-name()='item']")
        if item.get("id")
    }
    paths: list[str] = []
    for itemref in package.xpath("//*[local-name()='spine']/*[local-name()='itemref']"):
        item = manifest.get(itemref.get("idref"))
        if item is None:
            continue
        media_type = (item.get("media-type") or "").lower()
        href = item.get("href") or ""
        if media_type not in {"application/xhtml+xml", "text/html"} and not href.lower().split("?", 1)[0].endswith(
            (".xhtml", ".html", ".htm")
        ):
            continue
        path = _epub_path(opf_path, href)
        if path and path in archive_names:
            paths.append(path)
    if paths:
        return paths
    for item in manifest.values():
        media_type = (item.get("media-type") or "").lower()
        href = item.get("href") or ""
        if media_type not in {"application/xhtml+xml", "text/html"} and not href.lower().split("?", 1)[0].endswith(
            (".xhtml", ".html", ".htm")
        ):
            continue
        path = _epub_path(opf_path, href)
        if path and path in archive_names:
            paths.append(path)
    return paths


_EPUB_HEADINGS = frozenset({"h1", "h2", "h3", "h4", "h5", "h6"})
_EPUB_EMPTY_BLOCKS = frozenset({"p", "div", "section"})
_EPUB_UNWANTED = (
    ".//*[local-name()='script' or local-name()='style' or local-name()='noscript' or local-name()='template'"
    " or @hidden"  # hidden navigation such as the "Landmarks" list
    " or (local-name()='nav' and @*[local-name()='type']='landmarks')"
    # Images and SVG reference files inside the EPUB, which the reader does not serve: they would render broken.
    " or local-name()='svg' or local-name()='image'"
    " or (local-name()='img' and not(starts-with(@src, 'http://') or starts-with(@src, 'https://')))]"
)
_EPUB_KEEP_WHEN_EMPTY = ".//*[local-name()='table' or local-name()='hr' or local-name()='img']"


def _epub_remove(element: etree._Element) -> None:
    """Remove an element but keep the text after it (lxml would drop that tail)."""
    parent = element.getparent()
    if parent is None:
        return
    if element.tail:
        previous = element.getprevious()
        if previous is not None:
            previous.tail = (previous.tail or "") + element.tail
        else:
            parent.text = (parent.text or "") + element.tail
    parent.remove(element)


def _epub_fragment(payload: bytes) -> str:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False, recover=True)
    document = etree.fromstring(payload, parser=parser)
    body_nodes = document.xpath("//*[local-name()='body']")
    body = body_nodes[0] if body_nodes else document
    for element in body.xpath(_EPUB_UNWANTED):
        _epub_remove(element)
    for heading in [e for e in body.iter() if isinstance(e.tag, str) and etree.QName(e).localname in _EPUB_HEADINGS]:
        if "".join(heading.itertext()).strip():
            continue
        # Publishers often leave the heading empty and put its text in a title attribute.
        title = (heading.get("title") or "").strip()
        if not title:
            _epub_remove(heading)
            continue
        for child in list(heading):
            heading.remove(child)
        heading.text = title
    # Children are visited before their parents, so a block emptied by the removals above goes too.
    for element in reversed([e for e in body.iter() if isinstance(e.tag, str)]):
        if element is body or etree.QName(element).localname not in _EPUB_EMPTY_BLOCKS:
            continue
        if "".join(element.itertext()).strip() or element.xpath(_EPUB_KEEP_WHEN_EMPTY):
            continue
        _epub_remove(element)
    content = "".join(
        etree.tostring(child, encoding="unicode", method="html") for child in body if isinstance(child.tag, str)
    ).strip()
    if body.text and body.text.strip():
        content = f"<p>{escape(body.text.strip())}</p>{content}"
    if content:
        return content
    text = " ".join(part.strip() for part in body.itertext() if part.strip())
    return f"<p>{escape(text)}</p>" if text else ""


def _extract_epub(epub_path: Path) -> _ExtractedDocument:
    started = time.perf_counter()
    try:
        with zipfile.ZipFile(epub_path) as archive:
            paths = _epub_spine_paths(archive)
            fragments = [_epub_fragment(archive.read(path)) for path in paths]
    except OcrUnavailableError:
        raise
    except Exception as exc:
        log.error_or_exception(exc)
        raise OcrUnavailableError(str(exc)) from exc
    fragments = [fragment for fragment in fragments if fragment]
    if not fragments:
        raise OcrUnavailableError("EPUB contains no readable text")
    return _ExtractedDocument(
        content="\n<hr>\n".join(fragments),
        page_count=len(fragments),
        pages_routed_to_ocr=0,
        processing_time_ms=round((time.perf_counter() - started) * 1000),
    )


def book_ocr_available(book: BookRecord, data: FormatRecord, book_format: str | None = None) -> bool:
    selected_format = (book_format or getattr(data, "format", PDF_FORMAT)).upper()
    if selected_format not in {PDF_FORMAT, EPUB_FORMAT}:
        raise OcrBookNotFoundError(f"Unsupported OCR format: {selected_format}")
    with _document_path(book, data, selected_format) as document_path:
        cache_path, _request = _cache_details(book, data, selected_format, document_path)
        return _load_cache(cache_path) is not None


def extract_book_ocr(
    book: BookRecord,
    data: FormatRecord,
    book_format: str | None = None,
    on_progress: ProgressCallback | None = None,
    allow_extract: bool = True,
) -> OcrDocument:
    """Return the OCR document, extracting it on a cache miss.

    With ``allow_extract=False`` a PDF cache miss raises ``OcrNotReadyError`` instead, so request handlers never
    run a multi-minute TurboOCR extraction. EPUB text is read from the file in well under a second, so it is
    always extracted inline.
    """
    selected_format = (book_format or getattr(data, "format", PDF_FORMAT)).upper()
    if selected_format not in {PDF_FORMAT, EPUB_FORMAT}:
        raise OcrBookNotFoundError(f"Unsupported OCR format: {selected_format}")
    with _document_path(book, data, selected_format) as document_path:
        cache_path, request = _cache_details(book, data, selected_format, document_path)
        cached = _load_cache(cache_path)
        if cached:
            return cached
        if not allow_extract and selected_format == PDF_FORMAT:
            raise OcrNotReadyError(f"{selected_format} of book {book.id} has not been processed yet")
        extracted = (
            _extract_pdf(document_path, on_progress) if selected_format == PDF_FORMAT else _extract_epub(document_path)
        )
        markdown_html = clean_string(extracted.content, book.id)
        document = OcrDocument(
            markdown_html=markdown_html,
            page_count=extracted.page_count,
            pages_routed_to_ocr=extracted.pages_routed_to_ocr,
            processing_time_ms=extracted.processing_time_ms,
        )
        _save_cache(
            cache_path,
            request,
            {
                "status": "ready",
                "markdown_html": document.markdown_html,
                "page_count": document.page_count,
                "pages_routed_to_ocr": document.pages_routed_to_ocr,
                "processing_time_ms": document.processing_time_ms,
            },
        )
        return document


def scan_book_ocr(
    book: BookRecord,
    data: FormatRecord,
    book_format: str,
    on_progress: ProgressCallback | None = None,
) -> None:
    selected_format = book_format.upper()
    if selected_format not in {PDF_FORMAT, EPUB_FORMAT}:
        raise OcrBookNotFoundError(f"Unsupported OCR format: {selected_format}")
    extract_book_ocr(book, data, selected_format, on_progress)
