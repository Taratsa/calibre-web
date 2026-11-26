"""Background scoring of sentence-level tone with the transformer classifier (see ``cps/sentiment_store.py``).

Runs in the worker: about two hours for the library on 8 cores, so it is never queued from a request handler. The
lexicon tone ("Sentimen kata") stays as it is; this fills the separate "Tone" line, which covers English and
old-spelling books too.
"""

from __future__ import annotations

from types import SimpleNamespace

from flask_babel import lazy_gettext as N_

from cps import app, calibre_db, db, logger
from cps.services.worker import CalibreTask
from cps.sentiment_store import score_books

log = logger.create()


def score_library(book_ids: list[int] | None = None) -> int:
    """Score every book with cached text, or only ``book_ids``; returns how many got a tone. Needs an app context."""
    query = (
        calibre_db.session.query(db.Books.id, db.Books.title, db.Books.path, db.Data.format, db.Data.name)
        .join(db.Data, db.Data.book == db.Books.id)
        .filter(db.Data.format.in_(["PDF", "EPUB"]))
    )
    if book_ids:
        query = query.filter(db.Books.id.in_(book_ids))
    rows = query.order_by(db.Books.id, db.Data.format).all()
    languages: dict[int, list[str]] = {}
    for book_id, code in calibre_db.session.query(
        db.books_languages_link.c.book, db.Languages.lang_code
    ).join(db.Languages, db.Languages.id == db.books_languages_link.c.lang_code):
        languages.setdefault(int(book_id), []).append(str(code))
    entries: dict[int, tuple[SimpleNamespace, SimpleNamespace, str]] = {}
    for book_id, title, path, book_format, name in rows:
        book_format = str(book_format).upper()
        book = SimpleNamespace(
            id=int(book_id), title=str(title), path=str(path), languages=languages.get(int(book_id), [])
        )
        entries.setdefault(book.id, (book, SimpleNamespace(format=book_format, name=str(name)), book_format))
    return score_books(entries.values())


class TaskSentenceTone(CalibreTask):
    def __init__(self, task_message=None, book_ids: list[int] | None = None):
        super().__init__(task_message or N_("Sentence tone"))
        self.book_ids = book_ids

    @property
    def name(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return str(N_("Sentence tone"))

    @property
    def is_cancellable(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return False

    def run(self, worker_thread):
        try:
            with app.app_context():
                self.message = N_("Scoring sentence tone")
                books = score_library(self.book_ids)
                self.progress = 1.0
                self.message = N_("Sentence tone complete: %(books)d books", books=books)
                self._handleSuccess()
        except Exception as exc:
            log.error("[sentiment] Sentence tone failed: %s", exc)
            self._handleError(str(exc))
        finally:
            try:
                calibre_db.session.close()
            except Exception as exc:
                log.debug("[sentiment] Could not close Calibre session: %s", exc)
