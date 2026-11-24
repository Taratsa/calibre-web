"""Background rebuild of the full-text (Manticore) index from the OCR/EPUB text cache.

Nothing here runs OCR: a PDF without cached text is skipped. Every (book, format) with cached text is indexed, so a
book with both a PDF and an EPUB has both searchable; a book that has left the library is removed from the index.
"""

from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from types import SimpleNamespace

from flask_babel import lazy_gettext as N_

from cps import app, calibre_db, db, logger
from cps.fulltext_store import (
    FulltextUnavailable,
    configured,
    delete_book,
    ensure_table,
    indexed_book_ids,
    replace_format,
)
from cps.ocr_service import OcrBookNotFoundError, OcrNotReadyError, OcrUnavailableError, extract_book_ocr
from cps.services.worker import STAT_CANCELLED, STAT_ENDED, CalibreTask

log = logger.create()

# Parallel Manticore writers: measured 2,087 chunks/s with one writer, 3,336 with four and 3,434 with eight (replacing
# existing rows on a populated table), so more than four buys nothing.
WRITERS = 4


class TaskFulltextIndex(CalibreTask):
    def __init__(self, task_message=None):
        super().__init__(task_message or N_("Full-text index"))
        self.indexed = 0
        self.skipped = 0
        self.removed = 0

    @property
    def name(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return str(N_("Full-text index"))

    @property
    def is_cancellable(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return True

    def run(self, worker_thread):
        try:
            if not configured():
                raise FulltextUnavailable("MANTICORE_URL is not set")
            with app.app_context():
                self._index_all()
        except Exception as exc:
            log.error("[fulltext] Full-text index failed: %s", exc)
            self._handleError(str(exc))
        finally:
            try:
                calibre_db.session.close()
            except Exception as exc:
                log.debug("[fulltext] Could not close Calibre session: %s", exc)

    def _index_all(self):
        rows = (
            calibre_db.session.query(db.Books.id, db.Books.title, db.Books.path, db.Data.format, db.Data.name)
            .join(db.Data, db.Data.book == db.Books.id)
            .filter(db.Data.format.in_(["PDF", "EPUB"]))
            .order_by(db.Books.id, db.Data.format)
            .all()
        )
        ensure_table()
        total = len(rows)
        in_library = {int(book_id) for book_id, *_ in rows}
        done = 0
        # Reads stay on this thread (one DB session, one cache reader); the Manticore writes, which dominate, run on
        # a small pool. A bounded set of futures keeps at most WRITERS * 2 documents' text in memory.
        with ThreadPoolExecutor(max_workers=WRITERS, thread_name_prefix="fulltext-writer") as pool:
            pending: set[Future[int]] = set()
            for book_id, title, path, book_format, name in rows:
                if self.stat in (STAT_CANCELLED, STAT_ENDED):
                    break
                book_format = str(book_format).upper()
                self.message = N_("Indexing %(format)s: %(name)s", format=book_format, name=str(name))
                book = SimpleNamespace(id=int(book_id), title=str(title), path=str(path))
                data = SimpleNamespace(format=book_format, name=str(name))
                try:
                    document = extract_book_ocr(book, data, book_format, allow_extract=False)
                except (OcrNotReadyError, OcrBookNotFoundError, OcrUnavailableError):
                    self.skipped += 1
                    done += 1
                    continue
                except Exception as exc:
                    self.skipped += 1
                    done += 1
                    log.error("[fulltext] Could not read book %s (%s): %s", book_id, book_format, exc)
                    continue
                pending.add(pool.submit(replace_format, book.id, book_format, document.markdown_html))
                if len(pending) >= WRITERS * 2:
                    finished, pending = wait(pending, return_when=FIRST_COMPLETED)
                    done += self._collect(finished)
                self.progress = min(done / total, 1.0)
            finished, pending = wait(pending)
            done += self._collect(finished)
        if self.stat in (STAT_CANCELLED, STAT_ENDED):
            return
        self.progress = 1.0
        for stale in sorted(indexed_book_ids() - in_library):
            delete_book(stale)
            self.removed += 1
        self.message = N_(
            "Full-text index complete: %(indexed)d indexed, %(skipped)d without text, %(removed)d removed",
            indexed=self.indexed,
            skipped=self.skipped,
            removed=self.removed,
        )
        self._handleSuccess()

    def _collect(self, finished: set[Future[int]]) -> int:
        """Count finished writes; Manticore being unavailable aborts the task, any other failure skips one book."""
        for future in finished:
            try:
                _ = future.result()
                self.indexed += 1
            except FulltextUnavailable:
                raise
            except Exception as exc:
                self.skipped += 1
                log.error("[fulltext] Could not index a book: %s", exc)
        return len(finished)
