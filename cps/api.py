# -*- coding: utf-8 -*-

from flask import Blueprint, jsonify, request, make_response, url_for
from flask_babel import gettext as _
from markupsafe import Markup

from .cw_login import current_user
from . import config, calibre_db, logger, uploader, helper
from .editbooks import file_handling_on_upload, create_book_on_upload, move_coverfile, edit_book_comments
from .helper import add_book_to_thumbnail_cache

api = Blueprint('api', __name__)
log = logger.create()


def validate_upload_file(requested_file):
    if not requested_file or not requested_file.filename:
        return False, _("No file provided")
    filename = requested_file.filename.lower()
    if not (filename.endswith('.pdf') or filename.endswith('.epub')):
        return False, _("Only PDF and EPUB files are allowed")
    return True, None


@api.route("/api/webhook/upload", methods=["POST"])
def api_webhook_upload():
    if not current_user.is_authenticated:
        return make_response(jsonify(error=_("Authentication required")), 401)

    if not current_user.role_upload():
        return make_response(jsonify(error=_("Upload permission required")), 403)

    requested_file = request.files.get('file')
    valid, error = validate_upload_file(requested_file)
    if not valid:
        return make_response(jsonify(error=error), 400)

    try:
        modify_date = False
        calibre_db.create_functions(config)

        meta, error = file_handling_on_upload(requested_file)
        if error:
            return make_response(jsonify(error=str(error)), 400)

        db_book, input_authors, title_dir = create_book_on_upload(modify_date, meta)
        modify_date |= edit_book_comments(Markup(meta.description).unescape(), db_book)

        book_id = db_book.id
        title = db_book.title

        if config.config_use_google_drive:
            from . import gdriveutils
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
            error = helper.update_dir_structure(book_id,
                                               config.get_book_path(),
                                               input_authors[0],
                                               meta.file_path,
                                               title_dir + meta.extension.lower())
            if error:
                log.warning(f"Directory structure error: {error}")

        move_coverfile(meta, db_book)
        if modify_date:
            calibre_db.set_metadata_dirty(book_id)

        calibre_db.session.commit()

        if config.config_use_google_drive:
            gdriveutils.updateGdriveCalibreFromLocal()

        add_book_to_thumbnail_cache(book_id)

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
        return make_response(jsonify(error=str(e)), 500)