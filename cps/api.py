# -*- coding: utf-8 -*-

import re
from flask import Blueprint, jsonify, request, make_response, url_for
from flask_babel import gettext as _
from markupsafe import Markup

from .cw_login import current_user
from . import config, calibre_db, logger, uploader, helper, csrf, db
from .editbooks import file_handling_on_upload, create_book_on_upload, move_coverfile, edit_book_comments
from .helper import add_book_to_thumbnail_cache

api = Blueprint('api', __name__)
log = logger.create()


def sanitize_for_xml(text):
    if not text:
        return text
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', str(text))


def normalize_title(s):
    s = re.sub(r'[^\w\s]', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s.lower().strip()


def validate_upload_file(requested_file):
    log.debug(f"Validating file: {requested_file}")
    if not requested_file or not requested_file.filename:
        log.warning("Upload validation failed: no file or filename")
        return False, _("No file provided")
    filename = requested_file.filename.lower()
    log.debug(f"File filename: {filename}")
    if not (filename.endswith('.pdf') or filename.endswith('.epub')):
        log.warning(f"Upload validation failed: invalid extension {filename}")
        return False, _("Only PDF and EPUB files are allowed")
    log.debug("File validation passed")
    return True, None


@csrf.exempt
@api.route("/api/webhook/upload", methods=["POST"])
def api_webhook_upload():
    log.info(f"Upload API called by user: {current_user.name if current_user.is_authenticated else 'anonymous'}")
    log.debug(f"Request headers: {dict(request.headers)}")
    log.debug(f"Request files: {list(request.files.keys())}")

    if not current_user.is_authenticated:
        log.warning("Upload API rejected: not authenticated")
        return make_response(jsonify(error=_("Authentication required")), 401)

    if not current_user.role_upload():
        log.warning(f"Upload API rejected: user {current_user.name} lacks upload permission")
        return make_response(jsonify(error=_("Upload permission required")), 403)

    requested_file = request.files.get('file')
    valid, error = validate_upload_file(requested_file)
    if not valid:
        log.warning(f"Upload API rejected: {error}")
        return make_response(jsonify(error=error), 400)

    filename = requested_file.filename
    filesize = requested_file.content_length or 0
    log.info(f"Processing upload: filename={filename}, size={filesize} bytes")

    try:
        modify_date = False
        calibre_db.create_functions(config)

        log.debug("Calling file_handling_on_upload")
        meta, error = file_handling_on_upload(requested_file)
        if error:
            log.error(f"file_handling_on_upload failed: {error}")
            return make_response(jsonify(error=str(error)), 400)

        log.debug(f"Metadata extracted: title={meta.title}, author={meta.author}, "
                  f"publisher={meta.publisher}, series={meta.series}")

        log.debug("Calling create_book_on_upload")
        db_book, input_authors, title_dir = create_book_on_upload(modify_date, meta)
        log.debug(f"Book created: id={db_book.id}, title={db_book.title}, author={db_book.authors}")

        modify_date |= edit_book_comments(Markup(meta.description).unescape(), db_book)

        book_id = db_book.id
        title = db_book.title
        log.info(f"Book record created: book_id={book_id}, title={title}")

        if config.config_use_google_drive:
            from . import gdriveutils
            log.debug("Uploading to Google Drive")
            helper.upload_new_file_gdrive(book_id,
                                          input_authors[0],
                                          title,
                                          title_dir,
                                          meta.file_path,
                                          meta.extension.lower())
            for file_format in db_book.data:
                file_format.name = (helper.get_valid_filename(title, chars=42) + ' - ' +
                                   helper.get_valid_filename(input_authors[0], chars=42))
        else:
            log.debug("Updating local directory structure")
            error = helper.update_dir_structure(book_id,
                                               config.get_book_path(),
                                               input_authors[0],
                                               meta.file_path,
                                               title_dir + meta.extension.lower())
            if error:
                log.warning(f"Directory structure warning: {error}")

        log.debug("Moving cover file")
        move_coverfile(meta, db_book)
        if modify_date:
            calibre_db.set_metadata_dirty(book_id)

        log.debug("Committing to database")
        calibre_db.session.commit()
        log.info(f"Database commit successful for book_id={book_id}")

        if config.config_use_google_drive:
            log.debug("Syncing Google Drive")
            gdriveutils.updateGdriveCalibreFromLocal()

        log.debug("Adding to thumbnail cache")
        add_book_to_thumbnail_cache(book_id)

        log.info(f"Upload API success: book_id={book_id}, title={title}")
        return jsonify(
            book_id=book_id,
            title=title,
            author=meta.author,
            description=meta.description,
            publisher=meta.publisher,
            series=meta.series,
            series_id=meta.series_id,
            languages=meta.languages,
            tags=meta.tags,
            pubdate=meta.pubdate,
            url=request.host_url + url_for('web.show_book', book_id=book_id).lstrip('/')
        )
    except Exception as e:
        calibre_db.session.rollback()
        log.error_or_exception(f"API upload error: {e}")
        log.error(f"Upload failed, rolling back transaction")
        return make_response(jsonify(error=str(e)), 500)


@csrf.exempt
@api.route("/api/webhook/check", methods=["GET", "POST"])
def api_webhook_check():
    log.info(f"Check API called by user: {current_user.name if current_user.is_authenticated else 'anonymous'}")

    if not current_user.is_authenticated:
        log.warning("Check API rejected: not authenticated")
        return make_response(jsonify(error=_("Authentication required")), 401)

    title = None
    author = None

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        title = data.get('title')
        author = data.get('author')
    else:
        title = request.args.get('title')
        author = request.args.get('author')

    log.debug(f"Check request: title={title}, author={author}")

    query = calibre_db.session.query(db.Books)
    results = []

    if title:
        from sqlalchemy import or_

        STOPWORDS = {
            'dan', 'di', 'yang', 'dari', 'dalam', 'dengan', 'atau', 'ini', 'itu',
            'ke', 'de', 'si', 'the', 'and', 'of', 'in', 'to', 'a', 'is', 'are',
            'untuk', 'oleh', 'pada', 'juga', 'serta', 'bagi', 'akan',
            'dapat', 'tidak', 'ada', 'satu', 'dua', 'tiga',
        }

        clean_title = re.sub(r'[^\w\s.]', ' ', title)
        words = clean_title.split()
        words = [
            w for w in words
            if (len(w) > 2 or w.replace('.', '').isdigit() or w.isdigit())
            and w.lower() not in STOPWORDS
        ]

        if words:
            title_patterns = [db.Books.title.ilike(f"%{w}%") for w in words]
            query = query.filter(or_(*title_patterns))

        if author:
            author_pattern = f"%{author}%"
            query = query.join(db.Authors).filter(
                or_(
                    db.Authors.name.ilike(author_pattern),
                    db.Authors.sort.ilike(author_pattern)
                )
            )

        books = query.limit(10).all()
        query_norm = normalize_title(title)
        exact_match = False
        for book in books:
            book_norm = normalize_title(book.title)
            if book_norm == query_norm:
                exact_match = True
            results.append({
                "book_id": book.id,
                "title": book.title,
                "authors": [a.name for a in book.authors],
                "url": request.host_url + url_for('web.show_book', book_id=book.id).lstrip('/')
            })

    log.info(f"Check API found {len(results)} results, exact={exact_match}")
    return jsonify(
        found=len(results) > 0,
        exact_match=exact_match,
        count=len(results),
        results=results
    )