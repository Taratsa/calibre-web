//! Fast path for `/cover/<id>[/<resolution>]` and `/cover_thumb/<id>[/<resolution>]`.
//! Existing cached files are served directly; missing or unsupported cases proxy to Flask so its
//! placeholder, Google Drive and full image pipeline remain the fallback during the strangler rewrite.

use crate::{AppState, accept, proxy};
use axum::Router;
use axum::body::Body;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, Uri, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use rusqlite::OptionalExtension;
use sha2::{Digest, Sha256};
use std::path::Path as FsPath;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio_util::io::ReaderStream;

const THUMBNAIL_SMALL: u8 = 1;
const THUMBNAIL_MEDIUM: u8 = 2;
const THUMBNAIL_LARGE: u8 = 4;
fn resolution(value: Option<&str>, route: CoverRoute) -> Option<u8> {
    match (route, value) {
        (_, Some("og")) => None,
        (_, Some("sm")) => Some(THUMBNAIL_SMALL),
        (_, Some("md")) => Some(THUMBNAIL_MEDIUM),
        (_, Some("lg")) => Some(THUMBNAIL_LARGE),
        (CoverRoute::Thumbnail, _) => Some(THUMBNAIL_SMALL),
        (CoverRoute::Cover, _) => None,
    }
}

#[derive(Debug, Clone, Copy)]
enum CoverRoute {
    Cover,
    Thumbnail,
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/cover/{book_id}", get(cover_basic).head(cover_basic))
        .route(
            "/cover/{book_id}/{resolution}",
            get(cover_resolved).head(cover_resolved),
        )
        .route("/cover_thumb/{book_id}", get(thumb_basic).head(thumb_basic))
        .route(
            "/cover_thumb/{book_id}/{resolution}",
            get(thumb_resolved).head(thumb_resolved),
        )
        .route(
            "/series_cover/{series_id}",
            get(series_basic).head(series_basic),
        )
        .route(
            "/series_cover/{series_id}/{resolution}",
            get(series_resolved).head(series_resolved),
        )
}

async fn cover_basic(
    state: State<Arc<AppState>>,
    Path(book_id): Path<i64>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(
        state.0,
        Subject::Book(book_id),
        None,
        CoverRoute::Cover,
        uri.0,
        method,
        headers,
    )
    .await
}

async fn cover_resolved(
    state: State<Arc<AppState>>,
    Path((book_id, resolution)): Path<(i64, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(
        state.0,
        Subject::Book(book_id),
        Some(resolution),
        CoverRoute::Cover,
        uri.0,
        method,
        headers,
    )
    .await
}

async fn thumb_basic(
    state: State<Arc<AppState>>,
    Path(book_id): Path<i64>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(
        state.0,
        Subject::Book(book_id),
        None,
        CoverRoute::Thumbnail,
        uri.0,
        method,
        headers,
    )
    .await
}

async fn thumb_resolved(
    state: State<Arc<AppState>>,
    Path((book_id, resolution)): Path<(i64, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(
        state.0,
        Subject::Book(book_id),
        Some(resolution),
        CoverRoute::Thumbnail,
        uri.0,
        method,
        headers,
    )
    .await
}

async fn series_basic(
    state: State<Arc<AppState>>,
    Path(series_id): Path<i64>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(
        state.0,
        Subject::Series(series_id),
        None,
        CoverRoute::Cover,
        uri.0,
        method,
        headers,
    )
    .await
}

async fn series_resolved(
    state: State<Arc<AppState>>,
    Path((series_id, resolution)): Path<(i64, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(
        state.0,
        Subject::Series(series_id),
        Some(resolution),
        CoverRoute::Cover,
        uri.0,
        method,
        headers,
    )
    .await
}

/// What the URL names: a book, or a series (whose cover is its first book's).
#[derive(Debug, Clone, Copy)]
enum Subject {
    Book(i64),
    Series(i64),
}

async fn handle(
    state: Arc<AppState>,
    subject: Subject,
    requested_resolution: Option<String>,
    route: CoverRoute,
    uri: Uri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let request_path = uri
        .path_and_query()
        .map_or_else(|| uri.path().to_owned(), |v| v.as_str().to_owned());
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("cover settings unavailable: {error}");
            return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
        }
    };
    // Preserve Flask's session ACLs. Only anonymous, unfiltered browsing takes the Rust fast path.
    if headers.contains_key(header::COOKIE)
        || headers.contains_key(header::AUTHORIZATION)
        || settings.reverse_proxy_login
        || (matches!(route, CoverRoute::Cover) && !settings.anonymous_browse)
        || settings.use_google_drive
        || settings.restricted_column != 0
        || (matches!(subject, Subject::Series(_)) && settings.series_thumbnails)
    {
        return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
    }
    let metadata_db = settings.metadata_db();
    let language = settings.guest_language.clone();
    let denied = settings.guest_denied_tags.clone();
    let allowed = settings.guest_allowed_tags.clone();
    let found = tokio::task::spawn_blocking(move || match subject {
        Subject::Book(book_id) => {
            find_visible_cover(&metadata_db, book_id, &language, &denied, &allowed)
        }
        Subject::Series(series_id) => find_series_cover(&metadata_db, series_id),
    })
    .await;
    let book = match found {
        Ok(Ok(Some(book))) => book,
        Ok(Ok(None)) => return generic_cover(&state, route, &method, &headers).await,
        Ok(Err(error)) => {
            tracing::error!("cover metadata query failed: {error}");
            return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
        }
        Err(error) => {
            tracing::error!("cover metadata task failed: {error}");
            return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
        }
    };
    let accept_webp =
        accept::accepts_webp(headers.get(header::ACCEPT).and_then(|v| v.to_str().ok()));
    let selected = resolution(requested_resolution.as_deref(), route);
    let book_dir = settings.book_path().join(&book.path);
    let cover_jpg = book_dir.join("cover.jpg");
    // Flask's `get_cover_on_failure`: no cover flag, or the file is gone. The card is rendered by Flask, which also keeps
    // it under `cache/placeholders`; Rust only serves a card that is already there.
    if !book.has_cover || !cover_jpg.is_file() {
        let fmt = if accept_webp { "webp" } else { "jpeg" };
        if let Some(response) = placeholder_card(&state, &book, selected, fmt, route, &method).await
        {
            return response;
        }
        return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
    }
    if let Some(resolution) = selected {
        let stem = format!("cover_{}_r{resolution}", book.id);
        let extension = if accept_webp { "webp" } else { "jpg" };
        let image_path = state
            .cache_directory
            .join("thumbnails")
            .join(format!("{stem}.{extension}"));
        if image_path.is_file() {
            return send_image(
                &image_path,
                &format!("{stem}.{extension}"),
                route,
                false,
                &method,
                &headers,
            )
            .await;
        }
        // Flask generates missing thumbnails and placeholder cards; its response also fills the shared cache.
        return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
    }
    let cover_webp = book_dir.join("cover.webp");
    if accept_webp && cover_webp.is_file() {
        return send_image(&cover_webp, "cover.webp", route, true, &method, &headers).await;
    }
    // Flask's converter creates WebP when no prebuilt copy exists.
    if accept_webp {
        return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
    }
    send_image(&cover_jpg, "cover.jpg", route, false, &method, &headers).await
}

#[derive(Debug)]
struct Cover {
    id: i64,
    path: String,
    has_cover: bool,
    /// `books.title` (Flask renders `book.title or ""`), read only for generated placeholder cards.
    title: String,
    /// The first publisher *as Flask's ORM returns it* (`book.publishers[0]`), or "".
    publisher: String,
}

fn find_visible_cover(
    metadata_db: &FsPath,
    book_id: i64,
    language: &str,
    denied: &str,
    allowed: &str,
) -> rusqlite::Result<Option<Cover>> {
    let conn = crate::settings::open_read_only(metadata_db)?;
    let (filter, extra) = crate::library::visibility_clause(language, denied, allowed);
    let sql = format!("{} WHERE b.id = ?1{filter}", COVER_SELECT);
    let mut values = vec![rusqlite::types::Value::Integer(book_id)];
    values.extend(extra);
    conn.query_row(&sql, rusqlite::params_from_iter(values), cover_row)
        .optional()
}

/// `get_series_thumbnail_on_failure`: the first book of the series that has a cover. Flask applies NO visibility
/// filter here (and no `ORDER BY`: SQLite walks `books_series_link_aidx`, i.e. the lowest link row first).
fn find_series_cover(metadata_db: &FsPath, series_id: i64) -> rusqlite::Result<Option<Cover>> {
    let conn = crate::settings::open_read_only(metadata_db)?;
    conn.query_row(
        "SELECT b.id, b.path, b.has_cover, COALESCE(b.title, ''),
                COALESCE((SELECT p.name FROM books_publishers_link pl JOIN publishers p ON p.id = pl.publisher
                          WHERE pl.book = b.id ORDER BY pl.id LIMIT 1), '')
         FROM books_series_link l JOIN books b ON b.id = l.book
         WHERE l.series = ?1 AND b.has_cover = 1 ORDER BY l.id LIMIT 1",
        [series_id],
        cover_row,
    )
    .optional()
}

/// Columns shared by the book and series queries, in `cover_row`'s order.
const COVER_SELECT: &str = "SELECT b.id, b.path, b.has_cover, COALESCE(b.title, ''),
       COALESCE((SELECT p.name FROM books_publishers_link pl JOIN publishers p ON p.id = pl.publisher
                 WHERE pl.book = b.id ORDER BY pl.id LIMIT 1), '')
FROM books b";

fn cover_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Cover> {
    Ok(Cover {
        id: row.get(0)?,
        path: row.get(1)?,
        has_cover: row.get::<_, i64>(2)? != 0,
        title: row.get(3)?,
        publisher: row.get(4)?,
    })
}

/// `cover_placeholder.cache_name` in `cps/cover_placeholder.py`: SHA-256 of `title \0 publisher \0 height \0 fmt`, first
/// 32 hex digits and `.webp`/`.jpg`. Both sides compute it from the same database values, so Rust finds exactly the file
/// Flask rendered; if the recipe ever changes, Rust misses and proxies (Flask renders again), it never serves a wrong card.
fn placeholder_name(title: &str, publisher: &str, height: u32, fmt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{title}\0{publisher}\0{height}\0{fmt}").as_bytes());
    let digest = hex::encode(hasher.finalize());
    format!(
        "{}.{}",
        &digest[..32],
        if fmt == "webp" { "webp" } else { "jpg" }
    )
}

/// A generated card from Flask's cache. Flask answers these with a plain `make_response(bytes)`: no ETag, no
/// Last-Modified, no `Accept-Ranges`, so Range and conditional requests are ignored and every answer is 200 (this was
/// measured on the live app; see `AGENTS.md`).
async fn placeholder_card(
    state: &AppState,
    book: &Cover,
    selected: Option<u8>,
    fmt: &str,
    route: CoverRoute,
    method: &Method,
) -> Option<Response> {
    let height = selected.map_or(1020, |resolution| 255 * u32::from(resolution));
    let path = state
        .cache_directory
        .join("placeholders")
        .join(placeholder_name(&book.title, &book.publisher, height, fmt));
    let data = tokio::fs::read(&path).await.ok()?;
    let length = data.len();
    let mut response = StatusCode::OK.into_response();
    if *method != Method::HEAD {
        *response.body_mut() = Body::from(data);
    }
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(if fmt == "webp" {
            "image/webp"
        } else {
            "image/jpeg"
        }),
    );
    if let Ok(value) = HeaderValue::from_str(&length.to_string()) {
        headers.insert(header::CONTENT_LENGTH, value);
    }
    let thumbnail = matches!(route, CoverRoute::Thumbnail);
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static(if thumbnail {
            "public, max-age=604800"
        } else {
            "public, max-age=86400"
        }),
    );
    headers.insert(
        header::VARY,
        HeaderValue::from_static(if thumbnail {
            "Accept-Encoding, Cookie"
        } else {
            "Accept, Cookie"
        }),
    );
    Some(response)
}

async fn generic_cover(
    state: &AppState,
    route: CoverRoute,
    method: &Method,
    headers: &HeaderMap,
) -> Response {
    let image_path = state.static_directory.join("generic_cover.jpg");
    send_image(
        &image_path,
        "generic_cover.jpg",
        route,
        false,
        method,
        headers,
    )
    .await
}

async fn send_image(
    path: &FsPath,
    filename: &str,
    route: CoverRoute,
    existing_original_webp: bool,
    method: &Method,
    request_headers: &HeaderMap,
) -> Response {
    let metadata = match tokio::fs::metadata(path).await {
        Ok(meta) => meta,
        Err(_) => return (StatusCode::NOT_FOUND, "Not Found").into_response(),
    };
    let size = metadata.len();
    let modified = metadata.modified().ok();
    let modified_secs = modified
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
    let etag = werkzeug_etag(path, size, modified);
    if let Some(mut response) = conditional_not_modified(request_headers, &etag, modified_secs) {
        response = response_with_cover_headers(
            response,
            route,
            existing_original_webp,
            request_headers,
            filename,
            &etag,
            None,
        );
        response
            .headers_mut()
            .insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
        return response;
    }
    let precondition_failed = failed_precondition(request_headers, &etag, modified_secs).is_some();

    let range = if precondition_failed || !if_range_matches(request_headers, &etag, modified_secs) {
        None
    } else {
        parse_range(
            request_headers
                .get(header::RANGE)
                .and_then(|v| v.to_str().ok()),
            size,
        )
    };
    let (status, start, length, content_range) = match range {
        Some(Ok((start, length))) => (
            StatusCode::PARTIAL_CONTENT,
            start,
            length,
            Some(format!("bytes {start}-{}/{size}", start + length - 1)),
        ),
        Some(Err(())) => {
            let mut response = StatusCode::RANGE_NOT_SATISFIABLE.into_response();
            response.headers_mut().insert(
                header::CONTENT_RANGE,
                HeaderValue::from_str(&format!("bytes */{size}")).unwrap(),
            );
            return response_with_cover_headers(
                response,
                route,
                existing_original_webp,
                request_headers,
                filename,
                &etag,
                modified,
            );
        }
        None => (
            if precondition_failed {
                StatusCode::PRECONDITION_FAILED
            } else {
                StatusCode::OK
            },
            0,
            size,
            None,
        ),
    };
    let mut response = Response::new(Body::empty());
    *response.status_mut() = status;
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(if path.extension().is_some_and(|ext| ext == "webp") {
            "image/webp"
        } else {
            "image/jpeg"
        }),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("inline; filename={filename}")).unwrap(),
    );
    headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&length.to_string()).unwrap(),
    );
    headers.insert(header::ETAG, HeaderValue::from_str(&etag).unwrap());
    headers.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
    if let Some(time) = modified {
        headers.insert(
            header::LAST_MODIFIED,
            HeaderValue::from_str(&httpdate::fmt_http_date(time)).unwrap(),
        );
    }
    if let Some(content_range) = content_range {
        headers.insert(
            header::CONTENT_RANGE,
            HeaderValue::from_str(&content_range).unwrap(),
        );
    }
    if matches!(route, CoverRoute::Thumbnail) || existing_original_webp {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=604800"),
        );
    } else {
        headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    }
    // Flask accesses its session on all paths; /cover_thumb overwrites Vary with Accept-Encoding.
    headers.insert(
        header::VARY,
        HeaderValue::from_static(
            if matches!(route, CoverRoute::Thumbnail) || existing_original_webp {
                "Accept-Encoding, Cookie"
            } else {
                "Cookie"
            },
        ),
    );
    if *method != Method::HEAD && length > 0 {
        let mut file = match tokio::fs::File::open(path).await {
            Ok(file) => file,
            Err(_) => return (StatusCode::NOT_FOUND, "Not Found").into_response(),
        };
        if file.seek(std::io::SeekFrom::Start(start)).await.is_err() {
            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response();
        }
        let stream = ReaderStream::new(file.take(length));
        *response.body_mut() = Body::from_stream(stream);
    }
    response
}

fn response_with_cover_headers(
    mut response: Response,
    route: CoverRoute,
    original_webp: bool,
    _request: &HeaderMap,
    filename: &str,
    etag: &str,
    modified: Option<std::time::SystemTime>,
) -> Response {
    let headers = response.headers_mut();
    if !filename.is_empty() {
        headers.insert(
            header::CONTENT_DISPOSITION,
            HeaderValue::from_str(&format!("inline; filename={filename}")).unwrap(),
        );
    }
    headers.insert(header::ETAG, HeaderValue::from_str(etag).unwrap());
    if let Some(modified) = modified {
        headers.insert(
            header::LAST_MODIFIED,
            HeaderValue::from_str(&httpdate::fmt_http_date(modified)).unwrap(),
        );
    }
    if matches!(route, CoverRoute::Thumbnail) || original_webp {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=604800"),
        );
    } else {
        headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    }
    headers.insert(
        header::VARY,
        HeaderValue::from_static(if matches!(route, CoverRoute::Thumbnail) || original_webp {
            "Accept-Encoding, Cookie"
        } else {
            "Cookie"
        }),
    );
    response
}

/// werkzeug's `send_file` ETag: `"<mtime as a Python float>-<size>-<adler32 of the absolute path>"`.
pub(crate) fn werkzeug_etag(
    path: &FsPath,
    size: u64,
    modified: Option<std::time::SystemTime>,
) -> String {
    let mtime = match modified {
        Some(t) => match t.duration_since(std::time::UNIX_EPOCH) {
            Ok(d) => {
                let seconds = d.as_secs() as f64 + f64::from(d.subsec_nanos()) / 1_000_000_000.0;
                let text = seconds.to_string();
                if text.contains('.') {
                    text
                } else {
                    format!("{text}.0")
                }
            }
            Err(_) => "0.0".into(),
        },
        None => "0.0".into(),
    };
    format!(
        "\"{mtime}-{size}-{}\"",
        adler2::adler32_slice(path.to_string_lossy().as_bytes())
    )
}

fn weak_equal(a: &str, b: &str) -> bool {
    a.trim().strip_prefix("W/").unwrap_or(a.trim()) == b
}

pub(crate) fn conditional_not_modified(
    headers: &HeaderMap,
    etag: &str,
    modified: Option<u64>,
) -> Option<Response> {
    if let Some(value) = headers.get(header::IF_NONE_MATCH) {
        let value = value.to_str().ok()?;
        if value
            .split(',')
            .any(|part| part.trim() == "*" || weak_equal(part.trim(), etag))
        {
            return Some(StatusCode::NOT_MODIFIED.into_response());
        }
    } else if let (Some(since), Some(modified)) = (headers.get(header::IF_MODIFIED_SINCE), modified)
    {
        let since = httpdate::parse_http_date(since.to_str().ok()?).ok()?;
        let since = since.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs();
        if modified <= since {
            return Some(StatusCode::NOT_MODIFIED.into_response());
        }
    }
    None
}

pub(crate) fn failed_precondition(
    headers: &HeaderMap,
    etag: &str,
    modified: Option<u64>,
) -> Option<Response> {
    if let Some(value) = headers.get(header::IF_MATCH) {
        let value = value.to_str().ok()?;
        if !value
            .split(',')
            .any(|part| part.trim() == "*" || part.trim() == etag)
        {
            return Some(StatusCode::PRECONDITION_FAILED.into_response());
        }
    } else if let (Some(since), Some(modified)) =
        (headers.get(header::IF_UNMODIFIED_SINCE), modified)
    {
        let since = httpdate::parse_http_date(since.to_str().ok()?).ok()?;
        let since = since.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs();
        if modified > since {
            return Some(StatusCode::PRECONDITION_FAILED.into_response());
        }
    }
    None
}

pub(crate) fn if_range_matches(headers: &HeaderMap, etag: &str, modified: Option<u64>) -> bool {
    let Some(value) = headers.get(header::IF_RANGE).and_then(|v| v.to_str().ok()) else {
        return true;
    };
    if value.starts_with('"') {
        return value == etag;
    }
    let (Some(modified), Ok(date)) = (modified, httpdate::parse_http_date(value)) else {
        return false;
    };
    date.duration_since(std::time::UNIX_EPOCH)
        .is_ok_and(|d| d.as_secs() >= modified)
}

pub(crate) fn parse_range(value: Option<&str>, size: u64) -> Option<Result<(u64, u64), ()>> {
    let value = value?;
    let spec = value.strip_prefix("bytes=")?;
    if spec.contains(',') {
        return Some(Err(()));
    }
    let (start, end) = spec.split_once('-')?;
    let range = if start.is_empty() {
        let suffix = end.parse::<u64>().ok()?;
        if suffix == 0 || size == 0 {
            return Some(Err(()));
        }
        (size.saturating_sub(suffix), suffix.min(size))
    } else {
        let start = start.parse::<u64>().ok()?;
        if start >= size {
            return Some(Err(()));
        }
        let end = if end.is_empty() {
            size - 1
        } else {
            end.parse::<u64>().ok()?.min(size - 1)
        };
        if end < start {
            return Some(Err(()));
        }
        (start, end - start + 1)
    };
    Some(Ok(range))
}

#[cfg(test)]
mod tests {
    use super::{CoverRoute, placeholder_name, resolution};

    // Outputs of `cover_placeholder.cache_name` in the app image (Python 3.15, hashlib.sha256 of UTF-8).
    #[test]
    fn placeholder_names_match_flasks_cache_name() {
        for (title, publisher, height, fmt, expected) in [
            (
                "Café Müller",
                "",
                255,
                "webp",
                "8aff485791485db7b0c345f9e36f0e6a.webp",
            ),
            ("", "", 1020, "jpeg", "3d44a9f15096e6646def9a34cbc0f0fd.jpg"),
            (
                "Book 8",
                "",
                255,
                "jpeg",
                "bb6bed5d2ec17abca79662f075c0d965.jpg",
            ),
            (
                "Mikrotik: Setup Konfigurasi HotSpot",
                "",
                1020,
                "webp",
                "5ff174d920384876ac302a4625f76704.webp",
            ),
            (
                "Kebijakan & Privasi / Uji",
                "Penerbit Uji",
                510,
                "jpeg",
                "de78a43b2077b3c1c0604eee6b595490.jpg",
            ),
            (
                "中文 📚",
                "",
                255,
                "webp",
                "cd2881e16f8f97f5313ba70824c9939a.webp",
            ),
        ] {
            assert_eq!(
                placeholder_name(title, publisher, height, fmt),
                expected,
                "{title}/{publisher}/{height}/{fmt}"
            );
        }
    }

    #[test]
    fn flask_resolution_defaults() {
        assert_eq!(resolution(None, CoverRoute::Cover), None);
        assert_eq!(resolution(Some("og"), CoverRoute::Cover), None);
        assert_eq!(resolution(Some("sm"), CoverRoute::Cover), Some(1));
        assert_eq!(resolution(Some("md"), CoverRoute::Cover), Some(2));
        assert_eq!(resolution(Some("lg"), CoverRoute::Cover), Some(4));
        assert_eq!(resolution(Some("unknown"), CoverRoute::Cover), None);
        assert_eq!(resolution(None, CoverRoute::Thumbnail), Some(1));
        assert_eq!(resolution(Some("unknown"), CoverRoute::Thumbnail), Some(1));
        assert_eq!(resolution(Some("og"), CoverRoute::Thumbnail), None);
    }
}
