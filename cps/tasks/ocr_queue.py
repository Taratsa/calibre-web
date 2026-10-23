"""Reader-triggered OCR jobs.

Runs on its own single worker thread, not on the shared ``WorkerThread``: one OCR job takes minutes and would
otherwise delay every mail, conversion and upload task queued behind it.
"""

from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from cps import app, logger
from cps.ocr_service import scan_book_ocr

log = logger.create()

# A crawler or a stampede must not be able to queue GPU work for the whole catalog.
MAX_PENDING_JOBS = 5
# How long a failed job stays visible to the reader page before it is forgotten.
FAILED_VISIBLE_SECONDS = 600


class OcrQueueFullError(RuntimeError):
    """Raised when too many OCR jobs are already pending."""


@dataclass(frozen=True)
class _Book:
    id: int
    path: str
    title: str


@dataclass(frozen=True)
class _Format:
    name: str
    format: str


@dataclass
class _Job:
    status: str = "queued"  # queued | processing | failed | done
    pages_done: int = 0
    pages_total: int = 0
    finished_at: float = 0.0


_lock = threading.Lock()
_jobs: dict[tuple[int, str], _Job] = {}
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ocr-queue")


def _visible(job: _Job) -> bool:
    if job.status in ("queued", "processing"):
        return True
    return job.status == "failed" and time.monotonic() - job.finished_at < FAILED_VISIBLE_SECONDS


def _snapshot(job: _Job) -> dict[str, object]:
    return {"status": job.status, "pages_done": job.pages_done, "pages_total": job.pages_total}


def _prune() -> None:
    for key in [key for key, job in _jobs.items() if not _visible(job)]:
        del _jobs[key]


def ocr_job_state(book_id: int, book_format: str) -> dict[str, object] | None:
    """State of the queued, running or recently failed job for a book format; never queues anything."""
    with _lock:
        _prune()
        job = _jobs.get((book_id, book_format.upper()))
        return _snapshot(job) if job else None


def _run(key: tuple[int, str], job: _Job, book: _Book, data: _Format) -> None:
    job.status = "processing"

    def on_progress(done: int, total: int) -> None:
        job.pages_done, job.pages_total = done, total

    try:
        with app.app_context():
            scan_book_ocr(book, data, key[1], on_progress)
        job.status = "done"
    except Exception as exc:
        log.error("[ocr] Queued OCR of book %d (%s) failed: %s", key[0], key[1], exc)
        job.status = "failed"
    finally:
        job.finished_at = time.monotonic()


def queue_book_ocr(book_id: int, title: str, path: str, name: str, book_format: str) -> dict[str, object]:
    """Queue OCR for one book format, or return the state of the job already queued or running."""
    key = (book_id, book_format.upper())
    with _lock:
        _prune()
        job = _jobs.get(key)
        if job is not None and job.status != "failed":
            return _snapshot(job)
        if sum(1 for other in _jobs.values() if other.status in ("queued", "processing")) >= MAX_PENDING_JOBS:
            raise OcrQueueFullError("too many OCR jobs pending")
        job = _jobs[key] = _Job()
        book = _Book(id=book_id, path=path, title=title)
        data = _Format(name=name, format=key[1])
        _ = _executor.submit(_run, key, job, book, data)
        log.info("[ocr] Queued %s of book %d", key[1], book_id)
        return _snapshot(job)
