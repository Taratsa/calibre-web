//! `GET /files/<id>/<format>/<version>/<sig>[/<anyname>]`: the immutable, CDN-cacheable copy of a book file.
//! Port of `get_signed_file` + `get_download_link(count=False)` in `cps/helper.py`.
//!
//! The signature is the authorization, so the response is the same for everyone and never counts a download.

use crate::{AppState, export, filename, library, mime, signing};
use axum::Router;
use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, Request, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use std::path::PathBuf;
use std::sync::Arc;
use tower::ServiceExt;
use tower_http::services::ServeFile;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/files/{book_id}/{book_format}/{version}/{sig}", get(serve))
        .route(
            "/files/{book_id}/{book_format}/{version}/{sig}/{anyname}",
            get(serve_named),
        )
}

async fn serve_named(
    state: State<Arc<AppState>>,
    Path((book_id, book_format, version, sig, _anyname)): Path<(
        i64,
        String,
        String,
        String,
        String,
    )>,
    headers: HeaderMap,
    request: Request<Body>,
) -> Response {
    serve_inner(
        state.0,
        book_id,
        book_format,
        version,
        sig,
        headers,
        request,
    )
    .await
}

async fn serve(
    state: State<Arc<AppState>>,
    Path((book_id, book_format, version, sig)): Path<(i64, String, String, String)>,
    headers: HeaderMap,
    request: Request<Body>,
) -> Response {
    serve_inner(
        state.0,
        book_id,
        book_format,
        version,
        sig,
        headers,
        request,
    )
    .await
}

/// Flask's error pages are uncacheable (`NO_CACHE_HEADERS` in `cps/error_handler.py`), so Cloudflare never keeps a
/// 404 that a later request (a replaced file, a fixed signature) should not see.
fn not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        [
            (header::CACHE_CONTROL, "no-store, no-cache, must-revalidate"),
            (
                HeaderName::from_static("cloudflare-cdn-cache-control"),
                "no-store",
            ),
            (header::PRAGMA, "no-cache"),
        ],
        "Not Found",
    )
        .into_response()
}

fn server_error(message: &str) -> Response {
    tracing::error!("{message}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        [
            (header::CACHE_CONTROL, "no-store, no-cache, must-revalidate"),
            (
                HeaderName::from_static("cloudflare-cdn-cache-control"),
                "no-store",
            ),
            (header::PRAGMA, "no-cache"),
        ],
        "Internal Server Error",
    )
        .into_response()
}

async fn serve_inner(
    state: Arc<AppState>,
    book_id: i64,
    book_format: String,
    version: String,
    sig: String,
    headers: HeaderMap,
    request: Request<Body>,
) -> Response {
    // `book_format.split(".")[0]`
    let book_format = book_format.split('.').next().unwrap_or("").to_owned();
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => return server_error(&format!("settings unavailable: {error}")),
    };
    if !signing::signature_matches(
        &state.secret(&settings),
        book_id,
        &book_format,
        &version,
        &sig,
    ) {
        return not_found();
    }

    let metadata_db = settings.metadata_db();
    let lookup_format = book_format.clone();
    let found = tokio::task::spawn_blocking(move || {
        library::find_format(&metadata_db, book_id, &lookup_format)
    })
    .await;
    let record = match found {
        Ok(Ok(Some(record))) => record,
        Ok(Ok(None)) => return not_found(),
        Ok(Err(error)) => return server_error(&format!("metadata.db query failed: {error}")),
        Err(error) => return server_error(&format!("lookup task failed: {error}")),
    };

    let current = match signing::version(record.last_modified.as_deref(), record.size) {
        Ok(current) => current,
        Err(_) => return server_error(&format!("book {book_id} has an unreadable last_modified")),
    };
    if version != current {
        // the book changed after this link was issued: go through /download for a fresh one
        return (
            StatusCode::FOUND,
            [
                (
                    header::LOCATION,
                    format!("/download/{book_id}/{book_format}"),
                ),
                (header::CACHE_CONTROL, "private, no-store".into()),
            ],
        )
            .into_response();
    }

    if settings.use_google_drive {
        // Google Drive libraries are not served from Rust; Caddy must keep them on Flask.
        return (
            StatusCode::NOT_IMPLEMENTED,
            "Google Drive libraries are served by Flask",
        )
            .into_response();
    }
    let disk = settings
        .book_path()
        .join(&record.book_path)
        .join(format!("{}.{book_format}", record.name));
    if !disk.is_file() {
        tracing::error!("File not found: {}", disk.display());
        return not_found();
    }

    // Embedded metadata: the file is re-exported with the book's current metadata written in.
    let mut staged = None;
    let mut path: PathBuf = disk.clone();
    if book_format != "kepub" && settings.embed_metadata {
        if let Some(dir) = settings.binaries_dir.as_deref() {
            let calibredb = std::path::Path::new(dir).join("calibredb");
            let _permit = state
                .exports
                .acquire()
                .await
                .expect("the export semaphore is never closed");
            let metadata_db = settings.calibre_split.then(|| settings.metadata_db());
            staged = export::export(export::Request {
                calibredb: &calibredb,
                library: settings.book_path(),
                metadata_db: metadata_db.as_deref(),
                book_id,
                book_format: &book_format,
            })
            .await;
            if let Some(staged) = &staged {
                path = staged.path.clone();
            }
        }
    } else if book_format == "kepub" && settings.embed_metadata && settings.kepubify_configured {
        return (
            StatusCode::NOT_IMPLEMENTED,
            "kepub with embedded metadata is served by Flask",
        )
            .into_response();
    }

    let host = headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost");
    let disposition = filename::content_disposition(
        record.title.as_deref(),
        record.first_author.as_deref(),
        &book_format,
        settings.unicode_filename,
    )
    // Flask raises ValueError (HTTP 500) for a book with no usable title and author; serve it under its file name.
    .or_else(|| {
        filename::content_disposition(
            Some(&record.name),
            None,
            &book_format,
            settings.unicode_filename,
        )
    });

    let mut response = match ServeFile::new(&path).oneshot(request).await {
        Ok(response) => response.map(Body::new),
        Err(error) => match error {},
    };
    // The open file handle outlives the unlink, so the staged copy can go as soon as the response exists.
    if let Some(staged) = staged {
        staged.remove();
    }

    let success = response.status().is_success();
    let out = response.headers_mut();
    if success {
        out.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static(mime::for_format(&book_format)),
        );
        if let Some(value) = disposition.and_then(|d| HeaderValue::from_str(&d).ok()) {
            out.insert(header::CONTENT_DISPOSITION, value);
        }
        out.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        );
        let canonical = format!(
            "<https://{host}/files/{book_id}/{book_format}/{version}/{}>; rel=\"canonical\"",
            signing::signature(&state.secret(&settings), book_id, &book_format, &version)
        );
        if let Ok(value) = HeaderValue::from_str(&canonical) {
            out.insert(HeaderName::from_static("link"), value);
        }
    }
    response
}
