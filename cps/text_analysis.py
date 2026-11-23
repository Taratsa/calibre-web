"""Statistics over the extracted text of many books taken together (the corpus).

Pure functions, no cps imports: the input is the reader HTML produced by ``ocr_service`` and the output is a
JSON-serialisable dict. Bump ``ANALYSIS_VERSION`` whenever a metric or its definition changes so the stored corpus
is rebuilt.
"""

from __future__ import annotations

import bisect
import heapq
import html
import json
import math
import re
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass
from functools import cache
from pathlib import Path

ANALYSIS_VERSION = 5

CORPUS_WORDS = 50
CORPUS_NGRAMS = 30
# Words of the stopword-free word cloud, and the shortest word it (and the edges of an n-gram) may show: drops OCR
# fragments such as "ka", "ri".
CLOUD_WORDS = 100
CLOUD_MIN_LENGTH = 3
# Per-book text profile (book pages): the BOOK_WORDS most frequent and the BOOK_WORDS most distinctive non-stopwords
# (count x log(documents / document frequency), so words every book uses rank low) plus up to BOOK_PHRASES key
# phrases. A word seen once or twice in a book is OCR noise or chance. Only the top BOOK_CANDIDATES words of a book are
# scored: 150 already reproduce the full ranking in 99.8% of 900 sampled books, 200 leaves margin. A list shorter than
# its MIN_SHOWN (a leaflet, a scan with little text) is left empty.
BOOK_WORDS = 12
BOOK_WORD_MIN_COUNT = 3
BOOK_WORDS_MIN_SHOWN = 8
BOOK_CANDIDATES = 200
BOOK_PHRASES = 8
BOOK_PHRASE_MIN_COUNT = 3
BOOK_PHRASES_MIN_SHOWN = 3
# Similar books: cosine similarity of tf-idf vectors over the candidate words. Measured on 400 sampled books (8,061
# in the library): a neighbour at >= 0.10 shares a Kategori with the book 37% of the time (a random pair: 3.7%), and 54-66%
# above 0.30. 25% of books have a near-copy at >= 0.85 (another edition or scan), which is not a "similar book".
SIMILAR_BOOKS = 6
SIMILAR_BOOKS_MIN_SHOWN = 3
SIMILAR_MIN_SCORE = 0.10
SIMILAR_MAX_SCORE = 0.85
SIMILAR_MAX_DOCUMENT_SHARE = 0.10
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
    """Function words that the word cloud and the n-gram tables leave out.

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


def _ngrams(sentence: list[str], size: int, stop: frozenset[str]) -> list[str]:
    """The n-grams of a sentence whose first and last word are content words (not a stopword, not a fragment).

    Stopwords may sit inside a gram ("hak asasi manusia", "sumber daya alam"), but a gram that starts or ends with one
    ("di dalam", "yang tidak", "of the") is a function phrase and is not counted.
    """
    return [
        " ".join(gram)
        for gram in zip(*(sentence[offset:] for offset in range(size)), strict=False)
        if gram[0] not in stop
        and gram[-1] not in stop
        and len(gram[0]) >= CLOUD_MIN_LENGTH
        and len(gram[-1]) >= CLOUD_MIN_LENGTH
    ]


@dataclass(frozen=True)
class _BookCounts:
    """What the corpus keeps of one book until every document is in and the document frequencies are final."""

    words: int
    candidates: list[tuple[str, int]]
    phrases: list[list[object]]


class CorpusBuilder:
    """Accumulates statistics over many documents.

    Word counts, document frequency and every total are exact. N-gram tables only hold grams that begin and end with
    a content word (see ``_ngrams``) and still grow without bound, so once one passes ``MAX_NGRAM_ENTRIES`` the
    entries seen only once are dropped and ``approximate`` is set; a gram that occurs once in each of many documents
    can then be undercounted, while the frequent ones at the top are safe.
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
        self._books: dict[int, _BookCounts] = {}

    def add(self, markup: str, book_format: str, book_id: int | None = None) -> bool:
        """Add one document; False when it holds no words. With ``book_id`` its profile goes to ``book_text()``."""
        document = tokenize(markup)
        tokens = document.tokens
        if not tokens:
            return False
        counts = Counter(tokens)
        self.words.update(counts)
        self.document_frequency.update(counts.keys())
        stop = stopwords()
        grams = {
            size: Counter(gram for sentence in document.sentences for gram in _ngrams(sentence, size, stop))
            for size in self._ngrams
        }
        for size, table in self._ngrams.items():
            table.update(grams[size])
            if len(table) > self._limits[size]:
                for gram in [gram for gram, count in table.items() if count == 1]:
                    del table[gram]
                self._limits[size] = max(MAX_NGRAM_ENTRIES, 2 * len(table))
                self.approximate = True
        if book_id is not None:
            candidates = sorted(
                (
                    (word, count)
                    for word, count in counts.items()
                    if count >= BOOK_WORD_MIN_COUNT and len(word) >= CLOUD_MIN_LENGTH and word not in stop
                ),
                key=lambda item: (-item[1], item[0]),
            )[:BOOK_CANDIDATES]
            # Longer phrases first: a trigram counts 1.5 times a bigram of the same frequency, and a phrase that
            # contains (or is contained in) a better one is skipped, so "hak asasi manusia" does not also list "hak asasi".
            ranked = sorted(
                (count * (1 + 0.5 * (size - 2)), gram, count)
                for size, table in grams.items()
                for gram, count in table.items()
                if count >= BOOK_PHRASE_MIN_COUNT
            )[::-1]
            phrases: list[list[object]] = []
            for _, gram, count in ranked:
                if len(phrases) == BOOK_PHRASES:
                    break
                if not any(f" {gram} " in f" {kept} " or f" {kept} " in f" {gram} " for kept, _ in phrases):
                    phrases.append([gram, count])
            self._books[book_id] = _BookCounts(
                len(tokens), candidates, phrases if len(phrases) >= BOOK_PHRASES_MIN_SHOWN else []
            )
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

    def _similar_books(self) -> dict[int, list[list[object]]]:
        """The most similar books of every book: cosine similarity of tf-idf vectors over each book's candidate words.

        A word used by more than ``SIMILAR_MAX_DOCUMENT_SHARE`` of the books (among their candidate words) says nothing
        about topic and is left out. Matches at or above ``SIMILAR_MAX_SCORE`` are other copies or editions of the same
        text, not similar books, so they are skipped.
        """
        documents = len(self._books)
        frequency = Counter(word for book in self._books.values() for word, _ in book.candidates)
        ceiling = documents * SIMILAR_MAX_DOCUMENT_SHARE
        vectors: dict[int, dict[str, float]] = {}
        postings: dict[str, list[tuple[int, float]]] = {}
        for book_id, book in self._books.items():
            weights = {
                word: (1 + math.log(count)) * math.log(documents / frequency[word])
                for word, count in book.candidates
                if 2 <= frequency[word] <= ceiling
            }
            norm = math.sqrt(sum(weight * weight for weight in weights.values()))
            if not norm:
                continue
            vectors[book_id] = {word: weight / norm for word, weight in weights.items()}
            for word, weight in vectors[book_id].items():
                postings.setdefault(word, []).append((book_id, weight))
        similar: dict[int, list[list[object]]] = {}
        for book_id, vector in vectors.items():
            scores: defaultdict[int, float] = defaultdict(float)
            for word, weight in vector.items():
                for other, other_weight in postings[word]:
                    scores[other] += weight * other_weight
            ranked = sorted(
                (
                    (score, other)
                    for other, score in scores.items()
                    if other != book_id and SIMILAR_MIN_SCORE <= score < SIMILAR_MAX_SCORE
                ),
                reverse=True,
            )[:SIMILAR_BOOKS]
            if len(ranked) >= SIMILAR_BOOKS_MIN_SHOWN:
                similar[book_id] = [[other, round(score, 2)] for score, other in ranked]
        return similar

    def book_text(self) -> dict[int, dict[str, object]]:
        """Per-book profile: length, most frequent and distinctive words, key phrases and similar books.

        Needs the final document frequencies, so call it after the last ``add``. ``longer_than`` is the share of
        the corpus's books (in percent) that have fewer words.
        """
        documents = len(self.lengths)
        lengths = sorted(self.lengths)
        similar = self._similar_books()
        profiles: dict[int, dict[str, object]] = {}
        for book_id, book in self._books.items():
            enough = len(book.candidates) >= BOOK_WORDS_MIN_SHOWN
            distinct = sorted(
                (count * math.log(documents / self.document_frequency[word]), word, count)
                for word, count in book.candidates
                if self.document_frequency[word] >= 2
            )[::-1][:BOOK_WORDS]
            profiles[book_id] = {
                "words": book.words,
                "longer_than": 100 * bisect.bisect_left(lengths, book.words) // documents,
                "top": [[word, count] for word, count in book.candidates[:BOOK_WORDS]] if enough else [],
                "distinct": [[word, count] for _, word, count in distinct]
                if len(distinct) >= BOOK_WORDS_MIN_SHOWN
                else [],
                "phrases": book.phrases,
                "similar": similar.get(book_id, []),
            }
        return profiles

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
