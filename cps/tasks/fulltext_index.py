"""Background rebuild of the full-text (Manticore) index from the OCR/EPUB text cache.

Nothing here runs OCR: a PDF without cached text is skipped. Every (book, format) with cached text is indexed, so a
book with both a PDF and an EPUB has both searchable; a book that has left the library is removed from the index.
"""

from __future__ import annotations

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
        for index, (book_id, title, path, book_format, name) in enumerate(rows, start=1):
            if self.stat in (STAT_CANCELLED, STAT_ENDED):
                return
            book_format = str(book_format).upper()
            self.message = N_("Indexing %(format)s: %(name)s", format=book_format, name=str(name))
            book = SimpleNamespace(id=int(book_id), title=str(title), path=str(path))
            data = SimpleNamespace(format=book_format, name=str(name))
            try:
                document = extract_book_ocr(book, data, book_format, allow_extract=False)
                replace_format(book.id, book_format, document.markdown_html)
                self.indexed += 1
            except (OcrNotReadyError, OcrBookNotFoundError, OcrUnavailableError):
                self.skipped += 1
            except FulltextUnavailable:
                raise
            except Exception as exc:
                self.skipped += 1
                log.error("[fulltext] Could not index book %s (%s): %s", book_id, book_format, exc)
            finally:
                self.progress = index / total
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
