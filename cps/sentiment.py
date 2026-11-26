"""Sentence-level tone from the transformer classifier, kept beside the lexicon score.

Pure: no I/O, no web or task imports. The model itself runs in the Rust crate (``sentiment_sentences``); this module
decides what a book's number means.

``score`` is the mean polarity (positive probability - negative probability) of a book's sampled sentences, shifted so
the library's median book sits at 0 and scaled so its middle half reaches about -0.25..0.25, then clipped to -1..1.
The median sits well below 0 without the shift (the classifier calls most book sentences neutral, and neutral rows
lean slightly negative on Indonesian non-fiction), so an unshifted score would mark almost every book "negative".
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from statistics import median

# Bump when the calibration, the sample rules or the profile keys change; the seed ignores another version.
SENTENCE_TONE_VERSION = 5

# Per-book values: (mean polarity, share of decision sentences that are positive, sentences scored,
# top emotion labels [(label, share of labelled sentences)], emotion language).
BookTone = tuple[float, float, int, list[tuple[str, float]], str | None]


def percentile(values: Sequence[float], share: float) -> float:
    """Linear-interpolated percentile of a non-empty sequence, 0 <= share <= 1."""
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = share * (len(ordered) - 1)
    low = int(position)
    high = min(low + 1, len(ordered) - 1)
    fraction = position - low
    return ordered[low] + (ordered[high] - ordered[low]) * fraction


def calibration(means: Iterable[float]) -> tuple[float, float]:
    """(shift, scale) that centre the corpus means on 0 and spread the middle half to +-0.25.

    A flat corpus (no spread) falls back to scale 1; the scale is capped at 4 so a handful of uniform books cannot
    turn a 0.01 difference into a full-strength verdict.
    """
    values = list(means)
    if not values:
        return 0.0, 1.0
    shift = -median(values)
    half_spread = max(0.01, (percentile(values, 0.9) - percentile(values, 0.1)) / 2)
    scale = min(4.0, 0.25 / half_spread)
    return shift, scale


def score(mean: float, shift: float, scale: float) -> float:
    """The book's tone in -1..1: calibrated mean polarity."""
    return max(-1.0, min(1.0, (mean + shift) * scale))


def record(book: BookTone) -> dict[str, object]:
    """The stored raw record of one book. ``mean`` stays raw: ``calibrated`` derives every ``score`` from it."""
    mean, share, sentences, emotions, language = book
    return {
        "mean": round(mean, 5),
        "positive_share": round(share, 4) if sentences >= 30 else None,
        "sentences": sentences,
        "emotions": [[label, round(fraction, 4)] for label, fraction in emotions],
        "emotion_language": language,
    }


def calibrated(records: dict[str, dict[str, object]]) -> dict[str, dict[str, object]]:
    """Every record with its ``score``, calibrated across ALL given records.

    Calibration needs the whole library: it centres the median book on 0, so a record scored alone (the book-page
    button) must be calibrated together with the stored ones, never against itself (that would always give 0).
    Records without a raw ``mean`` (an older file layout) are dropped.
    """
    usable = {key: value for key, value in records.items() if isinstance(value.get("mean"), (int, float))}
    shift, scale = calibration([float(value["mean"]) for value in usable.values()])  # pyright: ignore[reportArgumentType]
    return {
        key: {**value, "score": round(score(float(value["mean"]), shift, scale), 4)}  # pyright: ignore[reportArgumentType]
        for key, value in usable.items()
    }
