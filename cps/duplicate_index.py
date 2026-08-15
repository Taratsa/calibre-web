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

"""Duplicate index and matching-rule engine.

This module is the data layer of the Smart Duplicate Detection System. It
implements:

* A persistent per-book index (``duplicate_book_key``) of normalized matching
  keys, so incremental scans only need to (re)index books added since the last
  scan instead of rescanning the whole library.
* Hybrid SQL + Python fuzzy matching: SQL is used as a candidate prefilter and
  Python normalizes titles/authors (stripping leading "Author, Title" prefixes)
  for robust grouping.
* A cached list of duplicate groups (``duplicate_index_cache``) so the
  Duplicates page never rescans the library on every request.
* Configurable matching rules / thresholds stored in ``duplicate_settings``.

It must remain free of web/UI dependencies so background tasks and scheduled
scans can use it (see .importlinter contracts).
"""

import contextlib
import hashlib
import json
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func
from sqlalchemy.orm import joinedload
from sqlalchemy.sql.expression import false, true

from . import calibre_db, db, logger, ub

log = logger.create()

NORMALIZATION_VERSION = "duplicate-index-v1"
MAX_INCREMENTAL_BOOK_IDS = 1000
DUPLICATE_INDEX_REBUILD_BATCH_SIZE = 250

_AWARE_MIN = datetime.min.replace(tzinfo=UTC)
_AWARE_MAX = datetime.max.replace(tzinfo=UTC)

DEFAULT_FORMAT_PRIORITY = {
    "EPUB": 100,
    "KEPUB": 95,
    "MOBI": 80,
    "AZW3": 80,
    "AZW": 70,
    "PDF": 60,
    "CBZ": 50,
    "CBR": 50,
    "FB2": 60,
    "DJVU": 50,
    "TXT": 30,
    "HTML": 30,
    "RTF": 30,
    "OTHER": 10,
}

VALID_RESOLUTION_STRATEGIES = (
    "newest",
    "oldest",
    "merge",
    "highest_quality_format",
    "most_metadata",
    "largest_file_size",
)


# ---------------------------------------------------------------------------
# Settings helpers
# ---------------------------------------------------------------------------
def get_or_create_settings():
    """Return the singleton DuplicateSettings row, creating it if needed."""
    settings = ub.session.query(ub.DuplicateSettings).filter(ub.DuplicateSettings.id == 1).first()
    if settings is None:
        settings = ub.DuplicateSettings(id=1)
        ub.session.add(settings)
        try:
            ub.session.commit()
        except Exception:
            ub.session.rollback()
            settings = ub.session.query(ub.DuplicateSettings).filter(ub.DuplicateSettings.id == 1).first()
    return settings


def update_settings_from_dict(payload):
    """Persist settings from a UI form payload (dict of form values)."""
    settings = get_or_create_settings()
    bool_keys = (
        "detection_enabled",
        "use_title",
        "use_author",
        "use_language",
        "use_series",
        "use_publisher",
        "use_format",
        "schedule_enabled",
        "auto_resolve_enabled",
    )
    for key in bool_keys:
        setattr(settings, key, bool(int(payload.get(key, 0) or 0)))

    scan_method = (payload.get("scan_method") or "").strip().lower()
    if scan_method not in ("hybrid", "python", "sql"):
        scan_method = "hybrid"
    settings.scan_method = scan_method

    settings.schedule_cron = (payload.get("schedule_cron") or "").strip()
    strategy = (payload.get("auto_resolve_strategy") or "").strip()
    if strategy not in VALID_RESOLUTION_STRATEGIES:
        strategy = "newest"
    settings.auto_resolve_strategy = strategy

    try:
        settings.auto_resolve_cooldown_minutes = int(payload.get("auto_resolve_cooldown_minutes") or 0)
    except (TypeError, ValueError):
        settings.auto_resolve_cooldown_minutes = 0

    format_priority = {}
    try:
        format_priority = json.loads(payload.get("format_priority") or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        format_priority = {}
    settings.format_priority = format_priority

    ub.session.add(settings)
    ub.session.commit()
    return settings


def settings_to_dict(settings=None):
    """Normalize the settings model into the dict shape the detection code uses."""
    if settings is None:
        settings = get_or_create_settings()
    return {
        "duplicate_detection_enabled": 1 if settings.detection_enabled else 0,
        "duplicate_detection_title": 1 if settings.use_title else 0,
        "duplicate_detection_author": 1 if settings.use_author else 0,
        "duplicate_detection_language": 1 if settings.use_language else 0,
        "duplicate_detection_series": 1 if settings.use_series else 0,
        "duplicate_detection_publisher": 1 if settings.use_publisher else 0,
        "duplicate_detection_format": 1 if settings.use_format else 0,
        "duplicate_detection_use_sql": 1,
        "duplicate_scan_method": settings.scan_method or "hybrid",
        "duplicate_scan_enabled": 1 if settings.schedule_enabled else 0,
        "duplicate_scan_cron": settings.schedule_cron or "",
        "duplicate_auto_resolve_enabled": 1 if settings.auto_resolve_enabled else 0,
        "duplicate_auto_resolve_strategy": settings.auto_resolve_strategy or "newest",
        "duplicate_auto_resolve_cooldown_minutes": settings.auto_resolve_cooldown_minutes or 0,
        "duplicate_format_priority": json.dumps(settings.format_priority or {}),
    }


def _setting_enabled(settings, key, default):
    return bool(int(settings.get(key, default) or 0))


def get_effective_duplicate_criteria(settings):
    criteria = {
        "title": _setting_enabled(settings, "duplicate_detection_title", 1),
        "author": _setting_enabled(settings, "duplicate_detection_author", 1),
        "language": _setting_enabled(settings, "duplicate_detection_language", 1),
        "series": _setting_enabled(settings, "duplicate_detection_series", 0),
        "publisher": _setting_enabled(settings, "duplicate_detection_publisher", 0),
        "format": _setting_enabled(settings, "duplicate_detection_format", 0),
    }
    if not any(criteria.values()):
        criteria["title"] = True
        criteria["author"] = True
    return criteria


def get_criteria_fingerprint(settings):
    return _hash_json(
        {
            "normalization_version": NORMALIZATION_VERSION,
            "criteria": get_effective_duplicate_criteria(settings),
        }
    )


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------
def _hash_json(payload) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _normalize_timestamp(ts):
    if ts is None:
        return None
    if getattr(ts, "tzinfo", None) is None:
        try:
            return ts.replace(tzinfo=UTC)
        except Exception:
            return ts
    try:
        return ts.astimezone(UTC)
    except Exception:
        return ts


def _timestamp_or_default(ts, default):
    normalized = _normalize_timestamp(ts)
    return normalized if normalized is not None else default


def normalize_title_for_duplicates(title, primary_author=None):
    """Normalize title for duplicate detection.

    If the title starts with the primary author (e.g. "Homer, the Iliad"),
    strip the leading author prefix to avoid false negatives.
    """
    normalized = (title or "untitled").lower().strip()
    if primary_author:
        author_norm = str(primary_author).lower().strip()
        author_prefix = f"{author_norm}, "
        if normalized.startswith(author_prefix):
            normalized = normalized[len(author_prefix) :].strip()
    return normalized


def generate_group_hash(title, author):
    """Generate an MD5 hash for a duplicate group based on title and author."""
    normalized_title = (title or "untitled").lower().strip()
    normalized_author = (author or "unknown").lower().strip()
    composite = f"{normalized_title}|{normalized_author}"
    return hashlib.md5(composite.encode("utf-8"), usedforsecurity=False).hexdigest()


# ---------------------------------------------------------------------------
# Key building
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class BookKeyParts:
    normalized_title: str
    normalized_author: str
    normalized_language: str
    normalized_series: str
    normalized_publisher: str
    format_signature: str

    def as_db_tuple(self):
        return (
            self.normalized_title,
            self.normalized_author,
            self.normalized_language,
            self.normalized_series,
            self.normalized_publisher,
            self.format_signature,
        )


def _primary_author(book):
    if not getattr(book, "authors", None):
        return "unknown"
    book.ordered_authors = calibre_db.order_authors([book])
    if book.ordered_authors and len(book.ordered_authors) > 0 and book.ordered_authors[0].name:
        return book.ordered_authors[0].name
    return "unknown"


def build_book_key_parts(book, settings):
    primary_author = _primary_author(book)
    title = book.title if getattr(book, "title", None) else "untitled"

    language = book.languages[0].lang_code or "unknown" if getattr(book, "languages", None) else "unknown"
    series = book.series[0].name or "no_series" if getattr(book, "series", None) else "no_series"
    publisher = (
        book.publishers[0].name or "unknown_publisher" if getattr(book, "publishers", None) else "unknown_publisher"
    )

    if getattr(book, "data", None):
        formats = sorted([data.format.lower() for data in book.data if data.format])
        format_signature = ",".join(formats) if formats else "no_format"
    else:
        format_signature = "no_format"

    return BookKeyParts(
        normalized_title=normalize_title_for_duplicates(title, primary_author),
        normalized_author=primary_author.lower().strip() if primary_author else "unknown",
        normalized_language=language.lower().strip(),
        normalized_series=series.lower().strip(),
        normalized_publisher=publisher.lower().strip(),
        format_signature=format_signature,
    )


def _enabled_key_values(parts: BookKeyParts, settings):
    criteria = get_effective_duplicate_criteria(settings)
    values = []
    if criteria["title"]:
        values.append(("title", parts.normalized_title))
    if criteria["author"]:
        values.append(("author", parts.normalized_author))
    if criteria["language"]:
        values.append(("language", parts.normalized_language))
    if criteria["series"]:
        values.append(("series", parts.normalized_series))
    if criteria["publisher"]:
        values.append(("publisher", parts.normalized_publisher))
    if criteria["format"]:
        values.append(("format", parts.format_signature))
    return values


def build_duplicate_key(book, settings):
    return _hash_json(_enabled_key_values(build_book_key_parts(book, settings), settings))


# ---------------------------------------------------------------------------
# Book loading
# ---------------------------------------------------------------------------
def _book_query(book_ids=None):
    query = (
        calibre_db.session.query(db.Books)
        .options(joinedload(db.Books.data))
        .options(joinedload(db.Books.authors))
        .options(joinedload(db.Books.languages))
        .options(joinedload(db.Books.series))
        .options(joinedload(db.Books.publishers))
    )
    if book_ids is not None:
        query = query.filter(db.Books.id.in_(list(book_ids)))
    return query


def _load_books_by_ids(book_ids=None, user_id=None):
    query = _book_query(book_ids)
    # Per-user visibility filters only apply when the caller is loading books
    # for display. Index building must always cover the full library.
    if user_id is not None:
        query = query.filter(get_common_filters(user_id=user_id))
    return query.order_by(db.Books.title, db.Books.timestamp.desc()).all()


def _current_max_book_id():
    max_book_id = calibre_db.session.query(func.max(db.Books.id)).scalar()
    return int(max_book_id or 0)


def library_has_books():
    return _current_max_book_id() > 0


def _current_library_book_ids():
    book_ids = set()
    for row in calibre_db.session.query(db.Books.id).all():
        if hasattr(row, "id"):
            value = row.id
        else:
            try:
                value = row[0]
            except (TypeError, IndexError):
                value = row
        if value is not None:
            book_ids.add(int(value))
    return book_ids


def _chunks(values, size):
    values = list(values)
    for start in range(0, len(values), size):
        yield values[start : start + size]


def get_common_filters(user_id=None):
    """Build per-user visibility filters, or a permissive filter outside requests."""
    try:
        if user_id is None:
            return calibre_db.common_filters()
    except Exception:
        return true()

    try:
        user = ub.session.query(ub.User).filter(ub.User.id == int(user_id)).first()
        if not user:
            return true()

        archived_books = (
            ub.session.query(ub.ArchivedBook.book_id)
            .filter(ub.ArchivedBook.user_id == int(user.id))
            .filter(ub.ArchivedBook.is_archived)
            .all()
        )
        archived_book_ids = [row[0] for row in archived_books]
        archived_filter = db.Books.id.notin_(archived_book_ids) if archived_book_ids else true()

        if user.filter_language() == "all":
            lang_filter = true()
        else:
            lang_filter = db.Books.languages.any(db.Languages.lang_code == user.filter_language())

        negtags_list = user.list_denied_tags()
        postags_list = user.list_allowed_tags()
        neg_content_tags_filter = false() if negtags_list == [""] else db.Books.tags.any(db.Tags.name.in_(negtags_list))
        pos_content_tags_filter = true() if postags_list == [""] else db.Books.tags.any(db.Tags.name.in_(postags_list))
        return _and_filters(lang_filter, pos_content_tags_filter, ~neg_content_tags_filter, archived_filter)
    except Exception:
        return true()


def _and_filters(*filters):
    from sqlalchemy import and_

    return and_(*[f for f in filters if f is not None])


# ---------------------------------------------------------------------------
# Index CRUD
# ---------------------------------------------------------------------------
def upsert_book_keys(book_ids: Iterable[int], settings):
    book_ids = {int(book_id) for book_id in book_ids if book_id is not None}
    if len(book_ids) > MAX_INCREMENTAL_BOOK_IDS:
        raise ValueError(f"Incremental duplicate index update exceeds {MAX_INCREMENTAL_BOOK_IDS} books")
    if not book_ids:
        return {"updated": 0, "missing": 0, "missing_ids": [], "fingerprint": get_criteria_fingerprint(settings)}

    fingerprint = get_criteria_fingerprint(settings)
    books = _load_books_by_ids(book_ids)
    loaded_book_ids = {int(book.id) for book in books}
    updated = 0
    for book in books:
        parts = build_book_key_parts(book, settings)
        duplicate_key = _hash_json(_enabled_key_values(parts, settings))
        existing = ub.session.query(ub.DuplicateBookKey).filter(ub.DuplicateBookKey.book_id == book.id).first()
        if existing:
            existing.normalized_title = parts.normalized_title
            existing.normalized_author = parts.normalized_author
            existing.normalized_language = parts.normalized_language
            existing.normalized_series = parts.normalized_series
            existing.normalized_publisher = parts.normalized_publisher
            existing.format_signature = parts.format_signature
            existing.duplicate_key = duplicate_key
            existing.criteria_fingerprint = fingerprint
            existing.updated_at = datetime.now()
        else:
            ub.session.add(
                ub.DuplicateBookKey(
                    book_id=book.id,
                    normalized_title=parts.normalized_title,
                    normalized_author=parts.normalized_author,
                    normalized_language=parts.normalized_language,
                    normalized_series=parts.normalized_series,
                    normalized_publisher=parts.normalized_publisher,
                    format_signature=parts.format_signature,
                    duplicate_key=duplicate_key,
                    criteria_fingerprint=fingerprint,
                )
            )
        updated += 1
    try:
        ub.session.commit()
    except Exception:
        ub.session.rollback()
        raise
    missing_ids = sorted(book_ids - loaded_book_ids)
    return {"updated": updated, "missing": len(missing_ids), "missing_ids": missing_ids, "fingerprint": fingerprint}


def delete_book_keys(book_ids: Iterable[int]):
    book_ids = {int(book_id) for book_id in book_ids if book_id is not None}
    if not book_ids:
        return 0
    deleted = ub.session.query(ub.DuplicateBookKey).filter(ub.DuplicateBookKey.book_id.in_(list(book_ids))).delete()
    try:
        ub.session.commit()
    except Exception:
        ub.session.rollback()
        raise
    return deleted


def rebuild_duplicate_index(settings, progress_callback=None):
    """Full index rebuild. Returns {max_book_id, indexed_count, fingerprint}."""
    fingerprint = get_criteria_fingerprint(settings)
    book_ids = sorted(_current_library_book_ids())
    total_books = len(book_ids)
    key_rows = []

    indexed_count = 0
    if progress_callback:
        progress_callback(indexed_count, total_books)
    for batch_ids in _chunks(book_ids, DUPLICATE_INDEX_REBUILD_BATCH_SIZE):
        books_by_id = {int(book.id): book for book in _load_books_by_ids(batch_ids)}
        for book_id in batch_ids:
            book = books_by_id.get(int(book_id))
            if book is None:
                continue
            parts = build_book_key_parts(book, settings)
            duplicate_key = _hash_json(_enabled_key_values(parts, settings))
            key_rows.append((book.id, *parts.as_db_tuple(), duplicate_key, fingerprint))
            indexed_count += 1
            if progress_callback and (indexed_count % 25 == 0 or indexed_count == total_books):
                progress_callback(indexed_count, total_books)

    try:
        ub.session.query(ub.DuplicateBookKey).delete()
        for row in key_rows:
            ub.session.add(
                ub.DuplicateBookKey(
                    book_id=row[0],
                    normalized_title=row[1],
                    normalized_author=row[2],
                    normalized_language=row[3],
                    normalized_series=row[4],
                    normalized_publisher=row[5],
                    format_signature=row[6],
                    duplicate_key=row[7],
                    criteria_fingerprint=row[8],
                )
            )
        ub.session.commit()
    except Exception:
        ub.session.rollback()
        raise
    return {
        "max_book_id": max(book_ids, default=0),
        "indexed_count": indexed_count,
        "fingerprint": fingerprint,
    }


def _duplicate_key_rows(settings, candidate_book_ids=None):
    fingerprint = get_criteria_fingerprint(settings)
    query = ub.session.query(
        ub.DuplicateBookKey.duplicate_key,
        func.group_concat(ub.DuplicateBookKey.book_id),
        func.count(ub.DuplicateBookKey.book_id),
    ).filter(ub.DuplicateBookKey.criteria_fingerprint == fingerprint)

    if candidate_book_ids is not None:
        candidate_book_ids = {int(book_id) for book_id in candidate_book_ids if book_id is not None}
        if not candidate_book_ids:
            return []
        query = query.filter(
            ub.DuplicateBookKey.duplicate_key.in_(
                ub.session.query(ub.DuplicateBookKey.duplicate_key)
                .filter(ub.DuplicateBookKey.criteria_fingerprint == fingerprint)
                .filter(ub.DuplicateBookKey.book_id.in_(list(candidate_book_ids)))
            )
        )
    query = query.group_by(ub.DuplicateBookKey.duplicate_key).having(func.count(ub.DuplicateBookKey.book_id) > 1)
    return query.all()


def get_duplicate_book_ids(settings, book_ids=None):
    """Return the set of book ids that currently share a duplicate key with at
    least one other book (index-based).

    When ``book_ids`` is given, only duplicate keys intersecting those ids are
    loaded (safe prefilter for the webhook/check endpoint). Returns an empty
    set when duplicate detection is disabled or the index has not been built.
    """
    if not _setting_enabled(settings, "duplicate_detection_enabled", 1):
        return set()
    duplicate_ids = set()
    for _duplicate_key, book_ids_str, _count in _duplicate_key_rows(settings, candidate_book_ids=book_ids):
        for entry in (book_ids_str or "").split(","):
            if entry:
                duplicate_ids.add(int(entry))
    return duplicate_ids


def _indexed_group_book_ids_for_books(settings, book_ids):
    book_ids = {int(book_id) for book_id in book_ids if book_id is not None}
    if not book_ids:
        return set()
    fingerprint = get_criteria_fingerprint(settings)
    sub = (
        ub.session.query(ub.DuplicateBookKey.duplicate_key)
        .filter(ub.DuplicateBookKey.criteria_fingerprint == fingerprint)
        .filter(ub.DuplicateBookKey.book_id.in_(list(book_ids)))
    )
    rows = (
        ub.session.query(func.group_concat(ub.DuplicateBookKey.book_id))
        .filter(ub.DuplicateBookKey.criteria_fingerprint == fingerprint)
        .filter(ub.DuplicateBookKey.duplicate_key.in_(sub))
        .group_by(ub.DuplicateBookKey.duplicate_key)
        .all()
    )
    affected_ids = set()
    for (book_ids_str,) in rows:
        if book_ids_str:
            affected_ids.update(int(book_id) for book_id in book_ids_str.split(",") if book_id)
    return affected_ids


def _decorate_books_for_group(books):
    for book in books:
        if not hasattr(book, "ordered_authors") or not book.ordered_authors:
            book.ordered_authors = calibre_db.order_authors([book])
        if book.ordered_authors and len(book.ordered_authors) > 0:
            book.author_names = ", ".join(
                [author.name.replace("|", ",") for author in book.ordered_authors if author.name]
            )
        else:
            book.author_names = "Unknown"
        book.cover_url = f"/cover/{book.id}" if getattr(book, "has_cover", None) else "/static/generic_cover.svg"


def _group_from_books(books):
    books.sort(key=lambda book: _timestamp_or_default(book.timestamp, _AWARE_MIN), reverse=True)
    _decorate_books_for_group(books)
    display_title = books[0].title or "Untitled"
    display_author = "Unknown"
    if hasattr(books[0], "author_names") and books[0].author_names:
        display_author = books[0].author_names.split(",")[0].strip()
    return {
        "title": display_title,
        "author": display_author,
        "count": len(books),
        "books": books,
        "group_hash": generate_group_hash(display_title, display_author),
    }


def get_duplicate_groups_from_index(settings, include_dismissed=False, user_id=None, candidate_book_ids=None):
    duplicate_groups = []
    for _duplicate_key, book_ids_str, _count in _duplicate_key_rows(settings, candidate_book_ids=candidate_book_ids):
        book_ids = [int(book_id) for book_id in book_ids_str.split(",") if book_id]
        books = _load_books_by_ids(book_ids, user_id=user_id)
        if len(books) < 2:
            continue
        duplicate_groups.append(_group_from_books(books))

    duplicate_groups.sort(key=lambda group: (group["title"].lower(), group["author"].lower()))
    if not include_dismissed:
        duplicate_groups = filter_dismissed_groups(duplicate_groups, user_id=user_id)
    return duplicate_groups


def filter_dismissed_groups(duplicate_groups, user_id=None):
    """Filter dismissed duplicate groups for a given user."""
    if not duplicate_groups:
        return []
    if not user_id:
        return duplicate_groups
    try:
        dismissed_hashes = {
            row[0]
            for row in ub.session.query(ub.DismissedDuplicateGroup.group_hash)
            .filter(ub.DismissedDuplicateGroup.user_id == int(user_id))
            .all()
        }
    except Exception as e:
        log.error("[duplicates] Error filtering dismissed groups: %s", str(e))
        return duplicate_groups
    if not dismissed_hashes:
        return duplicate_groups
    return [group for group in duplicate_groups if group.get("group_hash") not in dismissed_hashes]


# ---------------------------------------------------------------------------
# Cache management
# ---------------------------------------------------------------------------
def _cached_group_book_ids(group):
    if "book_ids" in group:
        return {int(book_id) for book_id in group.get("book_ids", [])}
    return {int(book.id) for book in group.get("books", [])}


def _serialize_group_for_cache(group):
    if "book_ids" in group:
        book_ids = [int(book_id) for book_id in group.get("book_ids", [])]
    else:
        book_ids = [book.id for book in group.get("books", [])]
    return {
        "title": group.get("title", ""),
        "author": group.get("author", ""),
        "count": group.get("count", 0),
        "group_hash": group.get("group_hash", ""),
        "book_ids": book_ids,
    }


def get_duplicate_cache():
    cache = ub.session.query(ub.DuplicateIndexCache).filter(ub.DuplicateIndexCache.id == 1).first()
    if cache is None:
        return {}
    return {
        "scan_timestamp": cache.scan_timestamp,
        "duplicate_groups": cache.duplicate_groups_json or [],
        "total_count": cache.total_count or 0,
        "scan_pending": cache.scan_pending,
        "last_scanned_book_id": cache.last_scanned_book_id or 0,
        "scan_duration_seconds": cache.scan_duration_seconds or 0.0,
        "scan_method_used": cache.scan_method_used or "",
        "criteria_fingerprint": cache.criteria_fingerprint or "",
        "max_book_id": cache.max_book_id or 0,
    }


def _write_duplicate_cache_groups(duplicate_groups, max_book_id, duration=0.0, scan_method=""):
    cache = ub.session.query(ub.DuplicateIndexCache).filter(ub.DuplicateIndexCache.id == 1).first()
    serialized_groups = [_serialize_group_for_cache(group) for group in duplicate_groups]
    if cache is None:
        cache = ub.DuplicateIndexCache(id=1)
        ub.session.add(cache)
    cache.scan_timestamp = datetime.now()
    cache.duplicate_groups_json = serialized_groups
    cache.total_count = len(serialized_groups)
    cache.scan_pending = False
    cache.last_scanned_book_id = max_book_id
    cache.max_book_id = max_book_id
    cache.scan_duration_seconds = duration
    cache.scan_method_used = scan_method
    ub.session.commit()


def update_duplicate_cache(duplicate_groups, total_count, max_book_id=None, duration=0.0, scan_method=""):
    _write_duplicate_cache_groups(
        duplicate_groups,
        max_book_id if max_book_id is not None else _current_max_book_id(),
        duration=duration,
        scan_method=scan_method,
    )
    return True


def merge_affected_groups_into_cache(candidate_book_ids, settings):
    """Incremental update: index the candidate books, refresh only affected groups."""
    candidate_book_ids = {int(book_id) for book_id in candidate_book_ids if book_id is not None}
    if len(candidate_book_ids) > MAX_INCREMENTAL_BOOK_IDS:
        mark_duplicate_index_pending("incremental candidate set too large")
        return {"updated": False, "pending": True, "reason": "candidate set too large"}
    if not candidate_book_ids:
        return {"updated": False, "pending": False, "merged_count": 0}

    affected_ids = set(candidate_book_ids)
    affected_ids.update(_indexed_group_book_ids_for_books(settings, candidate_book_ids))

    upsert_result = upsert_book_keys(candidate_book_ids, settings)
    missing_ids = upsert_result.get("missing_ids", [])
    if missing_ids:
        delete_book_keys(missing_ids)
    for _duplicate_key, book_ids_str, _count in _duplicate_key_rows(settings, candidate_book_ids=candidate_book_ids):
        affected_ids.update(int(book_id) for book_id in book_ids_str.split(",") if book_id)

    cached_groups = get_duplicate_cache().get("duplicate_groups", []) or []
    retained_groups = [group for group in cached_groups if not (_cached_group_book_ids(group) & affected_ids)]
    fresh_groups = get_duplicate_groups_from_index(settings, include_dismissed=True, candidate_book_ids=affected_ids)
    merged_groups = retained_groups + fresh_groups
    merged_groups.sort(key=lambda group: (group["title"].lower(), group["author"].lower()))
    _write_duplicate_cache_groups(merged_groups, _current_max_book_id())
    return {"updated": True, "pending": False, "merged_count": len(merged_groups)}


def mark_duplicate_index_pending(reason=None):
    cache = ub.session.query(ub.DuplicateIndexCache).filter(ub.DuplicateIndexCache.id == 1).first()
    if cache is None:
        cache = ub.DuplicateIndexCache(id=1)
        ub.session.add(cache)
    cache.scan_pending = True
    ub.session.commit()
    if reason:
        log.info("[duplicates] Duplicate index marked pending: %s", reason)
    return True


def _bump_scan_watermark(max_book_id):
    """Advance the incremental-scan watermark without re-running any detection."""
    cache = ub.session.query(ub.DuplicateIndexCache).filter(ub.DuplicateIndexCache.id == 1).first()
    if cache is None:
        cache = ub.DuplicateIndexCache(id=1)
        ub.session.add(cache)
    cache.last_scanned_book_id = max_book_id
    cache.scan_pending = False
    cache.scan_timestamp = datetime.now()
    ub.session.commit()


def notify_book_changed(book_ids):
    """Post-ingest hook: mark the index pending and queue an incremental scan.

    Called after books are added, edited or deleted so the duplicate index
    catches up without blocking the request.
    """
    book_ids = [int(book_id) for book_id in (book_ids or []) if book_id is not None]
    if not book_ids:
        return
    mark_duplicate_index_pending("book changed")
    try:
        from cps.services.worker import WorkerThread
        from cps.tasks.duplicate_scan import TaskDuplicateScan

        task = TaskDuplicateScan(full_scan=False, trigger_type="auto", book_ids=book_ids)
        WorkerThread.add("System", task, hidden=True)
    except Exception as ex:
        log.debug("[duplicates] Could not queue incremental scan: %s", str(ex))


def has_valid_duplicate_index_baseline(settings, candidate_book_ids=None):
    cache_data = get_duplicate_cache()

    candidate_ids = {int(book_id) for book_id in candidate_book_ids or [] if book_id is not None}
    library_book_ids = _current_library_book_ids()
    if not library_book_ids:
        return True

    # A fresh library can build its initial duplicate index incrementally when
    # the candidate set covers every current book.
    if not cache_data or "criteria_fingerprint" not in cache_data:
        return bool(candidate_ids) and library_book_ids.issubset(candidate_ids)

    if cache_data.get("scan_pending") and not candidate_ids:
        return False

    if library_book_ids and int(cache_data.get("last_scanned_book_id") or 0) <= 0:
        return bool(candidate_ids) and library_book_ids.issubset(candidate_ids)

    fingerprint = get_criteria_fingerprint(settings)
    indexed_book_ids = {
        row[0]
        for row in ub.session.query(ub.DuplicateBookKey.book_id)
        .filter(ub.DuplicateBookKey.criteria_fingerprint == fingerprint)
        .all()
    }
    missing_book_ids = library_book_ids - indexed_book_ids
    if not missing_book_ids:
        return True

    return missing_book_ids.issubset(candidate_ids)


def duplicate_index_needs_manual_full_scan(settings):
    """True only when the UI should ask for a manual full scan."""
    cache_data = get_duplicate_cache()
    if not cache_data:
        return library_has_books()

    library_book_ids = _current_library_book_ids()
    if not library_book_ids:
        return False

    last_scanned_book_id = int(cache_data.get("last_scanned_book_id") or 0)
    if last_scanned_book_id <= 0:
        return True

    fingerprint = get_criteria_fingerprint(settings)
    indexed_book_ids = {
        row[0]
        for row in ub.session.query(ub.DuplicateBookKey.book_id)
        .filter(ub.DuplicateBookKey.criteria_fingerprint == fingerprint)
        .all()
    }
    missing_book_ids = library_book_ids - indexed_book_ids
    if not missing_book_ids:
        return False

    missing_existing_books = {book_id for book_id in missing_book_ids if book_id <= last_scanned_book_id}
    if missing_existing_books:
        return True

    return True


def get_next_duplicate_scan_run():
    """Compute the next scheduled scan run time based on settings, or None."""
    settings = settings_to_dict()
    try:
        enabled = bool(settings.get("duplicate_scan_enabled", 0))
        cron_expr = (settings.get("duplicate_scan_cron") or "").strip()
        if not enabled or not cron_expr:
            return None
        from apscheduler.triggers.cron import CronTrigger

        now = datetime.now().astimezone()
        trigger = CronTrigger.from_crontab(cron_expr, timezone=now.tzinfo)
        next_run = trigger.get_next_fire_time(None, now)
        return next_run.isoformat() if next_run else None
    except Exception:
        return None


def get_resolution_cooldown_timestamp():
    """Timestamp of the last automatic resolution, if any."""
    from datetime import UTC

    entry = (
        ub.session.query(ub.AuditLog)
        .filter(ub.AuditLog.action == "duplicate_auto_resolution")
        .filter(ub.AuditLog.details.like('%"trigger_type": "automatic"%'))
        .order_by(ub.AuditLog.created.desc())
        .first()
    )
    if entry and entry.created:
        try:
            return entry.created.replace(tzinfo=UTC)
        except Exception:
            return entry.created
    return None


def format_priority_from_settings(settings=None):
    """Return the configured format priority dict (defaults when unset)."""
    if settings is None:
        settings = settings_to_dict()
    try:
        priority = json.loads(settings.get("duplicate_format_priority") or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        priority = {}
    merged = dict(DEFAULT_FORMAT_PRIORITY)
    merged.update(priority)
    return merged


def select_format_best_score(book, priority):
    """Score a book by the best-scoring format it owns."""
    if not getattr(book, "data", None):
        return 0
    scores = []
    for data in book.data:
        if not data.format:
            continue
        fmt = data.format.upper().strip()
        scores.append(int(priority.get(fmt, priority.get("OTHER", 10))))
    return max(scores) if scores else 0


def book_metadata_field_count(book):
    """Number of non-empty metadata fields, used by the 'most_metadata' strategy."""
    count = 0
    for attr in ("title", "author_sort", "comments", "publisher", "isbn", "series_index", "pubdate"):
        if attr == "comments":
            if getattr(book, "comments", None):
                count += 1
        elif getattr(book, attr, None):
            count += 1
    if getattr(book, "tags", None):
        count += len(book.tags)
    if getattr(book, "languages", None):
        count += len(book.languages)
    return count


def book_total_file_size(book):
    total = 0
    if getattr(book, "data", None):
        for data in book.data:
            with contextlib.suppress(TypeError, ValueError):
                total += int(data.uncompressed_size or 0)
    return total


def get_unresolved_duplicate_count(user_id=None):
    """Number of unresolved (non-dismissed) duplicate groups for a user."""
    try:
        settings = settings_to_dict()
        groups = get_duplicate_groups_from_index(settings, include_dismissed=False, user_id=user_id)
        return len(groups)
    except Exception as e:
        log.error("[duplicates] Error counting unresolved duplicates: %s", str(e))
        return 0
