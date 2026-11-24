"""Manticore writer for the full-text index: create the table, replace or delete one book format, list books.

The index is derived data (``text_chunks`` is rebuilt from the OCR/EPUB cache by the admin button), so nothing here is
a source of truth, and every failure is reported as ``FulltextUnavailable`` rather than breaking an OCR job or a
page. Manticore has no authentication; it is only reachable on the internal ``search_net`` Docker network.
"""

from __future__ import annotations

import json
import os
import threading
from collections.abc import Callable
from typing import cast

import requests

from . import logger
from .fulltext import FORMATS, TABLE, chunk_id, chunk_text, create_table_sql, format_index, id_range

log = logger.create()

MANTICORE_URL = os.environ.get("MANTICORE_URL", "").rstrip("/")
# Flask runs one cooperative gevent worker: a hung socket would stall every request, so nothing waits long.
CONNECT_TIMEOUT = 2
QUERY_TIMEOUT = 8
WRITE_TIMEOUT = 120
BULK_DOCUMENTS = 1000

Row = dict[str, object]
_table_ready = False
# One lock per book: two threads replacing the same book must not interleave their delete and insert, but different
# books may be written in parallel (the full reindex does exactly that).
_book_locks: dict[int, threading.Lock] = {}
_book_locks_guard = threading.Lock()


def _book_lock(book_id: int) -> threading.Lock:
    with _book_locks_guard:
        lock = _book_locks.get(book_id)
        if lock is None:
            lock = _book_locks[book_id] = threading.Lock()
        return lock


class FulltextUnavailable(Exception):
    """Manticore is not configured, not reachable, or answered with an error."""


def configured() -> bool:
    return bool(MANTICORE_URL)


def _sql(query: str, timeout: float = QUERY_TIMEOUT) -> tuple[list[Row], int]:
    """Run one SQL statement; returns its rows and its ``total``."""
    global _table_ready
    if not MANTICORE_URL:
        raise FulltextUnavailable("MANTICORE_URL is not set")
    try:
        response = requests.post(
            f"{MANTICORE_URL}/sql?mode=raw", data={"query": query}, timeout=(CONNECT_TIMEOUT, timeout)
        )
        payload = cast("object", response.json())
    except (requests.RequestException, ValueError) as exc:
        _table_ready = False
        raise FulltextUnavailable(str(exc)) from exc
    if isinstance(payload, list):
        answers = cast("list[object]", payload)
        payload = answers[0] if answers else None
    if not isinstance(payload, dict):
        raise FulltextUnavailable(f"unexpected answer: {str(payload)[:200]}")
    result = cast("Row", payload)
    if result.get("error"):
        _table_ready = False
        raise FulltextUnavailable(str(result["error"])[:200])
    data = result.get("data")
    rows = cast("list[Row]", data) if isinstance(data, list) else []
    return rows, int(str(result.get("total") or 0))


def _bulk(lines: list[str]) -> None:
    try:
        response = requests.post(
            f"{MANTICORE_URL}/bulk",
            data=("\n".join(lines) + "\n").encode("utf-8"),
            headers={"Content-Type": "application/x-ndjson"},
            timeout=(CONNECT_TIMEOUT, WRITE_TIMEOUT),
        )
        payload = cast("object", response.json())
    except (requests.RequestException, ValueError) as exc:
        raise FulltextUnavailable(str(exc)) from exc
    if isinstance(payload, dict) and cast("Row", payload).get("errors"):
        raise FulltextUnavailable(json.dumps(payload)[:300])


def ensure_table() -> None:
    global _table_ready
    if not _table_ready:
        _ = _sql(create_table_sql())
        _table_ready = True


def _delete_range(low: int, high: int) -> None:
    ensure_table()
    _ = _sql(f"delete from {TABLE} where id >= {low} and id <= {high}", timeout=WRITE_TIMEOUT)


def delete_book(book_id: int) -> None:
    """Remove every chunk of a book (an id range, so no scan)."""
    with _book_lock(book_id):
        _delete_range(*id_range(book_id))


def delete_format(book_id: int, book_format: str) -> None:
    with _book_lock(book_id):
        _delete_range(*id_range(book_id, book_format))


def replace_format(book_id: int, book_format: str, markup: str) -> int:
    """Replace the chunks of one format of a book; returns the number of chunks written."""
    lines = [
        json.dumps(
            {
                "insert": {
                    "index": TABLE,
                    "id": chunk_id(book_id, book_format, sequence),
                    "doc": {"body": body, "book": book_id, "fmt": format_index(book_format), "seq": sequence},
                }
            },
            ensure_ascii=False,
        )
        for sequence, body in enumerate(chunk_text(markup))
    ]
    # One writer per book at a time (see _book_lock).
    with _book_lock(book_id):
        _delete_range(*id_range(book_id, book_format))
        for start in range(0, len(lines), BULK_DOCUMENTS):
            _bulk(lines[start : start + BULK_DOCUMENTS])
    return len(lines)


def indexed_book_ids() -> set[int]:
    """Every book id that has chunks in the index (empty when the table does not exist yet)."""
    try:
        ensure_table()
        rows, _ = _sql(f"select book from {TABLE} group by book limit 100000 option max_matches=100000")
    except FulltextUnavailable:
        return set()
    return {int(str(row["book"])) for row in rows}


def in_background(action: Callable[[], object], what: str) -> None:
    """Run an index update off the calling thread so a request or an OCR job never waits for Manticore."""
    if not configured():
        return

    def run() -> None:
        try:
            _ = action()
        except FulltextUnavailable as exc:
            log.warning("[fulltext] Could not %s: %s", what, exc)

    threading.Thread(target=run, daemon=True, name="fulltext-index").start()


def replace_format_later(book_id: int, book_format: str, markup: str) -> None:
    in_background(lambda: replace_format(book_id, book_format, markup), f"index book {book_id} ({book_format})")


def delete_book_later(book_id: int) -> None:
    in_background(lambda: delete_book(book_id), f"remove book {book_id} from the index")


def delete_format_later(book_id: int, book_format: str) -> None:
    in_background(lambda: delete_format(book_id, book_format), f"remove book {book_id} ({book_format}) from the index")


__all__ = [
    "FORMATS",
    "FulltextUnavailable",
    "configured",
    "delete_book",
    "delete_book_later",
    "delete_format",
    "delete_format_later",
    "ensure_table",
    "indexed_book_ids",
    "replace_format",
    "replace_format_later",
]
