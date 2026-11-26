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
SENTENCE_TONE_VERSION = 1

# Per-book values: (mean polarity, share of decision sentences that are positive, sentences scored).
BookTone = tuple[float, float, int]


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


def profiles(books: dict[int, BookTone]) -> dict[int, dict[str, object]]:
    """Per-book tone records, calibrated across the corpus given all book means at once."""
    shift, scale = calibration([mean for mean, _, _ in books.values()])
    return {
        book_id: {
            "score": round(score(mean, shift, scale), 4),
            "positive_share": round(share, 4) if sentences >= 30 else None,
            "sentences": sentences,
        }
        for book_id, (mean, share, sentences) in books.items()
    }
