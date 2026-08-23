"""Background OCR scan for PDF and EPUB formats."""

from __future__ import annotations

from flask_babel import lazy_gettext as N_

from cps import app, calibre_db, db, logger
from cps.ocr_service import OcrBookNotFoundError, OcrUnavailableError, scan_book_ocr
from cps.services.worker import STAT_CANCELLED, STAT_ENDED, CalibreTask

log = logger.create()


class TaskOcrScan(CalibreTask):
    def __init__(self, book_ids: list[int] | None = None, task_message=None, trigger_type: str = "manual"):
        super().__init__(task_message or N_("OCR scan"))
        self.book_ids: list[int] = []
        for book_id in book_ids or []:
            try:
                parsed_book_id = int(book_id)
            except (TypeError, ValueError):
                continue
            if parsed_book_id > 0 and parsed_book_id not in self.book_ids:
                self.book_ids.append(parsed_book_id)
        self.book_ids.sort()
        self.trigger_type = trigger_type
        self.ready_count = 0
        self.scanned_count = 0
        self.skipped_count = 0
        self.failed_count = 0

    @property
    def name(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return str(N_("OCR scan"))

    @property
    def is_cancellable(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return True

    def run(self, worker_thread):
        try:
            with app.app_context():
                self._run_in_context()
        except Exception as exc:
            log.error("[ocr] OCR scan failed: %s", exc)
            self._handleError(str(exc))
        finally:
            try:
                calibre_db.session.close()
            except Exception as exc:
                log.debug("[ocr] Could not close Calibre session: %s", exc)

    def _run_in_context(self):
        book_formats = self._get_book_formats()
        total = len(book_formats)
        if not total:
            self.message = N_("No PDF or EPUB files require OCR")
            self._handleSuccess()
            return

        for index, (book_id, book_format, name, title, path) in enumerate(book_formats, start=1):
            if self.stat in (STAT_CANCELLED, STAT_ENDED):
                return
            self.message = N_("Scanning %(format)s: %(name)s", format=book_format, name=name)
            book = SimpleNamespace(id=book_id, title=title, path=path)
            data = SimpleNamespace(format=book_format, name=name)
            try:
                result = scan_book_ocr(book, data, book_format)
                if result == "scanned":
                    self.scanned_count += 1
                else:
                    self.ready_count += 1
            except (OcrBookNotFoundError, OcrUnavailableError) as exc:
                self.skipped_count += 1
                log.warning("[ocr] Skipped book %s format %s: %s", book_id, book_format, exc)
            except Exception as exc:
                self.failed_count += 1
                log.error("[ocr] Failed book %s format %s: %s", book_id, book_format, exc)
            finally:
                self.progress = index / total

        self.message = N_(
            "OCR scan complete: %(ready)d ready, %(scanned)d scanned, %(skipped)d skipped, %(failed)d failed",
            ready=self.ready_count,
            scanned=self.scanned_count,
            skipped=self.skipped_count,
            failed=self.failed_count,
        )
        self._handleSuccess()

    def _get_book_formats(self):
        query = calibre_db.session.query(
            db.Books.id,
            db.Books.title,
            db.Books.path,
            db.Data.format,
            db.Data.name,
        ).join(db.Data, db.Data.book == db.Books.id)
        query = query.filter(db.Data.format.in_(["PDF", "EPUB"]))
        if self.book_ids:
            query = query.filter(db.Books.id.in_(self.book_ids))
        return [
            (int(book_id), str(book_format).upper(), str(name), str(title), str(path))
            for book_id, title, path, book_format, name in query.order_by(db.Books.id, db.Data.format).all()
        ]
