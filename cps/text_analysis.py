"""Statistics over the extracted text of many books taken together (the corpus).

Pure functions, no cps imports: the input is the reader HTML produced by ``ocr_service`` and the output is a
JSON-serialisable dict. Bump ``ANALYSIS_VERSION`` whenever a metric or its definition changes so the stored corpus
is rebuilt.
"""

from __future__ import annotations

import heapq
import html
import json
import re
import statistics
from collections import Counter
from dataclasses import dataclass
from functools import cache
from pathlib import Path

ANALYSIS_VERSION = 2

CORPUS_WORDS = 50
CORPUS_NGRAMS = 30
# Words of the stopword-free word cloud, and the shortest word it may show (drops OCR fragments such as "ka", "ri").
CLOUD_WORDS = 100
CLOUD_MIN_LENGTH = 3
# An n-gram seen once says nothing about a text, so it never reaches the ranking.
MIN_NGRAM_COUNT = 2
MTLD_THRESHOLD = 0.72
# MTLD of a very short text is dominated by chance, so the corpus median only uses books above this length.
MTLD_MIN_TOKENS = 1000
MAX_NGRAM_ENTRIES = 1_000_000
# Book-length buckets of the corpus overview, in tokens: [0, 1k), [1k, 5k), ... [100k, inf).
LENGTH_BIN_EDGES = (1_000, 5_000, 20_000, 100_000)

# Letters only, hyphenated compounds ("sosio-ekonomi") stay one token; digits and underscores are not words.
_TOKEN = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")


@cache
def stopwords() -> frozenset[str]:
    """Function words that the word cloud leaves out.

    Indonesian, English and Dutch (the languages of the collection) from stopwords-iso, plus a short list of
    old-spelling and chat fragments. Malay is deliberately not included: it would also remove content words such
    as "orang", "rakyat" or "negara". See ``text_analysis_stopwords.json`` for the source.
    """
    data = json.loads(Path(__file__).with_name("text_analysis_stopwords.json").read_text(encoding="utf-8"))
    return frozenset(word for language in ("id", "en", "nl", "extra") for word in data[language])


_DROP = re.compile(r"<(script|style)\b.*?</\1>", re.IGNORECASE | re.DOTALL)
# Cell boundaries are deliberately absent: a table row stays one block.
_BLOCK_END = re.compile(
    r"</(?:p|h[1-6]|li|tr|blockquote|figcaption|caption|dt|dd|pre)\s*>|<br\s*/?>\s*<br\s*/?>|<hr\s*/?>",
    re.IGNORECASE,
)
_LINE_BREAK = re.compile(r"<br\s*/?>", re.IGNORECASE)
_TAG = re.compile(r"<[^>]+>")
_SPACE = re.compile(r"\s+")
_SENTENCE_END = re.compile(r"[.!?…]+[\"”’')\]]*\s+")
_LAST_WORD = re.compile(r"([^\W\d_]+)\.$")
# Indonesian titles and abbreviations after which a full stop does not end the sentence.
_ABBREVIATIONS = {
    *("dr", "prof", "ir", "drs", "hj", "h", "no", "nr", "hlm", "dll", "dsb", "dst", "yg", "dgn", "tgl"),
    *("jl", "jln", "st", "mr", "mrs", "sdr", "kol", "jend", "mayjen", "letjen", "brigjen", "vs", "cf"),
    *("ed", "vol", "ibid", "op", "cit", "bpk", "ibu", "tn", "ny", "mgr", "kh", "ps", "pdt", "rev", "sen"),
    *("gen", "kapt", "lt", "mm", "cm", "km", "kg", "rp"),
}


def html_to_blocks(markup: str) -> list[str]:
    """Split reader HTML into whitespace-normalised text blocks (paragraphs, headings, list items, rows)."""
    markup = _DROP.sub(" ", markup)
    blocks: list[str] = []
    for piece in _BLOCK_END.split(markup):
        text = html.unescape(_TAG.sub(" ", _LINE_BREAK.sub(" ", piece)))
        text = _SPACE.sub(" ", text).strip()
        if text:
            blocks.append(text)
    return blocks


def split_sentences(block: str) -> list[str]:
    """Heuristic sentence splitter: a terminator followed by a capital, digit or opening quote ends a sentence."""
    sentences: list[str] = []
    start = 0
    for match in _SENTENCE_END.finditer(block):
        following = block[match.end() : match.end() + 1]
        if not following or not (following.isupper() or following.isdigit() or following in "\"“‘'(["):
            continue
        if match.group().startswith("."):
            word = _LAST_WORD.search(block[start : match.start() + 1])
            if word and (len(word.group(1)) == 1 or word.group(1).lower() in _ABBREVIATIONS):
                continue
        sentences.append(block[start : match.end()].strip())
        start = match.end()
    tail = block[start:].strip()
    if tail:
        sentences.append(tail)
    return sentences


def _mtld_pass(tokens: list[str]) -> float:
    factors = 0.0
    types: set[str] = set()
    count = 0
    for token in tokens:
        count += 1
        types.add(token)
        if len(types) / count <= MTLD_THRESHOLD:
            factors += 1
            types = set()
            count = 0
    if count:
        factors += (1 - len(types) / count) / (1 - MTLD_THRESHOLD)
    return len(tokens) / factors if factors else 0.0


def mtld(tokens: list[str]) -> float | None:
    """Measure of Textual Lexical Diversity: mean of the forward and backward pass, None when undefined."""
    forward = _mtld_pass(tokens)
    backward = _mtld_pass(tokens[::-1])
    if not forward or not backward:
        return None
    return (forward + backward) / 2


@dataclass(frozen=True)
class Tokenized:
    """A document split into sentences of lower-cased word tokens, plus the block and character counts."""

    sentences: list[list[str]]
    paragraphs: int
    characters: int

    @property
    def tokens(self) -> list[str]:
        return [token for sentence in self.sentences for token in sentence]


def tokenize(markup: str) -> Tokenized:
    sentences: list[list[str]] = []
    paragraphs = 0
    characters = 0
    for block in html_to_blocks(markup):
        block_has_words = False
        characters += len(block)
        for sentence in split_sentences(block):
            tokens = [token.casefold() for token in _TOKEN.findall(sentence)]
            if tokens:
                sentences.append(tokens)
                block_has_words = True
        paragraphs += block_has_words
    return Tokenized(sentences, paragraphs, characters)


def _ngrams(sentence: list[str], size: int) -> list[str]:
    return [" ".join(gram) for gram in zip(*(sentence[offset:] for offset in range(size)), strict=False)]


class CorpusBuilder:
    """Accumulates statistics over many documents.

    Word counts, document frequency and every total are exact. N-gram tables grow without bound, so once one
    passes ``MAX_NGRAM_ENTRIES`` the entries seen only once are dropped and ``approximate`` is set; a gram that
    occurs once in each of many documents can then be undercounted, while the frequent ones at the top are safe.
    """

    def __init__(self) -> None:
        self.words: Counter[str] = Counter()
        self.document_frequency: Counter[str] = Counter()
        self._ngrams: dict[int, Counter[str]] = {2: Counter(), 3: Counter()}
        self._limits: dict[int, int] = {2: MAX_NGRAM_ENTRIES, 3: MAX_NGRAM_ENTRIES}
        self.approximate = False
        self.lengths: list[int] = []
        self.mtlds: list[float] = []
        self.sentences = 0
        self.paragraphs = 0
        self.characters = 0
        self.by_format: dict[str, list[int]] = {}

    def add(self, markup: str, book_format: str) -> bool:
        """Add one document; False when it holds no words."""
        document = tokenize(markup)
        tokens = document.tokens
        if not tokens:
            return False
        self.words.update(tokens)
        self.document_frequency.update(set(tokens))
        for size, counts in self._ngrams.items():
            for sentence in document.sentences:
                counts.update(_ngrams(sentence, size))
            if len(counts) > self._limits[size]:
                for gram in [gram for gram, count in counts.items() if count == 1]:
                    del counts[gram]
                self._limits[size] = max(MAX_NGRAM_ENTRIES, 2 * len(counts))
                self.approximate = True
        self.lengths.append(len(tokens))
        if len(tokens) >= MTLD_MIN_TOKENS and (value := mtld(tokens)) is not None:
            self.mtlds.append(value)
        self.sentences += len(document.sentences)
        self.paragraphs += document.paragraphs
        self.characters += document.characters
        entry = self.by_format.setdefault(book_format.lower(), [0, 0])
        entry[0] += 1
        entry[1] += len(tokens)
        return True

    def _cloud(self) -> list[list[object]]:
        stop = stopwords()
        words = (
            (count, word) for word, count in self.words.items() if len(word) >= CLOUD_MIN_LENGTH and word not in stop
        )
        return [[word, count, self.document_frequency[word]] for count, word in heapq.nlargest(CLOUD_WORDS, words)]

    def _ranked_ngrams(self, size: int) -> list[list[object]]:
        grams = self._ngrams[size].most_common(CORPUS_NGRAMS * 4)
        ranked = [(gram, count) for gram, count in grams if count >= MIN_NGRAM_COUNT]
        return [[gram, count] for gram, count in ranked[:CORPUS_NGRAMS]]

    def result(self) -> dict[str, object] | None:
        if not self.lengths:
            return None
        total = sum(self.lengths)
        vocabulary = len(self.words)
        hapax = sum(1 for count in self.words.values() if count == 1)
        edges = LENGTH_BIN_EDGES
        bins: list[list[int | None]] = []
        for index, lower in enumerate([0, *edges]):
            upper = edges[index] if index < len(edges) else None
            bins.append([lower, upper, sum(1 for n in self.lengths if n >= lower and (upper is None or n < upper))])
        return {
            "books": len(self.lengths),
            "approximate_ngrams": self.approximate,
            "basic": {
                "tokens": total,
                "unique_tokens": vocabulary,
                "sentences": self.sentences,
                "paragraphs": self.paragraphs,
                "characters": self.characters,
            },
            "by_format": {name: {"books": books, "tokens": tokens} for name, (books, tokens) in self.by_format.items()},
            "lengths": {
                "min": min(self.lengths),
                "median": statistics.median(self.lengths),
                "mean": total / len(self.lengths),
                "max": max(self.lengths),
                "bins": bins,
            },
            "lexical": {
                "hapax": hapax,
                "hapax_ratio": hapax / vocabulary,
                "mtld_median": statistics.median(self.mtlds) if self.mtlds else None,
                "mtld_books": len(self.mtlds),
            },
            "ngrams": {"bigrams": self._ranked_ngrams(2), "trigrams": self._ranked_ngrams(3)},
            "cloud": self._cloud(),
            "frequency": [
                [word, count, count / total, self.document_frequency[word]]
                for word, count in self.words.most_common(CORPUS_WORDS)
            ],
        }
