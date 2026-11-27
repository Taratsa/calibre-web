//! `GET|HEAD /static/<path>`: the files under `cps/static`. Port of Flask's `send_from_directory` static view
//! (`cps/cache_buster.py` only strips the `?q=<hash>` query, which Rust ignores as well).
//!
//! Anything that is not a plain existing file under the static directory goes to Flask unchanged, so every 404,
//! 412, 416 and every non-GET method keeps Flask's own answer. What Rust serves is byte- and header-identical:
//! werkzeug's ETag (`mtime-size-adler32(path)`), `Last-Modified`, `Cache-Control: no-cache`,
//! `Content-Disposition: inline; filename=...`, `Vary: Cookie`, `Accept-Ranges`, 304 and single-range 206.

use crate::cover::{
    conditional_not_modified, failed_precondition, if_range_matches, parse_range, werkzeug_etag,
};
use crate::{AppState, proxy};
use axum::Router;
use axum::body::Body;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::response::Response;
use axum::routing::any;
use std::path::{Component, Path as FsPath, PathBuf};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio_util::io::ReaderStream;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/static", any(to_flask))
        .route("/static/", any(to_flask))
        .route("/static/{*path}", any(serve))
}

/// `mimetypes.guess_type` as the live app answers it for every file type under `cps/static`, with the charset
/// werkzeug appends to text types. `None` for a type Rust has not been compared with: Flask answers those.
fn content_type(file_name: &str) -> Option<&'static str> {
    let extension = match file_name.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() => extension.to_ascii_lowercase(),
        // `LICENSE`, `LICENSE_QCMS`: no extension, so `application/octet-stream`.
        _ => return Some("application/octet-stream"),
    };
    Some(match extension.as_str() {
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "svg" => "image/svg+xml; charset=utf-8",
        "txt" => "text/plain; charset=utf-8",
        "md" => "text/markdown; charset=utf-8",
        "json" => "application/json",
        "wasm" => "application/wasm",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "ico" => "image/vnd.microsoft.icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "eot" => "application/vnd.ms-fontobject",
        "bcmap" | "ftl" | "pfb" | "map" | "mem" | "icc" => "application/octet-stream",
        _ => return None,
    })
}

/// The path under `root` for a request path, or `None` when it is anything but plain `a/b/c.ext` segments. A name
/// outside `[A-Za-z0-9._-]` is left to Flask too: its `Content-Disposition` quoting is not reproduced here.
fn resolve(root: &FsPath, requested: &str) -> Option<PathBuf> {
    if requested.is_empty() {
        return None;
    }
    let mut path = root.to_path_buf();
    for segment in requested.split('/') {
        let plain = !segment.is_empty()
            && segment != "."
            && segment != ".."
            && segment
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'));
        if !plain {
            return None;
        }
        path.push(segment);
    }
    // Only normal components can get here, so the result cannot leave `root` lexically.
    path.components()
        .skip(root.components().count())
        .all(|c| matches!(c, Component::Normal(_)))
        .then_some(path)
}

async fn to_flask(
    State(state): State<Arc<AppState>>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let target = uri
        .0
        .path_and_query()
        .map_or_else(|| uri.0.path().to_owned(), |v| v.as_str().to_owned());
    proxy::fallback_reconstructed(state, &target, method, headers).await
}

async fn serve(
    State(state): State<Arc<AppState>>,
    Path(requested): Path<String>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let target = uri
        .0
        .path_and_query()
        .map_or_else(|| uri.0.path().to_owned(), |v| v.as_str().to_owned());
    if method != Method::GET && method != Method::HEAD {
        return proxy::fallback_reconstructed(state, &target, method, headers).await;
    }
    match send(&state.static_directory, &requested, &method, &headers).await {
        Some(response) => response,
        None => proxy::fallback_reconstructed(state, &target, method, headers).await,
    }
}

/// `None` means "let Flask answer".
async fn send(
    root: &FsPath,
    requested: &str,
    method: &Method,
    request_headers: &HeaderMap,
) -> Option<Response> {
    let path = resolve(root, requested)?;
    let file_name = path.file_name()?.to_str()?.to_owned();
    let content_type = content_type(&file_name)?;
    // A symlink must not lead out of the static directory.
    let real = tokio::fs::canonicalize(&path).await.ok()?;
    if !real.starts_with(tokio::fs::canonicalize(root).await.ok()?) {
        return None;
    }
    let metadata = tokio::fs::metadata(&path).await.ok()?;
    if !metadata.is_file() {
        return None;
    }
    let size = metadata.len();
    let modified = metadata.modified().ok();
    let modified_secs = modified
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
    let etag = werkzeug_etag(&path, size, modified);
    let disposition = HeaderValue::from_str(&format!("inline; filename={file_name}")).ok()?;
    let etag_value = HeaderValue::from_str(&etag).ok()?;

    let common = |response: &mut Response| {
        let headers = response.headers_mut();
        headers.insert(header::CONTENT_DISPOSITION, disposition.clone());
        headers.insert(header::ETAG, etag_value.clone());
        headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
        headers.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
        headers.insert(header::VARY, HeaderValue::from_static("Cookie"));
    };

    // Flask's 304 carries no Content-Type, Content-Length or Last-Modified.
    if let Some(mut response) = conditional_not_modified(request_headers, &etag, modified_secs) {
        common(&mut response);
        return Some(response);
    }
    // A failed precondition (412), an unsatisfiable range (416) and a Range header Rust cannot read (werkzeug
    // answers 416 for `bytes=a-b` or `items=0-1`, not a full 200) are rendered by Flask.
    if failed_precondition(request_headers, &etag, modified_secs).is_some() {
        return None;
    }
    let range_header = request_headers
        .get(header::RANGE)
        .and_then(|v| v.to_str().ok());
    let range = if if_range_matches(request_headers, &etag, modified_secs) {
        match (range_header, parse_range(range_header, size)) {
            (Some(_), None) => return None,
            (_, parsed) => parsed,
        }
    } else {
        None
    };
    let (status, start, length) = match range {
        Some(Ok((start, length))) => (StatusCode::PARTIAL_CONTENT, start, length),
        Some(Err(())) => return None,
        None => (StatusCode::OK, 0, size),
    };

    let mut response = Response::new(Body::empty());
    *response.status_mut() = status;
    common(&mut response);
    let headers = response.headers_mut();
    headers.insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
    headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&length.to_string()).ok()?,
    );
    if let Some(time) = modified {
        headers.insert(
            header::LAST_MODIFIED,
            HeaderValue::from_str(&httpdate::fmt_http_date(time)).ok()?,
        );
    }
    if status == StatusCode::PARTIAL_CONTENT {
        headers.insert(
            header::CONTENT_RANGE,
            HeaderValue::from_str(&format!("bytes {start}-{}/{size}", start + length - 1)).ok()?,
        );
    }
    if *method != Method::HEAD && length > 0 {
        let mut file = tokio::fs::File::open(&path).await.ok()?;
        file.seek(std::io::SeekFrom::Start(start)).await.ok()?;
        *response.body_mut() = Body::from_stream(ReaderStream::new(file.take(length)));
    }
    Some(response)
}

#[cfg(test)]
mod tests {
    use super::{content_type, resolve};
    use std::path::Path;

    #[test]
    fn content_types_match_the_live_app() {
        assert_eq!(content_type("main.css"), Some("text/css; charset=utf-8"));
        assert_eq!(
            content_type("pdf.worker.mjs"),
            Some("text/javascript; charset=utf-8")
        );
        assert_eq!(
            content_type("icon.svg"),
            Some("image/svg+xml; charset=utf-8")
        );
        assert_eq!(content_type("locale.json"), Some("application/json"));
        assert_eq!(
            content_type("78-EUC-V.bcmap"),
            Some("application/octet-stream")
        );
        assert_eq!(
            content_type("LICENSE_QCMS"),
            Some("application/octet-stream")
        );
        assert_eq!(
            content_type("favicon.ico"),
            Some("image/vnd.microsoft.icon")
        );
        assert_eq!(content_type("unknown.xyz"), None);
    }

    #[test]
    fn only_plain_paths_under_the_root_resolve() {
        let root = Path::new("/srv/static");
        assert_eq!(
            resolve(root, "css/main.css").unwrap(),
            Path::new("/srv/static/css/main.css")
        );
        for bad in [
            "",
            "../etc/passwd",
            "css/../../x",
            "css//main.css",
            "/etc/passwd",
            "css/ma in.css",
            "css/main.css\\x",
            "css/%2e%2e/x",
            "css/..",
            "a\0b",
            "css/ünï.css",
        ] {
            assert!(resolve(root, bad).is_none(), "{bad:?} must go to Flask");
        }
    }
}
