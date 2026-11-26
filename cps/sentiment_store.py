"""Run the sentence classifier over the library and store ``sentiment_sentences.json`` beside the corpus statistics.

Derived data, like the corpus: the OCR/EPUB cache is the source, nothing here runs OCR, and a book without cached text
is skipped. The whole file is rewritten per run; a book's sample is deterministic (see the crate's
``sentiment_sample``), so a rerun scores the same sentences and the numbers only move when the text, the model or the
calendar does.
"""

from __future__ import annotations

import json
import os
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path

from taratsa_text import sentiment_sample, sentiment_sentences, sentiment_summary

from .ocr_service import (
    BookRecord,
    FormatRecord,
    OcrBookNotFoundError,
    OcrNotReadyError,
    OcrUnavailableError,
    cache_directory,
    extract_book_ocr,
)
from .sentiment import SENTENCE_TONE_VERSION, BookTone, profiles
from .text_analysis import SENTIMENT_SAMPLE, SENTIMENT_SAMPLE_MIN

# Books per classifier call: 32 books x 60 sentences is ~5 minutes of CPU, a convenient progress and write unit.
BOOK_BATCH = 32
# Books scored before the stored file is rewritten (it is rewritten as a whole, ~1 MB, so not after every batch).
WRITE_EVERY = 200
# The model ships in the image beside this module.
MODEL_DIRECTORY = Path(__file__).with_name("sentiment_model")


def _tone_path() -> Path:
    directory = cache_directory().parent / "analysis"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / "sentiment_sentences.json"


def configured() -> bool:
    """Whether the model files are present (they are baked into the image)."""
    return (MODEL_DIRECTORY / "model.safetensors").is_file()


def score_books(
    entries: Iterable[tuple[BookRecord, FormatRecord, str]], model_directory: Path = MODEL_DIRECTORY
) -> int:
    """Score every given book with cached text; returns how many books got a tone. Writes the stored file."""
    from taratsa_text import configure_sentiment_model

    if not configured():
        raise RuntimeError(f"sentiment model not found in {model_directory}")
    configure_sentiment_model(str(model_directory))
    books: dict[int, BookTone] = {}
    batch: list[tuple[int, list[str]]] = []

    written = 0

    def write() -> None:
        """Store what has been scored so far: a two-day first pass must not lose its work if it is interrupted."""
        nonlocal written
        stored = {
            "version": SENTENCE_TONE_VERSION,
            "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "model": "Horizon-Labs/multilingual-sentiment-small",
            "books": profiles(books),
        }
        path = _tone_path()
        temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
        temporary.write_text(json.dumps(stored, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        temporary.replace(path)
        written = len(books)

    def flush() -> None:
        texts = [sentence for _, sentences in batch for sentence in sentences]
        if not texts:
            return
        probabilities = sentiment_sentences(texts)
        cursor = 0
        for book_id, sentences in batch:
            result = sentiment_summary(probabilities[cursor : cursor + len(sentences)])
            cursor += len(sentences)
            if result is not None:
                books[book_id] = (result[0], result[1], len(sentences))
        batch.clear()
        if len(books) - written >= WRITE_EVERY:
            write()

    for book, data, book_format in entries:
        try:
            document = extract_book_ocr(book, data, book_format, allow_extract=False)
        except (OcrNotReadyError, OcrBookNotFoundError, OcrUnavailableError):
            continue
        sentences = sentiment_sample(document.markdown_html, book.id, SENTIMENT_SAMPLE)
        if len(sentences) < SENTIMENT_SAMPLE_MIN:
            continue
        batch.append((book.id, sentences))
        if len(batch) >= BOOK_BATCH:
            flush()
    flush()
    if books and len(books) != written:
        write()
    return len(books)
