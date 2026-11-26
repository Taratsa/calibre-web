"""Statistics over the extracted text of many books taken together (the corpus).

The computation lives in the compiled ``taratsa_text`` extension (``rust/taratsa_text``). This module is the
Python-facing seam: it owns the stopword file, re-exports the tuning constants from the crate (so the two sides
cannot drift), and hands the builder its stopwords. Nothing here touches the web layer.

Bump ``ANALYSIS_VERSION`` whenever a metric or its definition changes so the stored corpus is rebuilt.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from functools import cache
from pathlib import Path

from taratsa_text import CorpusBuilder as _RustCorpusBuilder
from taratsa_text import html_to_blocks as _html_to_blocks
from taratsa_text import settings as _settings

ANALYSIS_VERSION = 12

_SETTINGS = _settings()

CORPUS_WORDS = _SETTINGS["CORPUS_WORDS"]
CORPUS_NGRAMS = _SETTINGS["CORPUS_NGRAMS"]
# Words of the stopword-free word cloud, and the shortest word it (and the edges of an n-gram) may show: drops OCR
# fragments such as "ka", "ri".
CLOUD_WORDS = _SETTINGS["CLOUD_WORDS"]
CLOUD_MIN_LENGTH = _SETTINGS["CLOUD_MIN_LENGTH"]
# Per-book text profile (book pages): the BOOK_WORDS most frequent and the BOOK_WORDS most distinctive non-stopwords
# (count x log(documents / document frequency), so words every book uses rank low) plus up to BOOK_PHRASES key
# phrases. A word seen once or twice in a book is OCR noise or chance. Only the top BOOK_CANDIDATES words of a book are
# scored: 150 already reproduce the full ranking in 99.8% of 900 sampled books, 200 leaves margin. A list shorter than
# its MIN_SHOWN (a leaflet, a scan with little text) is left empty.
BOOK_WORDS = _SETTINGS["BOOK_WORDS"]
BOOK_WORD_MIN_COUNT = _SETTINGS["BOOK_WORD_MIN_COUNT"]
BOOK_WORDS_MIN_SHOWN = _SETTINGS["BOOK_WORDS_MIN_SHOWN"]
BOOK_CANDIDATES = _SETTINGS["BOOK_CANDIDATES"]
BOOK_PHRASES = _SETTINGS["BOOK_PHRASES"]
BOOK_PHRASE_MIN_COUNT = _SETTINGS["BOOK_PHRASE_MIN_COUNT"]
BOOK_PHRASES_MIN_SHOWN = _SETTINGS["BOOK_PHRASES_MIN_SHOWN"]
# Author pages: a cloud of the words that are frequent across the author's books and rare elsewhere (summed count x
# log(documents / document frequency)). Only authors with AUTHOR_MIN_BOOKS books that have text get one (a single
# book would repeat its own page), a word must occur in at least AUTHOR_WORD_MIN_BOOKS books and in at least
# AUTHOR_WORD_MIN_SHARE of the author's books (so it is the author's vocabulary, not one book's subject or the OCR
# debris of a few scans: "ber", "meng", "ter" alone topped Pramoedya's 80 books), the author's own name is left out,
# and fewer than AUTHOR_WORDS_MIN_SHOWN surviving words means no cloud.
AUTHOR_WORDS = _SETTINGS["AUTHOR_WORDS"]
AUTHOR_MIN_BOOKS = _SETTINGS["AUTHOR_MIN_BOOKS"]
AUTHOR_WORD_MIN_BOOKS = _SETTINGS["AUTHOR_WORD_MIN_BOOKS"]
AUTHOR_WORD_MIN_SHARE = _SETTINGS["AUTHOR_WORD_MIN_SHARE"]
AUTHOR_WORDS_MIN_SHOWN = _SETTINGS["AUTHOR_WORDS_MIN_SHOWN"]
# Catalog placeholders in the author field: a "cloud" over unrelated books of "Tidak diketahui" says nothing.
AUTHOR_PLACEHOLDERS = frozenset(_SETTINGS["AUTHOR_PLACEHOLDERS"])
# Similar books: cosine similarity of tf-idf vectors over the candidate words. Measured on 400 sampled books (8,061
# in the library): a neighbour at >= 0.10 shares a Kategori with the book 37% of the time (a random pair: 3.7%), and 54-66%
# above 0.30. 25% of books have a near-copy at >= 0.85 (another edition or scan), which is not a "similar book".
SIMILAR_BOOKS = _SETTINGS["SIMILAR_BOOKS"]
SIMILAR_BOOKS_MIN_SHOWN = _SETTINGS["SIMILAR_BOOKS_MIN_SHOWN"]
SIMILAR_MIN_SCORE = _SETTINGS["SIMILAR_MIN_SCORE"]
SIMILAR_MAX_SCORE = _SETTINGS["SIMILAR_MAX_SCORE"]
SIMILAR_MAX_DOCUMENT_SHARE = _SETTINGS["SIMILAR_MAX_DOCUMENT_SHARE"]
# An n-gram seen once says nothing about a text, so it never reaches the ranking.
MIN_NGRAM_COUNT = _SETTINGS["MIN_NGRAM_COUNT"]
MTLD_THRESHOLD = _SETTINGS["MTLD_THRESHOLD"]
# MTLD of a very short text is dominated by chance, so the corpus median only uses books above this length.
MTLD_MIN_TOKENS = _SETTINGS["MTLD_MIN_TOKENS"]
MAX_NGRAM_ENTRIES = _SETTINGS["MAX_NGRAM_ENTRIES"]
# Book-length buckets of the corpus overview, in tokens: [0, 1k), [1k, 5k), ... [100k, inf).
LENGTH_BIN_EDGES = tuple(_SETTINGS["LENGTH_BIN_EDGES"])
# A tone score needs this many polarity hits; below it the ratio is chance, not tone (see the crate's sentiment.rs).
SENTIMENT_MIN_HITS = _SETTINGS["SENTIMENT_MIN_HITS"]
# Emotion labels need this many emotion hits before the top three are shown.
SENTIMENT_EMOTION_MIN_HITS = _SETTINGS["SENTIMENT_EMOTION_MIN_HITS"]
SENTIMENT_SAMPLE = _SETTINGS["SENTIMENT_SAMPLE"]
SENTIMENT_SAMPLE_MIN = _SETTINGS["SENTIMENT_SAMPLE_MIN"]


@cache
def stopwords() -> frozenset[str]:
    """Function words that the word cloud and the n-gram tables leave out.

    Indonesian, English and Dutch (the languages of the collection) from stopwords-iso, plus a short list of
    old-spelling and chat fragments. Malay is deliberately not included: it would also remove content words such
    as "orang", "rakyat" or "negara". See ``text_analysis_stopwords.json`` for the source.
    """
    data = json.loads(Path(__file__).with_name("text_analysis_stopwords.json").read_text(encoding="utf-8"))
    return frozenset(word for language in ("id", "en", "nl", "extra") for word in data[language])


@cache
def language_words() -> dict[str, list[str]]:
    """Indonesian and English function words, used to decide the language of a book Calibre left untagged."""
    data = json.loads(Path(__file__).with_name("text_analysis_stopwords.json").read_text(encoding="utf-8"))
    return {"ind": data["id"], "eng": data["en"]}


@cache
def sentiment_lexicon() -> dict[str, list[str]]:
    """Polarity words and the rule lists (negators, boosters, contrasts) for the per-book tone line.

    Hand-curated Indonesian list under this repository's licence; English books are not scored, because the Indonesian
    vocabulary does not describe them. The crate applies VADER's rule design (negation scope, boosters, contrastive
    conjunctions) to these words; see ``rust/taratsa_text/src/sentiment.rs``.
    """
    return json.loads(Path(__file__).with_name("sentiment_lexicon.json").read_text(encoding="utf-8"))


def html_to_blocks(markup: str) -> list[str]:
    """Split reader HTML into whitespace-normalised text blocks (paragraphs, headings, list items, rows)."""
    return _html_to_blocks(markup)


class CorpusBuilder:
    """Accumulates statistics over many documents.

    Word counts, document frequency and every total are exact. N-gram tables only hold grams that begin and end with
    a content word and still grow without bound, so once one passes ``MAX_NGRAM_ENTRIES`` the entries seen only once
    are dropped and ``approximate_ngrams`` is set; a gram that occurs once in each of many documents can then be
    undercounted, while the frequent ones at the top are safe.
    """

    def __init__(self) -> None:
        self._builder = _RustCorpusBuilder(
            stopwords=stopwords(), sentiment=sentiment_lexicon(), language=language_words()
        )

    def add(
        self,
        markup: str,
        book_format: str,
        book_id: int | None = None,
        authors: Iterable[tuple[int, str]] = (),
        languages: Iterable[str] = (),
    ) -> bool:
        """Add one document; False when it holds no words.

        With ``book_id`` its profile goes to ``book_text()``; its ``authors`` ((id, name) pairs) feed ``author_text()``.
        ``languages`` are Calibre's ISO 639-2 codes: the tone score is only computed for Indonesian or Malay books (an
        untagged book is scored, since the library is overwhelmingly Indonesian).
        """
        return self._builder.add(markup, book_format, book_id, list(authors), list(languages))

    def add_many(
        self, documents: Iterable[tuple[str, str, int | None, Iterable[tuple[int, str]], Iterable[str]]]
    ) -> int:
        """Add a batch of ``(markup, book_format, book_id, authors, languages)``; returns how many held words.

        Tokenizing runs on several threads, counting stays serial and in input order, so the stored statistics are
        identical to calling ``add`` for each document in turn. Keep batches small: every markup string is held in
        memory until the batch is counted.
        """
        batch = [
            (markup, fmt, book_id, list(authors), list(languages))
            for markup, fmt, book_id, authors, languages in documents
        ]
        return sum(self._builder.add_many(batch))

    def result(self) -> dict[str, object] | None:
        """The corpus overview (totals, distributions, n-gram and word rankings); None before the first document."""
        return self._builder.result()

    def documents(self) -> int:
        """Books that were added (have cached text and at least one word)."""
        return self._builder.documents()

    def book_text(self) -> dict[int, dict[str, object]]:
        """Per-book profile: length, most frequent and distinctive words, key phrases and similar books.

        Needs the final document frequencies, so call it after the last ``add``. ``longer_than`` is the share of
        the corpus's books (in percent) that have fewer words.
        """
        return self._builder.book_text()

    def author_text(self) -> dict[int, dict[str, object]]:
        """Per-author word cloud over the authors' books: ``{"books": n, "cloud": [[word, count, books_using]]}``.

        Needs the final document frequencies, so call it after the last ``add``. Counts are summed over the books'
        candidate words, so they cover the frequent words of each book (see ``BOOK_CANDIDATES``), which is what a cloud
        shows anyway.
        """
        return self._builder.author_text()
