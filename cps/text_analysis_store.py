"""Stored corpus statistics, derived from the OCR/EPUB text cache.

``corpus.json`` lives beside the OCR cache (``<OCR_CACHE_DIR>/../analysis``) and is rebuilt as a whole from the cached
texts of all books. Nothing here ever runs OCR: a PDF that has no cached text is left out of the corpus.
"""

from __future__ import annotations

import json
import os
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path

from .ocr_service import (
    BookRecord,
    FormatRecord,
    OcrBookNotFoundError,
    OcrNotReadyError,
    OcrUnavailableError,
    cache_directory,
    extract_book_ocr,
)
from .text_analysis import ANALYSIS_VERSION, CorpusBuilder


def _corpus_path() -> Path:
    directory = cache_directory().parent / "analysis"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / "corpus.json"


def build_corpus(entries: Iterable[tuple[BookRecord, FormatRecord, str]]) -> int:
    """Aggregate the cached text of the given book formats into the stored corpus statistics.

    Callers pass one entry per book. Entries without cached text are skipped. Returns the number of documents used.
    """
    builder = CorpusBuilder()
    for book, data, book_format in entries:
        try:
            document = extract_book_ocr(book, data, book_format, allow_extract=False)
        except (OcrNotReadyError, OcrBookNotFoundError, OcrUnavailableError):
            continue
        builder.add(document.markdown_html, book_format)
    payload = {
        "version": ANALYSIS_VERSION,
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "result": builder.result(),
    }
    path = _corpus_path()
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(path)
    return len(builder.lengths)


def load_corpus() -> dict[str, object] | None:
    """The stored corpus statistics with their build time, or None when none were built for this version."""
    try:
        payload = json.loads(_corpus_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(payload, dict) or payload.get("version") != ANALYSIS_VERSION or not payload.get("result"):
        return None
    return {"built_at": payload.get("built_at"), "corpus": payload["result"]}
