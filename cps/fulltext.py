"""Full-text search over the extracted book text: chunking and index layout, no I/O.

Pure functions, no cps imports besides ``text_analysis`` (the block splitter). ``fulltext_store`` talks to Manticore.
Searching is done by the Astro frontend (``frontend/src/utils/fulltext.ts``); this side only writes the index.

Each (book, format) is cut into chunks of about ``CHUNK_CHARS`` characters on paragraph boundaries and every chunk is
one Manticore document, so a hit points to a passage and a snippet can be shown. Measured on the real corpus
(745,872 chunks of 8,371 books): about 1.0 GB of index, replacing one book in about 80 ms.
"""

from __future__ import annotations

from collections.abc import Iterator

from .text_analysis import html_to_blocks

TABLE = "text_chunks"
CHUNK_CHARS = 900
# The `fmt` attribute: which reader page a chunk belongs to (/read/<id>/ocr/<format>/).
FORMATS = ("EPUB", "PDF")
# A chunk id is book_id * BOOK_STRIDE + format_index * FORMAT_STRIDE + sequence number, so the chunks of one format
# of a book (or of the whole book) are a contiguous id range that can be deleted without a scan, and no id collides
# with another book's. 500,000 chunks is ~450 MB of text in one file, far beyond any book here.
BOOK_STRIDE = 1_000_000
FORMAT_STRIDE = 500_000


def format_index(book_format: str) -> int:
    return FORMATS.index(book_format.upper())


def chunk_id(book_id: int, book_format: str, sequence: int) -> int:
    return book_id * BOOK_STRIDE + format_index(book_format) * FORMAT_STRIDE + sequence


def id_range(book_id: int, book_format: str | None = None) -> tuple[int, int]:
    """Inclusive id range of one format of a book, or of the whole book when ``book_format`` is None."""
    if book_format is None:
        return book_id * BOOK_STRIDE, (book_id + 1) * BOOK_STRIDE - 1
    low = chunk_id(book_id, book_format, 0)
    return low, low + FORMAT_STRIDE - 1


def chunk_text(markup: str, size: int = CHUNK_CHARS) -> Iterator[str]:
    """Yield chunks of at least ``size`` characters (the last may be shorter), cut between reader blocks."""
    buffer: list[str] = []
    length = 0
    for block in html_to_blocks(markup):
        buffer.append(block)
        length += len(block)
        if length >= size:
            yield " ".join(buffer)
            buffer, length = [], 0
    if buffer:
        yield " ".join(buffer)


def create_table_sql() -> str:
    """The chunk table. ``book``, ``fmt`` and ``seq`` are attributes (group and filter without touching the text).

    ``min_infix_len=2`` lets ``option fuzzy=1`` tolerate typos; it measured 1.12 GB against 1.0 GB without.
    ``index_exact_words=1`` keeps exact-form matching next to the morphology-free default.
    """
    return (
        f"create table if not exists {TABLE}(body text, book integer, fmt integer, seq integer) "
        "min_infix_len='2' index_exact_words='1'"
    )
