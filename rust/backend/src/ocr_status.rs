//! `GET /api/read/<id>/ocr/status[/<fmt>]` for the anonymous visitor, answered only when the text is already cached.
//!
//! Flask answers `{"available": true, "state": null}` as soon as the document's OCR cache file exists and is `ready`.
//! Everything else needs state Rust does not have and is proxied unchanged: an EPUB cache miss extracts the text
//! inline, a PDF miss asks the in-memory job queue (`ocr_job_state`), a non-PDF file under the PDF format raises, and
//! every 404 is Flask's own page. So this route never answers anything but the one cache-hit body, and a failed or
//! odd lookup of any kind is Flask's job.
//!
//! The cache file name is `<book id>-<sha256 of the request>.json`, where the request is
//! `json.dumps({version, book_id, format, name, size, mtime_ns, extract_version|layout_version}, sort_keys=True,
//! separators=(",", ":"))` (`cps/ocr_service._cache_details`). `build.rs` reads the version numbers from that file.

use crate::{AppState, library, proxy, pyjson};
use axum::Router;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use sha2::{Digest, Sha256};
use std::path::{Path as FsPath, PathBuf};
use std::sync::Arc;

const ROLE_VIEWER: i64 = 1 << 8;
const CACHE_VERSION: u32 = parse(env!("OCR_CACHE_VERSION"));
const EPUB_EXTRACT_VERSION: u32 = parse(env!("OCR_EPUB_EXTRACT_VERSION"));
const PDF_LAYOUT_VERSION: u32 = parse(env!("OCR_PDF_LAYOUT_VERSION"));

/// `u32::from_str` is not `const`; the numbers come from `build.rs` and are plain digits.
const fn parse(digits: &str) -> u32 {
    let bytes = digits.as_bytes();
    let mut value = 0u32;
    let mut index = 0;
    while index < bytes.len() {
        value = value * 10 + (bytes[index] - b'0') as u32;
        index += 1;
    }
    value
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/read/{book_id}/ocr/status", get(status))
        .route("/api/read/{book_id}/ocr/status/", get(status))
        .route(
            "/api/read/{book_id}/ocr/status/{format}",
            get(status_format),
        )
        .route(
            "/api/read/{book_id}/ocr/status/{format}/",
            get(status_format),
        )
}

async fn status(
    state: State<Arc<AppState>>,
    Path(book_id): Path<String>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    answer(state.0, book_id, "pdf".to_owned(), uri, method, headers).await
}

async fn status_format(
    state: State<Arc<AppState>>,
    Path((book_id, format)): Path<(String, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    answer(state.0, book_id, format, uri, method, headers).await
}

async fn answer(
    state: Arc<AppState>,
    book_id: String,
    format: String,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let path = uri
        .0
        .path_and_query()
        .map_or_else(|| uri.0.path().to_owned(), |v| v.as_str().to_owned());
    // Flask's `<int:book_id>` takes ASCII digits only, a trailing slash is a 404 there (the rule has none), and the
    // format must be `pdf` or `epub` once upper-cased (`_ocr_format`), so `PDF` is accepted too.
    let plain_digits = !book_id.is_empty() && book_id.bytes().all(|b| b.is_ascii_digit());
    let upper = format.to_ascii_uppercase();
    let (Ok(book_id), true, false, true) = (
        book_id.parse::<i64>(),
        plain_digits,
        uri.0.path().ends_with('/'),
        upper == "PDF" || upper == "EPUB",
    ) else {
        return proxy::fallback_reconstructed(state, &path, method, headers).await;
    };

    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("OCR status settings unavailable: {error}");
            return proxy::fallback_reconstructed(state, &path, method, headers).await;
        }
    };
    // Identity, reverse-proxy login, custom-column ACLs and Google Drive stay in Flask.
    if headers.contains_key(header::COOKIE)
        || headers.contains_key(header::AUTHORIZATION)
        || settings.reverse_proxy_login
        || settings.restricted_column != 0
        || settings.use_google_drive
        || !settings.anonymous_browse
    {
        return proxy::fallback_reconstructed(state, &path, method, headers).await;
    }

    // Read fresh: the guest's role and filters decide whether this book's status may be shown.
    let app_db = state.app_db.clone();
    let guest =
        tokio::task::spawn_blocking(move || crate::settings::load_guest_access(&app_db)).await;
    let guest = match guest {
        Ok(Ok(guest)) if guest.role & ROLE_VIEWER != 0 && !guest.has_archived => guest,
        _ => return proxy::fallback_reconstructed(state, &path, method, headers).await,
    };

    let metadata_db = settings.metadata_db();
    let book_path = settings.book_path().to_path_buf();
    let cache_directory = state.ocr_cache_directory.clone();
    let lookup_format = upper.clone();
    let hit = tokio::task::spawn_blocking(move || {
        let found = library::find_visible_format(
            &metadata_db,
            book_id,
            &lookup_format,
            &guest.language,
            &guest.denied,
            &guest.allowed,
        )
        .ok()
        .flatten()?;
        let file = book_path.join(&found.book_path).join(format!(
            "{}.{}",
            found.name,
            lookup_format.to_lowercase()
        ));
        // Flask raises (404) for a missing file; a stat failure here is the same case, so Flask answers it.
        let meta = std::fs::metadata(&file).ok().filter(|m| m.is_file())?;
        let key = CacheKey {
            book_id,
            format: &lookup_format,
            name: &found.name,
            size: meta.len(),
            mtime_ns: mtime_ns(&meta)?,
        };
        cache_is_ready(&cache_directory, &key).then_some(())
    })
    .await;
    if !matches!(hit, Ok(Some(()))) {
        return proxy::fallback_reconstructed(state, &path, method, headers).await;
    }

    let mut response = (StatusCode::OK, "{\"available\":true,\"state\":null}\n").into_response();
    let out = response.headers_mut();
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    out.insert(header::VARY, HeaderValue::from_static("Cookie"));
    // Flask sets nothing else here (no Cache-Control), so neither does this.
    response
}

struct CacheKey<'a> {
    book_id: i64,
    format: &'a str,
    name: &'a str,
    size: u64,
    mtime_ns: u128,
}

fn mtime_ns(meta: &std::fs::Metadata) -> Option<u128> {
    let modified = meta.modified().ok()?;
    modified
        .duration_since(std::time::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_nanos())
}

/// The cache file name `_cache_details` produces: `json.dumps(request, sort_keys=True, separators=(",", ":"))`, so
/// the keys are in alphabetical order and strings are Python-escaped.
fn cache_file_name(key: &CacheKey<'_>) -> String {
    let version_key = if key.format == "EPUB" {
        format!(
            "\"extract_version\":{EPUB_EXTRACT_VERSION},\"format\":{},",
            pyjson::dumps_string(key.format)
        )
    } else {
        format!(
            "\"format\":{},\"layout_version\":{PDF_LAYOUT_VERSION},",
            pyjson::dumps_string(key.format)
        )
    };
    // "book_id" < "extract_version" | "format" < "layout_version" < "mtime_ns" < "name" < "size" < "version"
    let fingerprint = format!(
        "{{\"book_id\":{},{version_key}\"mtime_ns\":{},\"name\":{},\"size\":{},\"version\":{CACHE_VERSION}}}",
        key.book_id,
        key.mtime_ns,
        pyjson::dumps_string(key.name),
        key.size,
    );
    let digest = Sha256::digest(fingerprint.as_bytes());
    format!("{}-{}.json", key.book_id, hex::encode(digest))
}

/// True when the cache file exists and parses as a `ready` result with the fields Flask's `_load_cache` requires.
fn cache_is_ready(directory: &FsPath, key: &CacheKey<'_>) -> bool {
    let path: PathBuf = directory.join(cache_file_name(key));
    let Ok(bytes) = std::fs::read(path) else {
        return false;
    };
    let Ok(value) = serde_json::from_slice::<serde_json::Value>(&bytes) else {
        return false;
    };
    let result = &value["result"];
    result["status"] == "ready"
        && result["markdown_html"].is_string()
        && ["page_count", "pages_routed_to_ocr", "processing_time_ms"]
            .iter()
            .all(|field| result[*field].is_i64() || result[*field].is_u64())
}

#[cfg(test)]
mod tests {
    use super::{CacheKey, cache_file_name};

    // Digests computed with CPython: json.dumps(request, sort_keys=True, separators=(",", ":")) then sha256.
    #[test]
    fn cache_names_match_python() {
        let epub = CacheKey {
            book_id: 7,
            format: "EPUB",
            name: "Café – 😀 \u{7f}",
            size: 123,
            mtime_ns: 1_700_000_000_123_456_789,
        };
        assert_eq!(
            cache_file_name(&epub),
            "7-c63099c1734e1e8020e092e19350259047d032257e16ccfa1b402ae9b5149755.json"
        );
        let pdf = CacheKey {
            book_id: 7,
            format: "PDF",
            name: "Plain name",
            size: 5,
            mtime_ns: 1,
        };
        assert_eq!(
            cache_file_name(&pdf),
            "7-f21b3a6766ebdd71c6d1da03465a2c9fcc6f845e73e3f256e13f29f9adf46a47.json"
        );
    }
}
