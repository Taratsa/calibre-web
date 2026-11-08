"""Background rebuild of the corpus statistics from every book whose text is already in the OCR/EPUB cache."""

from __future__ import annotations

from types import SimpleNamespace

from flask_babel import lazy_gettext as N_

from cps import app, calibre_db, db, logger
from cps.services.worker import CalibreTask
from cps.text_analysis_store import build_corpus

log = logger.create()


def rebuild_corpus() -> int:
    """Rebuild the corpus statistics from every book with cached text; returns the number of books used.

    Needs an app context. One document per book goes in, so a book with both formats counts once (as its EPUB: the
    rows sort EPUB before PDF).
    """
    rows = (
        calibre_db.session.query(db.Books.id, db.Books.title, db.Books.path, db.Data.format, db.Data.name)
        .join(db.Data, db.Data.book == db.Books.id)
        .filter(db.Data.format.in_(["PDF", "EPUB"]))
        .order_by(db.Books.id, db.Data.format)
        .all()
    )
    entries: dict[int, tuple[SimpleNamespace, SimpleNamespace, str]] = {}
    for book_id, title, path, book_format, name in rows:
        book_format = str(book_format).upper()
        book = SimpleNamespace(id=int(book_id), title=str(title), path=str(path))
        entries.setdefault(book.id, (book, SimpleNamespace(format=book_format, name=str(name)), book_format))
    return build_corpus(entries.values())


class TaskTextAnalysis(CalibreTask):
    def __init__(self, task_message=None):
        super().__init__(task_message or N_("Text analysis"))

    @property
    def name(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return str(N_("Text analysis"))

    @property
    def is_cancellable(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return False

    def run(self, worker_thread):
        try:
            with app.app_context():
                self.message = N_("Building corpus statistics")
                documents = rebuild_corpus()
                self.progress = 1.0
                self.message = N_("Text analysis complete: corpus of %(documents)d books", documents=documents)
                self._handleSuccess()
        except Exception as exc:
            log.error("[analysis] Text analysis failed: %s", exc)
            self._handleError(str(exc))
        finally:
            try:
                calibre_db.session.close()
            except Exception as exc:
                log.debug("[analysis] Could not close Calibre session: %s", exc)
