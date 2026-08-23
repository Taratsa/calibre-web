"""Document text extraction integration using Firecrawl's pdf-inspector bindings."""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import posixpath
import subprocess
import sys
import tempfile
import threading
import time
import zipfile
from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import dataclass
from html import escape
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Protocol, cast
from urllib.parse import unquote

import lxml.etree as etree
from markdown2 import markdown as render_markdown  # pyright: ignore[reportMissingImports]

from . import config, logger
from .clean_html import clean_string
from .file_helper import get_temp_dir
from .gdriveutils import getFileFromEbooksFolder

log = logger.create()

CACHE_VERSION = 3
PDF_FORMAT = "PDF"
EPUB_FORMAT = "EPUB"
OCR_WORKER_SCRIPT = Path(__file__).with_name("ocr_worker.py")
_ocr_worker_lock = threading.Lock()


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


class OcrBookNotFoundError(FileNotFoundError):
    """Raised when a book does not contain an accessible OCR format."""


class OcrScannedPdfError(RuntimeError):
    """Raised when a PDF contains no extractable text layer."""


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
    fingerprint = json.dumps(request, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(fingerprint.encode()).hexdigest()
    return _cache_directory() / f"{book.id}-{digest}.json", request


def _load_cache(path: Path) -> OcrDocument | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        result = payload["result"]
        if result["status"] == "scanned":
            raise OcrScannedPdfError("OCR is disabled for fully scanned PDF pages.")
        if result["status"] != "ready":
            return None
        return OcrDocument(
            markdown_html=result["markdown_html"],
            page_count=int(result["page_count"]),
            pages_routed_to_ocr=int(result["pages_routed_to_ocr"]),
            processing_time_ms=int(result["processing_time_ms"]),
        )
    except OcrScannedPdfError:
        raise
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


def _offline_ocr() -> bool:
    return os.environ.get("PDF_INSPECTOR_OFFLINE", "0").strip().lower() in {"1", "true", "yes"}


def _worker_timeout_seconds() -> int:
    return max(1, int(os.environ.get("OCR_WORKER_TIMEOUT_SECONDS", "300")))


def _worker_memory_mb() -> int:
    return max(256, int(os.environ.get("OCR_WORKER_MEMORY_MB", "4096")))


def _run_worker(command: list[str]) -> subprocess.CompletedProcess[str]:
    with _ocr_worker_lock:
        return subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=_worker_timeout_seconds(),
        )  # nosec: fixed executable and worker script; document paths are argv entries


def _run_worker_without_blocking_server(command: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        from gevent import get_hub  # pyright: ignore[reportMissingModuleSource]

        return get_hub().threadpool.apply(_run_worker, (command,))
    except ImportError:
        return _run_worker(command)

def _extract_pdf(pdf_path: Path) -> _ExtractedDocument:
    output_fd, output_name = tempfile.mkstemp(prefix="ocr-result-", suffix=".json", dir=get_temp_dir())
    os.close(output_fd)
    output_path = Path(output_name)
    command = [
        sys.executable,
        str(OCR_WORKER_SCRIPT),
        str(pdf_path),
        str(output_path),
        "1" if _offline_ocr() else "0",
        str(_worker_memory_mb()),
    ]
    try:
        completed = _run_worker_without_blocking_server(command)
        if completed.returncode != 0:
            message = completed.stderr.strip() or f"OCR worker exited with status {completed.returncode}"
            raise OcrUnavailableError(message)
        payload = json.loads(output_path.read_text(encoding="utf-8"))
        if payload.get("status") == "scanned":
            raise OcrScannedPdfError("OCR is disabled for fully scanned PDF pages.")
        if payload.get("status") != "ready":
            raise OcrUnavailableError(str(payload.get("error") or "OCR worker returned an invalid result"))
        return _ExtractedDocument(
            content=str(payload["content"]),
            page_count=int(payload["page_count"]),
            pages_routed_to_ocr=int(payload["pages_routed_to_ocr"]),
            processing_time_ms=int(payload["processing_time_ms"]),
        )
    except subprocess.TimeoutExpired as exc:
        raise OcrUnavailableError(f"OCR processing exceeded {_worker_timeout_seconds()} seconds") from exc
    except (OcrScannedPdfError, OcrUnavailableError):
        raise
    except Exception as exc:
        log.error_or_exception(exc)
        raise OcrUnavailableError(str(exc)) from exc
    finally:
        with contextlib.suppress(OSError):
            output_path.unlink()


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


def _epub_fragment(payload: bytes) -> str:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False, recover=True)
    document = etree.fromstring(payload, parser=parser)
    body_nodes = document.xpath("//*[local-name()='body']")
    body = body_nodes[0] if body_nodes else document
    for element in body.xpath(
        ".//*[local-name()='script' or local-name()='style' or local-name()='noscript' or local-name()='template']"
    ):
        parent = element.getparent()
        if parent is not None:
            parent.remove(element)
    content = "".join(
        etree.tostring(child, encoding="unicode", method="html") for child in body if isinstance(child.tag, str)
    ).strip()
    if body.text:
        content = f"<p>{escape(body.text)}</p>{content}"
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
        try:
            cached = _load_cache(cache_path)
        except OcrScannedPdfError:
            return False
        return cached is not None


def extract_book_ocr(book: BookRecord, data: FormatRecord, book_format: str | None = None) -> OcrDocument:
    selected_format = (book_format or getattr(data, "format", PDF_FORMAT)).upper()
    if selected_format not in {PDF_FORMAT, EPUB_FORMAT}:
        raise OcrBookNotFoundError(f"Unsupported OCR format: {selected_format}")
    with _document_path(book, data, selected_format) as document_path:
        cache_path, request = _cache_details(book, data, selected_format, document_path)
        cached = _load_cache(cache_path)
        if cached:
            return cached
        try:
            extracted = _extract_pdf(document_path) if selected_format == PDF_FORMAT else _extract_epub(document_path)
        except OcrScannedPdfError:
            _save_cache(cache_path, request, {"status": "scanned"})
            raise
        if selected_format == PDF_FORMAT:
            markdown_html = clean_string(
                render_markdown(
                    extracted.content,
                    extras=["break-on-newline", "fenced-code-blocks", "tables"],
                ),
                book.id,
            )
        else:
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


def scan_book_ocr(book: BookRecord, data: FormatRecord, book_format: str) -> str:
    selected_format = book_format.upper()
    if selected_format not in {PDF_FORMAT, EPUB_FORMAT}:
        raise OcrBookNotFoundError(f"Unsupported OCR format: {selected_format}")
    try:
        extract_book_ocr(book, data, selected_format)
    except OcrScannedPdfError:
        return "scanned"
    return "ready"
