#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2023 OzzieIsaacs
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program. If not, see <http://www.gnu.org/licenses/>.

from flask_babel import lazy_gettext as N_

from cps import app, calibre_db, logger
from cps.duplicate_index import (
    get_duplicate_groups_from_index,
    mark_duplicate_index_pending,
    settings_to_dict,
    update_duplicate_cache,
)
from cps.services.worker import CalibreTask

log = logger.create()


class TaskDuplicateResolve(CalibreTask):
    """Resolve duplicate groups on the worker thread.

    Resolution is heavy and long-running: every removed book is copied to a
    backup directory (``shutil.copytree`` of the whole book folder) and deleted
    through the Calibre metadata layer. Running that inside a request handler
    blocks the cooperative gevent worker for the entire run, so every other
    request (including the Duplicates page itself) stalls until it finishes and
    Cloudflare answers 524. The worker runs on its own OS thread, which keeps
    the WSGI loop free to serve requests while the resolution proceeds.
    """

    def __init__(self, strategy="newest", task_message=None, trigger_type="manual", user_id=None):
        super().__init__(task_message or N_("Resolve duplicates"))
        self.strategy = strategy
        self.trigger_type = trigger_type
        self.user_id = user_id
        self.resolved_count = 0
        self.deleted_count = 0
        self.errors = []

    @property
    def name(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return str(N_("Resolve duplicates"))

    @property
    def is_cancellable(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        # Mid-resolution cancellation would leave books half-backed-up and
        # half-deleted, so the task runs to completion.
        return False

    def run(self, worker_thread):
        try:
            with app.app_context():
                self._run_in_context()
        except Exception as ex:
            log.error("[duplicates] Duplicate resolution task failed: %s", str(ex))
            self._handleError(str(ex))
        finally:
            try:
                if calibre_db.session is not None:
                    calibre_db.session.close()
            except Exception as ex:
                log.debug("[duplicates] Could not close calibre session after resolution: %s", str(ex))

    def _run_in_context(self):
        settings = settings_to_dict()
        self.progress = 0.05
        self.message = N_("Loading duplicate groups")
        groups = get_duplicate_groups_from_index(settings, include_dismissed=False, user_id=self.user_id)

        if not groups:
            self.progress = 1
            self.message = N_("No duplicates to resolve")
            self._handleSuccess()
            return

        self.progress = 0.15
        self.message = N_("Resolving %(count)s duplicate groups", count=len(groups))
        log.info(
            "[duplicates] Resolving %s duplicate groups (strategy=%s, trigger=%s)",
            len(groups),
            self.strategy,
            self.trigger_type,
        )

        # Lazy import: cps.duplicate_resolve -> cps.editbooks is a documented
        # import-linter ignore, and tasks must not import the UI layer.
        from cps.duplicate_resolve import auto_resolve_duplicates

        result = auto_resolve_duplicates(
            strategy=self.strategy,
            dry_run=False,
            user_id=self.user_id,
            trigger_type=self.trigger_type,
            duplicate_groups=groups,
        )

        self.resolved_count = int(result.get("resolved_count", 0) or 0)
        self.deleted_count = int(result.get("deleted_count", 0) or 0)
        self.errors = list(result.get("errors", []) or [])

        self.progress = 0.9
        self.message = N_("Refreshing duplicate cache")
        self._refresh_cache()

        self.progress = 1
        self.message = N_(
            "Duplicate resolution completed: %(groups)s groups, %(books)s books removed",
            groups=self.resolved_count,
            books=self.deleted_count,
        )
        log.info(
            "[duplicates] Resolution completed: groups=%s removed=%s errors=%s",
            self.resolved_count,
            self.deleted_count,
            len(self.errors),
        )
        self._handleSuccess()

    def _refresh_cache(self):
        """Refresh cached duplicate groups after resolution removed books."""
        try:
            from cps.duplicate_index import _current_max_book_id

            groups = get_duplicate_groups_from_index(settings_to_dict(), include_dismissed=True)
            update_duplicate_cache(groups, len(groups), _current_max_book_id())
        except Exception as ex:
            log.warning("[duplicates] Failed to refresh cache after resolution: %s", str(ex))
            mark_duplicate_index_pending("cache refresh after resolution failed")
