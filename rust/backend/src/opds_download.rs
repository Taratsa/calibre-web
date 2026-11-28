//! `GET /opds/download/<id>/<format>/`: the anonymous OPDS acquisition link. Port of `opds_download_link` +
//! `get_download_link(count=True)` + `do_download_file` (`cps/opds.py`, `cps/helper.py`) for the guest.
//!
//! Unlike `/download` it does not redirect: it streams the book itself, as a fresh `calibredb export` when metadata
//! embedding is on (the same Calibre command Flask runs, through `export.rs`), and counts the download for user 0.
//! Everything that needs an identity (cookies, `Authorization`, reverse-proxy login, a library that is not open to the
//! guest, a guest without the download role), Kobo clients, `kepub`, Google Drive, any 404 and any error is proxied to
//! Flask unchanged. A request is counted only once Rust has a successful response, so a proxied one is never counted
//! twice.
//!
//! Known differences from Flask: no `Set-Cookie` (Flask opens an anonymous session for the guest; an OPDS client has no
//! use for it) and an opaque `ETag` (werkzeug's includes the random staged file name of an export, so it never matched
//! between two requests anyway).

use crate::download::{increment, track};
use crate::{AppState, export, filename, library, mime, proxy};
use axum::Router;
use axum::body::Body;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderValue, Method, Request, StatusCode, header};
use axum::response::Response;
use axum::routing::get;
use chrono::Utc;
use std::path::PathBuf;
use std::sync::Arc;
use tower::ServiceExt;
use tower_http::services::ServeFile;

const ROLE_DOWNLOAD: i64 = 1 << 1;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route(
        "/opds/download/{book_id}/{book_format}/",
        get(handle).head(handle),
    )
}

async fn handle(
    State(state): State<Arc<AppState>>,
    Path((book_id, book_format)): Path<(String, String)>,
    OriginalUri(uri): OriginalUri,
    request: Request<Body>,
) -> Response {
    let method = request.method().clone();
    let headers = request.headers().clone();
    let request_path = uri
        .path_and_query()
        .map_or_else(|| uri.path().to_owned(), |v| v.as_str().to_owned());
    let flask = |state: Arc<AppState>, method: Method, headers: HeaderMap| {
        let path = request_path.clone();
        async move { proxy::fallback_reconstructed(state, &path, method, headers).await }
    };

    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("opds download settings unavailable: {error}");
            return flask(state, method, headers).await;
        }
    };
    // The route takes the id as text; only plain digits are a book id Rust can look up the same way.
    let Some(book_id) = Some(book_id.as_str())
        .filter(|v| !v.is_empty() && v.bytes().all(|b| b.is_ascii_digit()))
        .and_then(|v| v.parse::<i64>().ok())
    else {
        return flask(state, method, headers).await;
    };
    // `"Kobo" in request.headers.get("User-Agent")` raises without a User-Agent (HTTP 500); Kobo changes the file name.
    let Some(user_agent) = headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
    else {
        return flask(state, method, headers).await;
    };
    if headers.contains_key(header::COOKIE)
        || headers.contains_key(header::AUTHORIZATION)
        || settings.reverse_proxy_login
        || !settings.anonymous_browse
        || settings.use_google_drive
        || settings.restricted_column != 0
        || settings.guest_role & ROLE_DOWNLOAD == 0
        || user_agent.contains("Kobo")
    {
        return flask(state, method, headers).await;
    }

    // `book_format.lower()`, then `book_format.split(".")[0]`
    let book_format = book_format
        .to_lowercase()
        .split('.')
        .next()
        .unwrap_or("")
        .to_owned();
    if book_format == "kepub" || book_format.is_empty() {
        return flask(state, method, headers).await;
    }
    let metadata_db = settings.metadata_db();
    let (language, denied, allowed) = (
        settings.guest_language.clone(),
        settings.guest_denied_tags.clone(),
        settings.guest_allowed_tags.clone(),
    );
    let lookup_format = book_format.clone();
    let found = tokio::task::spawn_blocking(move || {
        library::find_visible_format(
            &metadata_db,
            book_id,
            &lookup_format,
            &language,
            &denied,
            &allowed,
        )
    })
    .await;
    let record = match found {
        Ok(Ok(Some(record))) => record,
        Ok(Ok(None)) => return flask(state, method, headers).await,
        Ok(Err(error)) => {
            tracing::error!("opds download metadata query failed: {error}");
            return flask(state, method, headers).await;
        }
        Err(error) => {
            tracing::error!("opds download metadata task failed: {error}");
            return flask(state, method, headers).await;
        }
    };
    let disk = settings
        .book_path()
        .join(&record.book_path)
        .join(format!("{}.{book_format}", record.name));
    if !disk.is_file() {
        return flask(state, method, headers).await;
    }
    let Some(disposition) = filename::content_disposition(
        record.title.as_deref(),
        record.first_author.as_deref(),
        &book_format,
        settings.unicode_filename,
    ) else {
        return flask(state, method, headers).await;
    };

    // With embedded metadata the file is a fresh export of the book, as in `do_download_file`.
    let mut staged = None;
    let mut path: PathBuf = disk;
    if settings.embed_metadata
        && let Some(dir) = settings.binaries_dir.as_deref()
    {
        let calibredb = std::path::Path::new(dir).join("calibredb");
        let permit = state
            .exports
            .acquire()
            .await
            .expect("the export semaphore is never closed");
        let metadata_db = settings.calibre_split.then(|| settings.metadata_db());
        match export::export(export::Request {
            calibredb: &calibredb,
            library: settings.book_path(),
            metadata_db: metadata_db.as_deref(),
            book_id,
            book_format: &book_format,
        })
        .await
        {
            export::Outcome::Staged(file) => {
                path = file.path.clone();
                staged = Some(file);
            }
            // The library stays locked: the stored file is not an export, so let Flask (which waits too) answer.
            export::Outcome::Busy => {
                drop(permit);
                return flask(state, method, headers).await;
            }
            // Flask serves the stored file when an export fails for another reason.
            export::Outcome::Failed => {}
        }
        drop(permit);
    }

    let mut response = match ServeFile::new(&path).oneshot(request).await {
        Ok(response) => response.map(Body::new),
        Err(error) => match error {},
    };
    // The open handle outlives the unlink, so the staged copy can go as soon as the response exists.
    if let Some(staged) = staged {
        staged.remove();
    }
    let status = response.status();
    if !(status.is_success() || status == StatusCode::NOT_MODIFIED) {
        // 416 and the like are Flask's rendered error pages.
        return flask(state, method, headers).await;
    }

    let out = response.headers_mut();
    out.insert(header::VARY, HeaderValue::from_static("Cookie"));
    out.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    if status != StatusCode::NOT_MODIFIED {
        out.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static(mime::for_format(&book_format)),
        );
    }
    if let Ok(value) = HeaderValue::from_str(&disposition) {
        out.insert(header::CONTENT_DISPOSITION, value);
    }

    // Counted when the response is built, before it streams (`ub.update_download` in `do_download_file`).
    let counter_db = state.app_db.clone();
    match tokio::task::spawn_blocking(move || increment(&counter_db, book_id, 0, Utc::now())).await
    {
        Ok(Ok(())) => {}
        Ok(Err(error)) => {
            tracing::warn!("Unable to increment download counter for book {book_id}: {error}")
        }
        Err(error) => tracing::warn!("download counter task failed: {error}"),
    }
    track(
        &state,
        &settings.guest_name,
        &record.name,
        &book_format,
        &uri,
        &headers,
    );
    response
}
