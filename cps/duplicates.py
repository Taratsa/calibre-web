#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2018-2019 OzzieIsaacs, cervinko, jkrehm, bodybybuddha, ok11,
#                            andy29485, idalin, Kyosfonica, wuqi, Kennyl, lemmsh,
#                            falgh1, grunjol, csitko, ytils, xybydy, trasba, vrabe,
#                            ruben-herold, marblepebble, JackED42, SiphonSquirrel,
#                            apetresc, nanu-c, mutschler
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

"""Web UI for the Smart Duplicate Detection System & Management."""

from functools import wraps

from flask import Blueprint, abort, jsonify, request
from flask_babel import gettext as _

from . import csrf, logger, ub
from .cw_login import current_user
from .duplicate_index import (
    get_duplicate_cache,
    get_duplicate_groups_from_index,
    get_next_duplicate_scan_run,
    get_or_create_settings,
    get_unresolved_duplicate_count,
    library_has_books,
    mark_duplicate_index_pending,
    rebuild_duplicate_index,
    settings_to_dict,
    update_settings_from_dict,
)
from .duplicate_resolve import auto_resolve_duplicates
from .render_template import render_title_template
from .services.worker import STAT_ENDED, STAT_FINISH_SUCCESS, WorkerThread

log = logger.create()

duplicates = Blueprint("duplicates", __name__)


def admin_or_edit_required(f):
    """Allow access for admins or users with the edit role."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            abort(401)
        if not (current_user.role_admin() or current_user.role_edit()):
            abort(403)
        return f(*args, **kwargs)

    return decorated_function


def _settings():
    return settings_to_dict()


def _scan_task_active():
    """True when a duplicate scan background task is currently running."""
    try:
        for __, __, __, task, __ in WorkerThread.get_instance().tasks:
            name = str(getattr(task, "name", "")).lower()
            if name == "duplicate scan" and task.stat not in (STAT_ENDED, STAT_FINISH_SUCCESS):
                return True
    except Exception as ex:
        log.debug("[duplicates] Could not check running scan task state: %s", str(ex))
    return False


def _index_needs_full_scan():
    """True when the duplicate index baseline is missing/stale and no scan is running."""
    if _scan_task_active():
        return False
    try:
        from .duplicate_index import duplicate_index_needs_manual_full_scan

        return library_has_books() and duplicate_index_needs_manual_full_scan(_settings())
    except Exception as ex:
        log.warning("[duplicates] Could not evaluate index baseline: %s", str(ex))
        return library_has_books()


@duplicates.route("/duplicates")
@admin_or_edit_required
def show_duplicates():
    """Display cached duplicate groups and prompt for the initial index scan."""
    log.info("[duplicates] Loading duplicates page for user: %s", current_user.name)

    duplicate_groups = []
    duplicate_index_needs_full_scan = _index_needs_full_scan()

    if not duplicate_index_needs_full_scan:
        duplicate_groups = get_duplicate_groups_from_index(
            _settings(),
            include_dismissed=False,
            user_id=current_user.id if current_user else None,
        )

    cache_data = get_duplicate_cache()
    settings = get_or_create_settings()

    return render_title_template(
        "duplicates.html",
        duplicate_groups=duplicate_groups,
        duplicate_index_needs_full_scan=duplicate_index_needs_full_scan,
        next_scan_run=get_next_duplicate_scan_run(),
        settings=settings,
        unresolved_count=len(duplicate_groups),
        cache_timestamp=cache_data.get("scan_timestamp"),
        title=_("Duplicate Books"),
        page="duplicates",
    )


@duplicates.route("/duplicates/status")
@admin_or_edit_required
def get_duplicate_status():
    """API endpoint to get unresolved duplicate count and sample groups."""
    try:
        settings = _settings()
        if not int(settings.get("duplicate_detection_enabled", 1)):
            return jsonify({"success": True, "enabled": False, "count": 0, "preview": []})

        cache_data = get_duplicate_cache()
        needs_full_scan = _index_needs_full_scan()

        if cache_data and cache_data.get("duplicate_groups"):
            duplicate_groups = get_duplicate_groups_from_index(
                settings,
                include_dismissed=False,
                user_id=current_user.id if current_user else None,
            )
            preview = [
                {
                    "title": group["title"],
                    "author": group["author"],
                    "count": group["count"],
                    "hash": group["group_hash"],
                }
                for group in duplicate_groups[:3]
            ]
            return jsonify(
                {
                    "success": True,
                    "enabled": bool(settings.get("duplicate_detection_enabled", 1)),
                    "count": len(duplicate_groups),
                    "preview": preview,
                    "cached": True,
                    "stale": bool(cache_data.get("scan_pending")),
                    "needs_scan": needs_full_scan,
                    "needs_full_scan": needs_full_scan,
                }
            )

        return jsonify(
            {
                "success": True,
                "enabled": bool(settings.get("duplicate_detection_enabled", 1)),
                "count": 0,
                "preview": [],
                "cached": False,
                "needs_scan": needs_full_scan,
                "needs_full_scan": needs_full_scan,
            }
        )
    except Exception as e:
        log.error("[duplicates] Error getting duplicate status: %s", str(e))
        return jsonify({"success": False, "error": str(e), "count": 0, "preview": []}), 500


@duplicates.route("/duplicates/dismiss/<group_hash>", methods=["POST"])
@admin_or_edit_required
def dismiss_duplicate_group(group_hash):
    """API endpoint to dismiss a duplicate group."""
    try:
        existing = (
            ub.session.query(ub.DismissedDuplicateGroup)
            .filter(ub.DismissedDuplicateGroup.user_id == current_user.id)
            .filter(ub.DismissedDuplicateGroup.group_hash == group_hash)
            .first()
        )
        if existing:
            return jsonify(
                {
                    "success": True,
                    "message": _("Duplicate group already dismissed"),
                    "count": get_unresolved_duplicate_count(current_user.id),
                }
            )

        ub.session.add(ub.DismissedDuplicateGroup(user_id=current_user.id, group_hash=group_hash))
        ub.session.commit()
        log.info("[duplicates] User %s dismissed duplicate group %s", current_user.name, group_hash)

        return jsonify(
            {
                "success": True,
                "message": _("Duplicate group dismissed"),
                "count": get_unresolved_duplicate_count(current_user.id),
            }
        )
    except Exception as e:
        ub.session.rollback()
        log.error("[duplicates] Error dismissing duplicate group: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@duplicates.route("/duplicates/undismiss/<group_hash>", methods=["POST"])
@admin_or_edit_required
def undismiss_duplicate_group(group_hash):
    """API endpoint to un-dismiss a duplicate group."""
    try:
        deleted = (
            ub.session.query(ub.DismissedDuplicateGroup)
            .filter(ub.DismissedDuplicateGroup.user_id == current_user.id)
            .filter(ub.DismissedDuplicateGroup.group_hash == group_hash)
            .delete()
        )
        ub.session.commit()
        message = _("Duplicate group restored") if deleted else _("Duplicate group was not dismissed")
        return jsonify(
            {
                "success": True,
                "message": message,
                "count": get_unresolved_duplicate_count(current_user.id),
            }
        )
    except Exception as e:
        ub.session.rollback()
        log.error("[duplicates] Error un-dismissing duplicate group: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@duplicates.route("/duplicates/invalidate-cache", methods=["POST"])
@csrf.exempt
def invalidate_cache():
    """Internal endpoint to invalidate duplicate cache (called after upload/edit)."""
    try:
        mark_duplicate_index_pending("cache invalidation requested")
        return jsonify({"success": True, "message": "Cache invalidated"})
    except Exception as e:
        log.error("[duplicates] Error invalidating cache: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


def _trigger_scan_sync(user_id):
    """Fallback synchronous scan (used when the background worker is unavailable)."""
    from .duplicate_index import update_duplicate_cache

    settings = _settings()
    rebuild_metadata = rebuild_duplicate_index(settings)
    duplicate_groups = get_duplicate_groups_from_index(settings, include_dismissed=False, user_id=user_id)
    all_groups = get_duplicate_groups_from_index(settings, include_dismissed=True)
    update_duplicate_cache(all_groups, len(all_groups), rebuild_metadata.get("max_book_id", 0))

    auto_resolve_enabled = int(settings.get("duplicate_auto_resolve_enabled", 0))
    if auto_resolve_enabled and duplicate_groups:
        strategy = settings.get("duplicate_auto_resolve_strategy", "newest")
        result = auto_resolve_duplicates(
            strategy=strategy, dry_run=False, user_id=user_id, trigger_type="manual", duplicate_groups=duplicate_groups
        )
        if result.get("success") and result.get("resolved_count", 0) > 0:
            rebuild_metadata = rebuild_duplicate_index(settings)
            duplicate_groups = get_duplicate_groups_from_index(settings, include_dismissed=False, user_id=user_id)
            all_groups = get_duplicate_groups_from_index(settings, include_dismissed=True)
            update_duplicate_cache(all_groups, len(all_groups), rebuild_metadata.get("max_book_id", 0))

    return duplicate_groups


@duplicates.route("/duplicates/trigger-scan", methods=["POST"])
@admin_or_edit_required
def trigger_scan():
    """Manually trigger a duplicate scan."""
    try:
        mark_duplicate_index_pending("manual scan requested")
        try:
            from .tasks.duplicate_scan import TaskDuplicateScan

            task = TaskDuplicateScan(full_scan=True, trigger_type="manual", user_id=current_user.id)
            WorkerThread.add(current_user.name, task, hidden=False)
            log.info("[duplicates] Manual scan queued by user %s (task_id=%s)", current_user.name, task.id)
            return jsonify(
                {"success": True, "message": _("Duplicate scan queued"), "task_id": str(task.id), "queued": True}
            )
        except Exception as e:
            log.error("[duplicates] Failed to queue scan task, falling back to sync scan: %s", str(e))
            duplicate_groups = _trigger_scan_sync(current_user.id)
            return jsonify(
                {
                    "success": True,
                    "message": _("Duplicate scan completed (fallback)"),
                    "count": len(duplicate_groups),
                    "fallback": True,
                    "queued": False,
                    "fallback_reason": str(e),
                }
            )
    except Exception as e:
        log.error("[duplicates] Error triggering scan: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@duplicates.route("/duplicates/preview-resolution", methods=["POST"])
@admin_or_edit_required
def preview_resolution():
    """Preview auto-resolution without executing."""
    try:
        strategy = (
            request.get_json(silent=True).get("strategy", "newest")
            if request.is_json
            else (request.form.get("strategy") or "newest")
        )
        duplicate_groups = _get_duplicate_groups_for_resolution(current_user.id)
        result = auto_resolve_duplicates(
            strategy=strategy,
            dry_run=True,
            user_id=current_user.id,
            trigger_type="manual",
            duplicate_groups=duplicate_groups,
        )
        return jsonify(result)
    except Exception as e:
        log.error("[duplicates] Error previewing resolution: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@duplicates.route("/duplicates/execute-resolution", methods=["POST"])
@admin_or_edit_required
def execute_resolution():
    """Execute auto-resolution."""
    try:
        strategy = (
            request.get_json(silent=True).get("strategy", "newest")
            if request.is_json
            else (request.form.get("strategy") or "newest")
        )
        duplicate_groups = _get_duplicate_groups_for_resolution(current_user.id)
        result = auto_resolve_duplicates(
            strategy=strategy,
            dry_run=False,
            user_id=current_user.id,
            trigger_type="manual",
            duplicate_groups=duplicate_groups,
        )
        _refresh_duplicate_cache_after_resolution()
        return jsonify(result)
    except Exception as e:
        log.error("[duplicates] Error executing resolution: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@duplicates.route("/duplicates/settings", methods=["POST"])
@admin_or_edit_required
def save_settings():
    """Persist the duplicate detection / resolution settings."""
    try:
        payload = request.form or request.json or {}
        settings = update_settings_from_dict(payload)
        # If criteria changed, the index must be rebuilt
        from .duplicate_index import get_criteria_fingerprint

        old_fingerprint = get_duplicate_cache().get("criteria_fingerprint", "")
        new_fingerprint = get_criteria_fingerprint(settings_to_dict(settings))
        if old_fingerprint and old_fingerprint != new_fingerprint:
            mark_duplicate_index_pending("criteria changed")
        return jsonify({"success": True, "message": _("Duplicate settings saved")})
    except Exception as e:
        ub.session.rollback()
        log.error("[duplicates] Error saving duplicate settings: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


def _get_duplicate_groups_for_resolution(user_id=None):
    """Use the same indexed duplicate source as the Duplicates page."""
    try:
        return get_duplicate_groups_from_index(_settings(), include_dismissed=False, user_id=user_id)
    except Exception as ex:
        log.warning("[duplicates] Failed to load indexed groups for resolution: %s", str(ex))
        return []


def _refresh_duplicate_cache_after_resolution():
    """Refresh cached duplicate groups after resolution removes books/index rows."""
    from .duplicate_index import _current_max_book_id, update_duplicate_cache

    try:
        duplicate_groups = get_duplicate_groups_from_index(_settings(), include_dismissed=True)
        update_duplicate_cache(duplicate_groups, len(duplicate_groups), _current_max_book_id())
    except Exception as ex:
        log.warning("[duplicates] Failed to refresh cache after resolution: %s", str(ex))
        mark_duplicate_index_pending("cache refresh after resolution failed")
