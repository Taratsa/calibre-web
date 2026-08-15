#   This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#     Copyright (C) 2023 OzzieIsaacs
#
#   This program is free software: you can redistribute it and/or modify
#   it under the terms of the GNU General Public License as published by
#   the Free Software Foundation, either version 3 of the License, or
#   (at your option) any later version.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU General Public License for more details.
#
#   You should have received a copy of the GNU General Public License
#   along with this program. If not, see <http://www.gnu.org/licenses/>.

from datetime import UTC, datetime

from flask_babel import lazy_gettext as N_
from sqlalchemy import func

from cps import app, calibre_db, db, logger
from cps.duplicate_index import (
    MAX_INCREMENTAL_BOOK_IDS,
    get_duplicate_cache,
    get_duplicate_groups_from_index,
    get_resolution_cooldown_timestamp,
    has_valid_duplicate_index_baseline,
    mark_duplicate_index_pending,
    merge_affected_groups_into_cache,
    rebuild_duplicate_index,
    settings_to_dict,
    update_duplicate_cache,
)
from cps.services.worker import STAT_CANCELLED, STAT_ENDED, CalibreTask

log = logger.create()


class TaskDuplicateScan(CalibreTask):
    def __init__(self, full_scan=True, task_message=None, trigger_type="manual", user_id=None, book_ids=None):
        super().__init__(task_message or N_("Duplicate scan"))
        self.full_scan = full_scan
        self.trigger_type = trigger_type
        self.user_id = user_id
        self.result_count = 0
        self.found_duplicate_groups = []
        self.book_ids = []
        for book_id in book_ids or []:
            try:
                parsed_book_id = int(book_id)
            except (TypeError, ValueError):
                continue
            if parsed_book_id > 0 and parsed_book_id not in self.book_ids:
                self.book_ids.append(parsed_book_id)

    @property
    def name(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return str(N_("Duplicate scan"))

    @property
    def is_cancellable(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return True

    def run(self, worker_thread):
        try:
            with app.app_context():
                self._run_in_context()
        except Exception as ex:
            log.error("[duplicates] Duplicate scan task failed: %s", str(ex))
            self._handleError(str(ex))
        finally:
            try:
                if calibre_db.session is not None:
                    calibre_db.session.close()
            except Exception as ex:
                log.debug("[duplicates] Could not close calibre session after scan: %s", str(ex))

    def _run_in_context(self):
        if self.stat in (STAT_CANCELLED, STAT_ENDED):
            return

        settings = settings_to_dict()

        if self.full_scan:
            self.progress = 0.05
            self.message = N_("Building duplicate index")

            def update_rebuild_progress(processed, total):
                if self.stat in (STAT_CANCELLED, STAT_ENDED):
                    return
                if total:
                    self.progress = 0.05 + (0.75 * (processed / total))
                    self.message = N_(
                        "Building duplicate index: %(processed)s/%(total)s books",
                        processed=processed,
                        total=total,
                    )
                else:
                    self.progress = 0.8
                    self.message = N_("Building duplicate index: no books")

            rebuild_metadata = rebuild_duplicate_index(settings, progress_callback=update_rebuild_progress)
            self.progress = 0.85
            self.message = N_("Finding duplicate groups")
            duplicate_groups = get_duplicate_groups_from_index(
                settings,
                include_dismissed=False,
                user_id=self.user_id,
            )
            self.result_count = len(duplicate_groups)
            self.found_duplicate_groups = duplicate_groups

            if self.stat in (STAT_CANCELLED, STAT_ENDED):
                return

            self.progress = 0.95
            self.message = N_("Updating duplicate cache")
            all_groups = get_duplicate_groups_from_index(settings, include_dismissed=True)
            max_book_id = rebuild_metadata.get("max_book_id", 0)
            update_duplicate_cache(all_groups, len(all_groups), max_book_id)
            log.info(
                "[duplicates] Duplicate cache updated (full scan): groups=%s max_book_id=%s",
                len(all_groups),
                max_book_id,
            )
        else:
            # Incremental scan: only index books newer than the last scan (or the
            # explicitly passed book ids), then refresh the affected groups.
            cache_data = get_duplicate_cache()
            last_scanned_book_id = int((cache_data or {}).get("last_scanned_book_id") or 0)
            if self.book_ids:
                candidate_ids = list(self.book_ids)
            else:
                candidate_ids = [
                    int(row[0])
                    for row in (
                        calibre_db.session.query(db.Books.id)
                        .filter(db.Books.id > last_scanned_book_id)
                        .order_by(db.Books.id)
                        .limit(MAX_INCREMENTAL_BOOK_IDS + 1)
                        .all()
                    )
                    if row[0] is not None
                ]
                if len(candidate_ids) > MAX_INCREMENTAL_BOOK_IDS:
                    mark_duplicate_index_pending("incremental book set too large")
                    self.progress = 1
                    self.message = N_("Duplicate scan pending: manual scan required")
                    self._handleSuccess()
                    return

            if not has_valid_duplicate_index_baseline(settings, candidate_book_ids=candidate_ids):
                mark_duplicate_index_pending("no valid duplicate index baseline")
                self.progress = 1
                self.message = N_("Duplicate scan pending: manual scan required")
                self._handleSuccess()
                return

            max_book_id = 0
            try:
                max_id_result = calibre_db.session.query(func.max(db.Books.id)).scalar()
                max_book_id = max_id_result if max_id_result is not None else 0
            except Exception as ex:
                log.warning("[duplicates] Could not get max book ID in TaskDuplicateScan: %s", str(ex))

            if not candidate_ids:
                # No impacted books; just bump the scan watermark
                from cps.duplicate_index import _bump_scan_watermark

                _bump_scan_watermark(max_book_id)
                self.result_count = 0
            else:
                try:
                    merge_result = merge_affected_groups_into_cache(candidate_ids, settings)
                except Exception as ex:
                    mark_duplicate_index_pending("incremental duplicate merge failed")
                    self.result_count = 0
                    self.found_duplicate_groups = []
                    self.progress = 1
                    self.message = N_("Duplicate scan pending: manual scan required")
                    self._handleSuccess()
                    log.warning("[duplicates] Failed to update incremental duplicate index cache: %s", str(ex))
                    return

                if merge_result.get("pending"):
                    self.result_count = 0
                    self.found_duplicate_groups = []
                    self.progress = 1
                    self.message = N_("Duplicate scan pending: manual scan required")
                    self._handleSuccess()
                    log.info(
                        "[duplicates] Incremental duplicate merge marked pending: %s",
                        merge_result.get("reason", "unknown"),
                    )
                    return

                unresolved_in_candidates = get_duplicate_groups_from_index(
                    settings,
                    include_dismissed=False,
                    user_id=self.user_id,
                    candidate_book_ids=candidate_ids,
                )
                self.result_count = len(unresolved_in_candidates)
                self.found_duplicate_groups = unresolved_in_candidates
                log.debug(
                    "[duplicates] Incremental scan result: %s unresolved groups among candidates", self.result_count
                )

        self.progress = 1
        if self.full_scan:
            self.message = N_("Duplicate scan completed: %(count)s groups", count=self.result_count)
        else:
            self.message = N_("Duplicate scan completed: %(count)s new groups", count=self.result_count)
        self._handleSuccess()

        if self.result_count > 0:
            self._maybe_auto_resolve()

    def _maybe_auto_resolve(self):
        settings = settings_to_dict()
        try:
            if not int(settings.get("duplicate_auto_resolve_enabled", 0)):
                return
            strategy = settings.get("duplicate_auto_resolve_strategy", "newest")
            cooldown_minutes = int(settings.get("duplicate_auto_resolve_cooldown_minutes", 0))
            if cooldown_minutes > 0:
                last_resolution = get_resolution_cooldown_timestamp()
                if last_resolution:
                    try:
                        if last_resolution.tzinfo is None:
                            last_resolution = last_resolution.replace(tzinfo=UTC)
                        now = datetime.now(UTC)
                        elapsed = (now - last_resolution).total_seconds() / 60
                        if elapsed < cooldown_minutes:
                            log.info(
                                "[duplicates] Auto-resolution skipped due to cooldown: %.1f minutes remaining",
                                cooldown_minutes - elapsed,
                            )
                            return
                    except Exception as e:
                        log.warning("[duplicates] Cooldown check failed: %s", str(e))

            from cps.duplicate_resolve import auto_resolve_duplicates

            result = auto_resolve_duplicates(
                strategy=strategy,
                dry_run=False,
                user_id=self.user_id,
                trigger_type="automatic",
                duplicate_groups=self.found_duplicate_groups,
            )
            if result.get("success"):
                resolved = result.get("resolved_count", 0)
                log.info(
                    "[duplicates] Auto-resolution completed: resolved=%s, kept=%s, deleted=%s",
                    resolved,
                    result.get("kept_count", 0),
                    result.get("deleted_count", 0),
                )
                if resolved > 0:
                    settings = settings_to_dict()
                    all_groups = get_duplicate_groups_from_index(settings, include_dismissed=True)
                    update_duplicate_cache(all_groups, len(all_groups))
                    self.message = N_("Duplicate scan completed: %(count)s groups auto-resolved", count=resolved)
            else:
                log.warning("[duplicates] Auto-resolution completed with errors: %s", result.get("errors", []))
        except Exception as ex:
            log.error("[duplicates] Exception during auto-resolution check: %s", str(ex))
