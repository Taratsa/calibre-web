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
    if !book.has_cover {
        return proxy::fallback_reconstructed(state, &request_path, method, headers).await;
    }
    let accept_webp =
        accept::accepts_webp(headers.get(header::ACCEPT).and_then(|v| v.to_str().ok()));
    let selected = resolution(requested_resolution.as_deref(), route);
    let book_dir = settings.book_path().join(&book.path);
    let cover_jpg = book_dir.join("cover.jpg");
    if !cover_jpg.is_file() {
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
    let sql = format!("SELECT b.id, b.path, b.has_cover FROM books b WHERE b.id = ?1{filter}");
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
        "SELECT b.id, b.path, b.has_cover FROM books_series_link l JOIN books b ON b.id = l.book
         WHERE l.series = ?1 AND b.has_cover = 1 ORDER BY l.id LIMIT 1",
        [series_id],
        cover_row,
    )
    .optional()
}

fn cover_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Cover> {
    Ok(Cover {
        id: row.get(0)?,
        path: row.get(1)?,
        has_cover: row.get::<_, i64>(2)? != 0,
    })
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
    let etag = format!(
        "\"{mtime}-{size}-{}\"",
        adler2::adler32_slice(path.to_string_lossy().as_bytes())
    );
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

fn weak_equal(a: &str, b: &str) -> bool {
    a.trim().strip_prefix("W/").unwrap_or(a.trim()) == b
}

fn conditional_not_modified(
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

fn failed_precondition(headers: &HeaderMap, etag: &str, modified: Option<u64>) -> Option<Response> {
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

fn if_range_matches(headers: &HeaderMap, etag: &str, modified: Option<u64>) -> bool {
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

fn parse_range(value: Option<&str>, size: u64) -> Option<Result<(u64, u64), ()>> {
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
    use super::{CoverRoute, resolution};

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
