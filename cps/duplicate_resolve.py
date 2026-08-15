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

"""Duplicate resolution (merge / batch / auto-resolve) logic.

Kept separate from the blueprint so both the web UI and the background
``TaskDuplicateScan`` can trigger resolutions. File deletion reuses the stock
Calibre-Web helpers; the lazy ``cps.editbooks`` import is a function-level
import mirroring the existing ``cps.helper -> cps.web`` pattern documented in
``.importlinter``.
"""

import json
import os
import shutil
from datetime import datetime

from . import calibre_db, config, db, helper, logger, ub
from .duplicate_index import (
    _AWARE_MAX,
    _AWARE_MIN,
    VALID_RESOLUTION_STRATEGIES,
    _timestamp_or_default,
    book_metadata_field_count,
    book_total_file_size,
    delete_book_keys,
    format_priority_from_settings,
    get_duplicate_groups_from_index,
    select_format_best_score,
    settings_to_dict,
)

log = logger.create()


def validate_resolution_strategy(strategy):
    return strategy in VALID_RESOLUTION_STRATEGIES


def select_book_to_keep(books, strategy):
    """Select which book to keep from a duplicate group based on strategy."""
    if not books:
        return None

    if strategy == "newest":
        return max(books, key=lambda b: _timestamp_or_default(b.timestamp, _AWARE_MIN))
    if strategy == "oldest":
        return min(books, key=lambda b: _timestamp_or_default(b.timestamp, _AWARE_MAX))
    if strategy == "merge":
        return max(books, key=lambda b: _timestamp_or_default(b.timestamp, _AWARE_MIN))
    if strategy == "highest_quality_format":
        priority = format_priority_from_settings()
        return max(
            books, key=lambda b: (select_format_best_score(b, priority), _timestamp_or_default(b.timestamp, _AWARE_MIN))
        )
    if strategy == "most_metadata":
        return max(books, key=lambda b: (book_metadata_field_count(b), _timestamp_or_default(b.timestamp, _AWARE_MIN)))
    if strategy == "largest_file_size":
        return max(books, key=lambda b: (book_total_file_size(b), _timestamp_or_default(b.timestamp, _AWARE_MIN)))
    return max(books, key=lambda b: _timestamp_or_default(b.timestamp, _AWARE_MIN))


def merge_duplicate_group(book_to_keep, books_to_merge):
    """Merge formats from duplicate books into the target book."""
    if not book_to_keep or not books_to_merge:
        return
    to_book = calibre_db.get_book(book_to_keep.id)
    if not to_book:
        raise ValueError("Target book not found for merge")
    existing_formats = [data_file.format for data_file in to_book.data] if to_book.data else []
    author_name = "unknown"
    if to_book.authors:
        author_name = to_book.authors[0].name
    to_name = (
        helper.get_valid_filename(to_book.title, chars=96) + " - " + helper.get_valid_filename(author_name, chars=96)
    )

    for source in books_to_merge:
        from_book = calibre_db.get_book(source.id)
        if not from_book:
            continue
        for element in from_book.data:
            if element.format in existing_formats:
                continue
            filepath_new = os.path.normpath(
                os.path.join(config.get_book_path(), to_book.path, to_name + "." + element.format.lower())
            )
            filepath_old = os.path.normpath(
                os.path.join(config.get_book_path(), from_book.path, element.name + "." + element.format.lower())
            )
            if not os.path.exists(filepath_old):
                continue
            shutil.copyfile(filepath_old, filepath_new)
            to_book.data.append(db.Data(to_book.id, element.format, element.uncompressed_size, to_name))
            existing_formats.append(element.format)
    try:
        calibre_db.session.commit()
    except Exception:
        calibre_db.session.rollback()
        raise


def _backup_dir_for_group(group_hash):
    """Directory where deleted duplicate files are backed up before removal."""
    base = os.path.dirname(ub.app_DB_path) if getattr(ub, "app_DB_path", None) else "."
    backup_dir = os.path.join(
        base,
        "processed_books",
        "duplicate_resolutions",
        datetime.now().strftime("%Y%m%d_%H%M%S") + "_group_" + (group_hash or "")[:8],
    )
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


def _delete_book_for_resolution(book, backup_dir):
    """Back up and delete a duplicate book; returns deleted book id or raises."""
    book_path = os.path.join(config.config_calibre_dir, book.path) if book.path else None
    if book_path and os.path.exists(book_path):
        backup_path = os.path.join(backup_dir, f"book_{book.id}")
        shutil.copytree(book_path, backup_path)
        log.info("[duplicates] Backed up book %s to %s", book.id, backup_path)

    delete_result, delete_error = helper.delete_book(book, config.get_book_path(), book_format="")
    if not delete_result:
        raise RuntimeError(f"Delete failed: {delete_error}")

    # Lazy import to avoid importing the editbooks UI module from background tasks
    from cps.editbooks import delete_whole_book

    delete_whole_book(book.id, book)
    try:
        calibre_db.session.commit()
    except Exception:
        calibre_db.session.rollback()
        raise
    return book.id


def log_resolution(
    group_hash, group_title, group_author, kept_book_id, deleted_book_ids, strategy, trigger_type, user_id, notes=""
):
    """Record a duplicate resolution in the audit log."""
    try:
        entry = ub.AuditLog(
            user_id=int(user_id) if user_id else 1,
            action="duplicate_resolution",
            resource_type="book_group",
            resource_id=str(group_hash or ""),
            details=json.dumps(
                {
                    "group_title": group_title,
                    "group_author": group_author,
                    "kept_book_id": kept_book_id,
                    "deleted_book_ids": deleted_book_ids,
                    "strategy": strategy,
                    "trigger_type": trigger_type,
                    "notes": notes,
                }
            ),
        )
        ub.session.add(entry)
        ub.session.commit()
    except Exception as e:
        log.warning("[duplicates] Failed to write audit log for resolution: %s", str(e))


def auto_resolve_duplicates(
    strategy="newest", dry_run=False, user_id=None, trigger_type="manual", duplicate_groups=None
):
    """Automatically resolve duplicate books by keeping one and deleting others.

    Returns a dict with: success, resolved_count, deleted_count, kept_count,
    errors, preview (list of dicts when dry_run=True).
    """
    if not validate_resolution_strategy(strategy):
        return {
            "success": False,
            "resolved_count": 0,
            "deleted_count": 0,
            "kept_count": 0,
            "errors": [f"Invalid strategy: {strategy}"],
        }

    # Disk space check (merge strategy needs extra space for copies)
    try:
        stat = shutil.disk_usage(config.config_calibre_dir or "/")
        available_gb = stat.free / (1024**3)
        min_space_gb = 2.0 if strategy == "merge" else 0.5
        if available_gb < min_space_gb and trigger_type == "automatic" and available_gb < min_space_gb * 0.5:
            return {
                "success": False,
                "resolved_count": 0,
                "deleted_count": 0,
                "kept_count": 0,
                "errors": [f"Insufficient disk space: {available_gb:.2f} GB available, {min_space_gb} GB required"],
            }
    except Exception as e:
        log.debug("[duplicates] Disk space check failed: %s", str(e))

    if duplicate_groups is None:
        settings = settings_to_dict()
        duplicate_groups = get_duplicate_groups_from_index(settings, include_dismissed=False, user_id=user_id)

    if not duplicate_groups:
        return {
            "success": True,
            "resolved_count": 0,
            "deleted_count": 0,
            "kept_count": 0,
            "errors": [],
            "message": "No unresolved duplicates found",
        }

    result = {
        "success": True,
        "resolved_count": 0,
        "deleted_count": 0,
        "kept_count": 0,
        "errors": [],
        "preview": [] if dry_run else None,
    }

    for group in duplicate_groups:
        try:
            book_to_keep = select_book_to_keep(group.get("books") or [], strategy)
            if not book_to_keep:
                result["errors"].append(f"Could not select book to keep for group: {group.get('title')}")
                continue

            books_to_delete = [b for b in (group.get("books") or []) if b.id != book_to_keep.id]
            if not books_to_delete:
                continue

            if dry_run:
                kept_formats = [d.format for d in (book_to_keep.data or []) if d.format] if book_to_keep.data else []
                if strategy == "merge":
                    for book in books_to_delete:
                        for d in book.data or []:
                            if d.format and d.format not in kept_formats:
                                kept_formats.append(d.format)
                result["preview"].append(
                    {
                        "group_hash": group.get("group_hash"),
                        "title": group.get("title"),
                        "author": group.get("author"),
                        "kept_book_id": book_to_keep.id,
                        "kept_book_timestamp": book_to_keep.timestamp.strftime("%Y-%m-%d %H:%M")
                        if book_to_keep.timestamp
                        else "Unknown",
                        "kept_book_formats": kept_formats,
                        "deleted_book_ids": [b.id for b in books_to_delete],
                        "deleted_books_info": [
                            {
                                "id": b.id,
                                "timestamp": b.timestamp.strftime("%Y-%m-%d %H:%M") if b.timestamp else "Unknown",
                                "formats": [d.format for d in b.data] if b.data else [],
                            }
                            for b in books_to_delete
                        ],
                    }
                )
                result["kept_count"] += 1
                result["deleted_count"] += len(books_to_delete)
                result["resolved_count"] += 1
                continue

            # Actual resolution mode
            book_to_keep_ref = calibre_db.get_book(book_to_keep.id)
            if not book_to_keep_ref:
                result["errors"].append(f"Book to keep (ID {book_to_keep.id}) no longer exists")
                continue
            books_to_delete = [calibre_db.get_book(book_id) for book_id in [b.id for b in books_to_delete]]
            books_to_delete = [b for b in books_to_delete if b]
            if not books_to_delete:
                continue
            book_to_keep = book_to_keep_ref

            deleted_ids = []
            backup_dir = _backup_dir_for_group(group.get("group_hash") or "unknown")

            if strategy == "merge":
                try:
                    merge_duplicate_group(book_to_keep, books_to_delete)
                except Exception as e:
                    log.error("[duplicates] Error merging books for group '%s': %s", group.get("title", "unknown"), e)
                    result["errors"].append(f"Group '{group.get('title', 'unknown')}': merge failed: {e!s}")
                    continue

            for book in books_to_delete:
                try:
                    deleted_ids.append(_delete_book_for_resolution(book, backup_dir))
                except Exception as e:
                    log.error("[duplicates] Error deleting book %s: %s", book.id, e)
                    result["errors"].append(f"Failed to delete book {book.id}: {e!s}")

            if deleted_ids:
                try:
                    delete_book_keys(deleted_ids)
                except Exception as e:
                    log.warning(
                        "[duplicates] Failed to delete duplicate index keys for books %s: %s", deleted_ids, str(e)
                    )

                log_resolution(
                    group_hash=group.get("group_hash"),
                    group_title=group.get("title"),
                    group_author=group.get("author"),
                    kept_book_id=book_to_keep.id,
                    deleted_book_ids=deleted_ids,
                    strategy=strategy,
                    trigger_type=trigger_type,
                    user_id=user_id,
                    notes=f"Resolved {len(deleted_ids)} duplicate(s) using {strategy} strategy",
                )

                result["resolved_count"] += 1
                result["kept_count"] += 1
                result["deleted_count"] += len(deleted_ids)
                log.info(
                    "[duplicates] Resolved duplicate group '%s' by %s: kept book %s, deleted %s duplicates",
                    group.get("title"),
                    group.get("author"),
                    book_to_keep.id,
                    len(deleted_ids),
                )
        except Exception as e:
            log.error("[duplicates] Error resolving duplicate group '%s': %s", group.get("title", "unknown"), e)
            result["errors"].append(f"Group '{group.get('title', 'unknown')}': {e!s}")

    if result["errors"]:
        result["success"] = False
    return result
