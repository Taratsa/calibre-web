"""Run the sentence classifier over the library and store ``sentiment_sentences.json`` beside the corpus statistics.

Derived data, like the corpus: the OCR/EPUB cache is the source, nothing here runs OCR, and a book without cached text
is skipped. The whole file is rewritten per run; a book's sample is deterministic (see the crate's
``sentiment_sample``), so a rerun scores the same sentences and the numbers only move when the text, the model or the
calendar does.
"""

from __future__ import annotations

import json
import os
from collections import Counter
from collections.abc import Iterable, Sequence
from datetime import UTC, datetime
from pathlib import Path

from taratsa_text import emotion_labels, sentiment_sample, sentiment_sentences, sentiment_summary

from .ocr_service import (
    BookRecord,
    FormatRecord,
    OcrBookNotFoundError,
    OcrNotReadyError,
    OcrUnavailableError,
    cache_directory,
    extract_book_ocr,
)
from .sentiment import SENTENCE_TONE_VERSION, BookTone, calibrated, record
from .text_analysis import SENTIMENT_SAMPLE, SENTIMENT_SAMPLE_MIN, language_words

# Books per classifier call: 32 books x 60 sentences is ~5 minutes of CPU, a convenient progress and write unit.
BOOK_BATCH = 32
# Books scored before the stored file is rewritten (it is rewritten as a whole, ~1 MB, so not after every batch).
WRITE_EVERY = 200
# The models ship in the image beside this module: the sentence-tone ModernBERT and one RoBERTa per emotion language.
MODEL_ROOT = Path(__file__).with_name("sentiment_model")
SENTIMENT_DIRECTORY = MODEL_ROOT / "sentiment"
EMOTION_DIRECTORIES = {"id": MODEL_ROOT / "emotion_id", "en": MODEL_ROOT / "emotion_en"}
# Sentences read by the emotion model: a share of the tone sample, enough for a top-three over a book.
EMOTION_SAMPLE = 40
# A book needs this many emotionally loaded sentences (by the tone model) before its emotions are shown.
EMOTION_MIN_SENTENCES = 5


def _stored_books(path: Path) -> dict[str, dict[str, object]]:
    """Books already in the stored file; another version or a missing file gives an empty dict."""
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    if not isinstance(payload, dict) or payload.get("version") != SENTENCE_TONE_VERSION:
        return {}
    books = payload.get("books")
    return books if isinstance(books, dict) else {}


def _tone_path() -> Path:
    directory = cache_directory().parent / "analysis"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / "sentiment_sentences.json"


def configured() -> bool:
    """Whether the ONNX model files are present (they are baked into the image) and ONNX Runtime can be found."""
    files = [
        SENTIMENT_DIRECTORY / "onnx" / "model_quantized.onnx",
        *(directory / "model_quantized.onnx" for directory in EMOTION_DIRECTORIES.values()),
    ]
    return all(path.is_file() for path in files) and bool(os.environ.get("ORT_DYLIB_PATH"))


def emotion_language(languages: list[str], sentences: list[str]) -> str | None:
    """The emotion model to use: English or Indonesian, from the Calibre tag, else from function words.

    Emotion nets exist for these two languages only; an untagged book is decided on the sentences the tone sample
    already holds (the library is overwhelmingly Indonesian, so the tie goes there).
    """
    if any(code == "eng" for code in languages):
        return "en"
    if any(code in {"ind", "msa"} for code in languages):
        return "id"
    words = language_words()
    text = " ".join(sentences).lower()
    indonesian = sum(text.count(f" {word} ") for word in words["ind"])
    english = sum(text.count(f" {word} ") for word in words["eng"])
    if english > indonesian * 1.5:
        return "en"
    return "id" if indonesian > 0 else None


def affective(probabilities: Sequence[Sequence[float]]) -> list[bool]:
    """Which sentences the tone model calls positive or negative (not neutral).

    The Indonesian emotion model was trained on tweets with no neutral class, so on an informational sentence it still
    names an emotion; measured on 96 real book sentences it called 46 of them "sadness", including a computing manual
    and a Dutch military text. Only sentences the tone model already finds emotionally loaded (24% of that sample)
    may vote.
    """
    return [max(row[0], row[2]) >= row[1] for row in probabilities]


def dominant_emotions(
    sentences: list[str], probabilities: Sequence[Sequence[float]], language: str
) -> list[tuple[str, float]]:
    """A book's top three emotions among its affective sentences, with shares of the labelled affective sentences.

    Needs at least ``EMOTION_MIN_SENTENCES`` affective sentences: a handful of votes is noise, not a tone.
    """
    chosen = [sentence for sentence, loaded in zip(sentences, affective(probabilities), strict=True) if loaded]
    if len(chosen) < EMOTION_MIN_SENTENCES:
        return []
    labels = emotion_labels(chosen[:EMOTION_SAMPLE], language)
    counts = Counter(label for label in labels if label != "neutral")
    total = sum(counts.values())
    if not total:
        return []
    ranked = counts.most_common(3)
    # One label over half the votes is not a profile, it is the model's prior ("sadness" for Indonesian prose); the
    # page says "beragam" instead of pretending the book has one mood. Measured: 70% of the first 224 books topped out
    # at sadness, and 67% of the books with emotions had a top label over 50%.
    if ranked[0][1] / total > 0.5:
        return []
    return [(label, count / total) for label, count in ranked]


def score_books(entries: Iterable[tuple[BookRecord, FormatRecord, str]]) -> int:
    """Score every given book with cached text; returns how many books got a tone. Writes the stored file."""
    from taratsa_text import configure_emotion_models, configure_sentiment_model

    if not configured():
        raise RuntimeError(f"sentiment models not found in {MODEL_ROOT}")
    configure_sentiment_model(str(SENTIMENT_DIRECTORY))
    configure_emotion_models(str(EMOTION_DIRECTORIES["id"]), str(EMOTION_DIRECTORIES["en"]))
    books: dict[int, BookTone] = {}
    batch: list[tuple[int, list[str], str | None]] = []

    written = 0

    def write() -> None:
        """Store what has been scored so far, merged with the file's existing books.

        Merging keeps an on-demand score (the book-page button) from being dropped by the next batch write of the long
        pass, and keeps the pass's work when a single-book run writes in between. A two-day pass must not lose its
        work if it is interrupted.
        """
        nonlocal written
        path = _tone_path()
        merged: dict[str, dict[str, object]] = dict(_stored_books(path))
        merged.update({str(book_id): record(book) for book_id, book in books.items()})
        stored = {
            "version": SENTENCE_TONE_VERSION,
            "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "model": "Horizon-Labs/multilingual-sentiment-small",
            "books": calibrated(merged),
        }
        temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
        temporary.write_text(json.dumps(stored, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        temporary.replace(path)
        written = len(books)

    def flush() -> None:
        texts = [sentence for _, sentences, _ in batch for sentence in sentences]
        if not texts:
            return
        probabilities = sentiment_sentences(texts)
        cursor = 0
        for book_id, sentences, language in batch:
            book_probabilities = probabilities[cursor : cursor + len(sentences)]
            result = sentiment_summary(book_probabilities)
            cursor += len(sentences)
            if result is None:
                continue
            emotions: list[tuple[str, float]] = []
            if language:
                emotions = dominant_emotions(sentences, book_probabilities, language)
            books[book_id] = (result[0], result[1], len(sentences), emotions, language)
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
        language = emotion_language(list(getattr(book, "languages", ())), sentences)
        batch.append((book.id, sentences, language))
        if len(batch) >= BOOK_BATCH:
            flush()
    flush()
    if books and len(books) != written:
        write()
    return len(books)
