"""Admin dashboard for newsletter clippings ("kliping"): Markdown files with YAML frontmatter."""

import os

from flask import Blueprint, Response, abort, flash, jsonify, redirect, request, url_for
from flask_babel import gettext as _

from . import logger, ub
from .admin import admin_required
from .clippings_store import (
    MAX_DOCUMENT_BYTES,
    STATUSES,
    ClippingError,
    ClippingNotFound,
    ClippingStore,
    normalize_meta,
    parse_document,
    render_markdown,
)
from .render_template import render_title_template
from .usermanagement import user_login_required

log = logger.create()

clippings = Blueprint("clippings", __name__)

PER_PAGE = 50
_stores = {}


def get_store():
    """Store rooted at ``$CLIPPINGS_DIR`` or ``<app.db dir>/clippings`` (``/config/clippings`` in Docker)."""
    root = os.environ.get("CLIPPINGS_DIR") or os.path.join(os.path.dirname(ub.app_DB_path or "."), "clippings")
    if root not in _stores:
        _stores[root] = ClippingStore(root)
    return _stores[root]


def _form_document():
    """Build ``(meta, body)`` from the editor form, validated."""
    form = request.form
    raw = {
        key: form.get(key, "")
        for key in ("title", "publication", "date", "issue", "page", "language", "source_url", "status")
    }
    raw["authors"] = form.get("authors", "")
    raw["tags"] = form.get("tags", "")
    meta, __ = normalize_meta(raw)
    body = form.get("body", "").replace("\r\n", "\n")
    return meta, body


def _editor(clipping, meta_form=None, body="", error=None, status=200):
    meta = meta_form if meta_form is not None else (clipping.meta if clipping else {})
    return (
        render_title_template(
            "plain_clipping_edit.html",
            clipping=clipping,
            meta=meta,
            body=body if meta_form is not None else (clipping.body if clipping else ""),
            error=error,
            statuses=STATUSES,
            title=_("Edit clipping") if clipping else _("New clipping"),
            page="clippings",
        ),
        status,
    )


@clippings.route("/admin/clippings")
@user_login_required
@admin_required
def list_clippings():
    summaries, broken = get_store().summaries()
    query = request.args.get("q", "").strip().lower()
    status = request.args.get("status", "")
    publication = request.args.get("publication", "")
    publications = sorted({s.meta["publication"] for s in summaries if s.meta["publication"]}, key=str.lower)
    counts = {name: sum(1 for s in summaries if s.meta["status"] == name) for name in STATUSES}

    rows = summaries
    if status in STATUSES:
        rows = [s for s in rows if s.meta["status"] == status]
    if publication:
        rows = [s for s in rows if s.meta["publication"] == publication]
    if query:
        terms = query.split()
        rows = [s for s in rows if all(term in s.haystack for term in terms)]

    page_no = max(request.args.get("page", 1, type=int), 1)
    pages = max((len(rows) + PER_PAGE - 1) // PER_PAGE, 1)
    page_no = min(page_no, pages)
    return render_title_template(
        "plain_clippings.html",
        rows=rows[(page_no - 1) * PER_PAGE : page_no * PER_PAGE],
        total=len(rows),
        all_total=len(summaries),
        counts=counts,
        broken=broken,
        publications=publications,
        q=request.args.get("q", ""),
        status=status,
        publication=publication,
        page_no=page_no,
        pages=pages,
        title=_("Clippings"),
        page="clippings",
    )


@clippings.route("/admin/clippings/new", methods=["GET", "POST"])
@user_login_required
@admin_required
def new_clipping():
    if request.method == "GET":
        return _editor(None, meta_form={"status": "draft", "authors": [], "tags": []})
    try:
        meta, body = _form_document()
        saved = get_store().create(meta, body)
    except ClippingError as ex:
        form_meta = {key: request.form.get(key, "") for key in request.form if key != "body"}
        form_meta["authors"] = request.form.get("authors", "")
        form_meta["tags"] = request.form.get("tags", "")
        return _editor(None, meta_form=form_meta, body=request.form.get("body", ""), error=str(ex), status=400)
    flash(_("Clipping saved"), category="success")
    return redirect(url_for("clippings.edit_clipping", clipping_id=saved.id))


@clippings.route("/admin/clippings/<clipping_id>", methods=["GET", "POST"])
@user_login_required
@admin_required
def edit_clipping(clipping_id):
    store = get_store()
    try:
        current = store.get(clipping_id)
    except ClippingNotFound:
        abort(404)
    except ClippingError as ex:
        flash(_("%(id)s cannot be parsed: %(error)s", id=clipping_id, error=str(ex)), category="error")
        return redirect(url_for("clippings.list_clippings"))
    if request.method == "GET":
        return _editor(current)
    try:
        meta, body = _form_document()
        saved = store.update(clipping_id, meta, body, current.extra)
    except ClippingError as ex:
        form_meta = {key: request.form.get(key, "") for key in request.form if key != "body"}
        return _editor(current, meta_form=form_meta, body=request.form.get("body", ""), error=str(ex), status=400)
    flash(_("Clipping saved"), category="success")
    return redirect(url_for("clippings.edit_clipping", clipping_id=saved.id))


@clippings.route("/admin/clippings/<clipping_id>/delete", methods=["POST"])
@user_login_required
@admin_required
def delete_clipping(clipping_id):
    try:
        get_store().delete(clipping_id)
    except ClippingNotFound:
        abort(404)
    flash(_("Clipping moved to trash"), category="success")
    return redirect(url_for("clippings.list_clippings"))


@clippings.route("/admin/clippings/<clipping_id>/raw")
@user_login_required
@admin_required
def raw_clipping(clipping_id):
    try:
        text = get_store().read_raw(clipping_id)
    except ClippingNotFound:
        abort(404)
    return Response(
        text,
        mimetype="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{clipping_id}.md"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@clippings.route("/admin/clippings/preview", methods=["POST"])
@user_login_required
@admin_required
def preview_clipping():
    return jsonify({"html": render_markdown(request.form.get("body", ""))})


@clippings.route("/admin/clippings/import", methods=["POST"])
@user_login_required
@admin_required
def import_clippings():
    """Create clippings from uploaded ``.md`` files; the frontmatter supplies the metadata."""
    created = 0
    for upload in request.files.getlist("files"):
        name = upload.filename or "file"
        try:
            data = upload.stream.read(MAX_DOCUMENT_BYTES + 1)
            if len(data) > MAX_DOCUMENT_BYTES:
                raise ClippingError(f"file is larger than {MAX_DOCUMENT_BYTES // 1024 // 1024} MiB")
            try:
                raw, body = parse_document(data.decode("utf-8"))
            except UnicodeDecodeError as ex:
                raise ClippingError("file is not UTF-8 text") from ex
            if not raw.get("title"):
                raw["title"] = os.path.splitext(os.path.basename(name))[0]
            meta, extra = normalize_meta(raw)
            get_store().create(meta, body, extra)
            created += 1
        except ClippingError as ex:
            flash(_("%(name)s: %(error)s", name=name, error=str(ex)), category="error")
    if created:
        flash(_("Imported %(n)d clipping(s)", n=created), category="success")
    elif not request.files.getlist("files"):
        flash(_("No file selected"), category="error")
    return redirect(url_for("clippings.list_clippings"))
