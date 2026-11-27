//! `GET /download/<id>/<fmt>[/<anyname>]`: authorize, count, then 302 to the signed `/files` URL.
//! Port of `download_link` + `get_download_redirect` (`cps/web.py`, `cps/helper.py`) for the ANONYMOUS visitor.
//!
//! This is the one route where Rust writes: the counter row in `app.db` (`downloads`), with the same upsert and
//! the same foreign-key enforcement as `ub.update_download`. Everything that needs an identity or that Flask must
//! answer itself (cookies, `Authorization`, reverse-proxy login, login-required libraries, Kindle clients, Google
//! Drive, restricted columns, a guest without the download role, any 404 or 500) is proxied to Flask unchanged,
//! so those cases keep Flask's exact behaviour and are never counted twice.

use crate::{AppState, filename, library, proxy, signing};
use axum::Router;
use axum::body::Body;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use chrono::{DateTime, Utc};
use std::sync::Arc;

const ROLE_DOWNLOAD: i64 = 1 << 1;
const UMAMI_WEBSITE_ID: &str = "0b57aeb6-d996-4d88-89fc-59ada511cd9c";

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/download/{book_id}/{book_format}",
            get(download).head(download),
        )
        .route(
            "/download/{book_id}/{book_format}/{anyname}",
            get(download_named).head(download_named),
        )
}

async fn download(
    state: State<Arc<AppState>>,
    Path((book_id, book_format)): Path<(String, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(state.0, book_id, book_format, uri.0, method, headers).await
}

async fn download_named(
    state: State<Arc<AppState>>,
    Path((book_id, book_format, _anyname)): Path<(String, String, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    handle(state.0, book_id, book_format, uri.0, method, headers).await
}

async fn handle(
    state: Arc<AppState>,
    book_id: String,
    book_format: String,
    uri: axum::http::Uri,
    method: Method,
    headers: HeaderMap,
) -> Response {
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
            tracing::error!("download settings unavailable: {error}");
            return flask(state, method, headers).await;
        }
    };
    // Flask's `<int:book_id>` matches digits only; anything else is Flask's 404.
    let Some(book_id) = Some(book_id.as_str())
        .filter(|v| !v.is_empty() && v.bytes().all(|b| b.is_ascii_digit()))
        .and_then(|v| v.parse::<i64>().ok())
    else {
        return flask(state, method, headers).await;
    };
    // `request.headers.get("User-Agent").lower()` raises (HTTP 500) without a User-Agent; let Flask do that.
    let Some(user_agent) = headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
    else {
        return flask(state, method, headers).await;
    };
    // Flask's second client test is `"Kobo" in <lower-cased UA>`, which can never be true, so only Kindle differs.
    let kindle = user_agent.to_lowercase().contains("kindle");
    if headers.contains_key(header::COOKIE)
        || headers.contains_key(header::AUTHORIZATION)
        || settings.reverse_proxy_login
        || !settings.anonymous_browse
        || settings.use_google_drive
        || settings.restricted_column != 0
        || settings.guest_role & ROLE_DOWNLOAD == 0
        || kindle
    {
        return flask(state, method, headers).await;
    }

    // `book_format.split(".")[0]`
    let book_format = book_format.split('.').next().unwrap_or("").to_owned();
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
        // Flask logs and answers the 404 page; a query error is its problem to report as well.
        Ok(Ok(None)) => return flask(state, method, headers).await,
        Ok(Err(error)) => {
            tracing::error!("download metadata query failed: {error}");
            return flask(state, method, headers).await;
        }
        Err(error) => {
            tracing::error!("download metadata task failed: {error}");
            return flask(state, method, headers).await;
        }
    };
    let disk = settings
        .book_path()
        .join(&record.book_path)
        .join(format!("{}.{book_format}", record.name));
    let version = signing::version(record.last_modified.as_deref(), record.size);
    let anyname = filename::valid_filename(&record.name, settings.unicode_filename);
    let (Ok(version), Some(anyname), true) = (version, anyname, disk.is_file()) else {
        return flask(state, method, headers).await;
    };

    let counter_db = state.app_db.clone();
    let counted =
        tokio::task::spawn_blocking(move || increment(&counter_db, book_id, 0, Utc::now())).await;
    match counted {
        Ok(Ok(())) => {}
        // Never fail the download because the counter could not be written (what `ub.update_download` does).
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

    let signature = signing::signature(&state.secret(&settings), book_id, &book_format, &version);
    let location = format!(
        "/files/{book_id}/{}/{}/{signature}/{}",
        url_quote(&book_format),
        url_quote(&version),
        url_quote(&format!("{anyname}.{book_format}")),
    );
    redirect(&location)
}

/// werkzeug's `redirect(location)` body and headers, plus the ones Flask adds to this response.
fn redirect(location: &str) -> Response {
    let html = escape_html(location);
    let body = format!(
        "<!doctype html>\n<html lang=en>\n<title>Redirecting...</title>\n<h1>Redirecting...</h1>\n\
         <p>You should be redirected automatically to the target URL: <a href=\"{html}\">{html}</a>. \
         If not, click the link.\n"
    );
    let mut response = (StatusCode::FOUND, Body::from(body)).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    if let Ok(value) = HeaderValue::from_str(location) {
        headers.insert(header::LOCATION, value);
    }
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    headers.insert(header::VARY, HeaderValue::from_static("Cookie"));
    response
}

/// `markupsafe.escape`.
fn escape_html(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for ch in text.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '\'' => out.push_str("&#39;"),
            '"' => out.push_str("&#34;"),
            other => out.push(other),
        }
    }
    out
}

/// werkzeug's URL converter: `quote(value, safe="!$&'()*+,/:;=@")`.
fn url_quote(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for byte in text.bytes() {
        if byte.is_ascii_alphanumeric()
            || matches!(
                byte,
                b'_' | b'.'
                    | b'-'
                    | b'~'
                    | b'!'
                    | b'$'
                    | b'&'
                    | b'\''
                    | b'('
                    | b')'
                    | b'*'
                    | b'+'
                    | b','
                    | b'/'
                    | b':'
                    | b';'
                    | b'='
                    | b'@'
            )
        {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

/// `datetime.isoformat()` of an aware UTC time: no fraction at all when the microseconds are 0.
fn isoformat(now: DateTime<Utc>) -> String {
    let base = now.format("%Y-%m-%dT%H:%M:%S");
    match now.timestamp_subsec_micros() {
        0 => format!("{base}+00:00"),
        micros => format!("{base}.{micros:06}+00:00"),
    }
}

/// `ub.update_download`: the same upsert, on a connection with foreign keys enforced (user 0 is the
/// `__anonymous__` sentinel row, so the insert needs it).
fn increment(
    app_db: &std::path::Path,
    book_id: i64,
    user_id: i64,
    now: DateTime<Utc>,
) -> rusqlite::Result<()> {
    let mut conn = rusqlite::Connection::open_with_flags(
        app_db,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    conn.busy_timeout(std::time::Duration::from_secs(30))?;
    conn.execute_batch("PRAGMA foreign_keys=ON")?;
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO downloads (book_id, user_id, hit_count, last_hit)
         VALUES (?1, ?2, 1, ?3)
         ON CONFLICT(user_id, book_id)
         DO UPDATE SET hit_count = COALESCE(downloads.hit_count, 0) + 1,
                       last_hit = excluded.last_hit",
        rusqlite::params![book_id, user_id, isoformat(now)],
    )?;
    tx.commit()
}

/// `_track_download_analytics`: the log line, then (unless `DNT: 1`) the Umami `file-download` event.
/// The event goes out in the background; Flask waits for it for up to 5 s, which a download need not do.
fn track(
    state: &Arc<AppState>,
    user: &str,
    name: &str,
    book_format: &str,
    uri: &axum::http::Uri,
    headers: &HeaderMap,
) {
    let text = |name: HeaderName| {
        headers
            .get(name)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_owned()
    };
    let ua = text(header::USER_AGENT);
    let ip = Some(text(HeaderName::from_static("cf-connecting-ip")))
        .filter(|v| !v.is_empty())
        .or_else(|| {
            Some(
                text(HeaderName::from_static("x-forwarded-for"))
                    .split(',')
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_owned(),
            )
            .filter(|v| !v.is_empty())
        })
        .unwrap_or_default();
    let country = text(HeaderName::from_static("cf-ipcountry"));
    let file = format!("{name}.{book_format}");
    tracing::info!("Downloading file: '{file}' by {user} - ip: {ip}, country: {country}, ua: {ua}");
    if headers.get("dnt").and_then(|v| v.to_str().ok()) == Some("1") {
        return;
    }
    let Some(url) = state.umami_url.clone() else {
        return;
    };
    let host = text(header::HOST);
    let payload = serde_json::json!({
        "payload": {
            "hostname": host.split(':').next().unwrap_or(""),
            "language": text(header::ACCEPT_LANGUAGE),
            "url": percent_decode(uri.path()),
            "referrer": text(header::REFERER),
            "website": UMAMI_WEBSITE_ID,
            "name": "file-download",
            "data": {
                "file": file,
                "format": book_format,
                "client": "unknown",
                "country": country,
                "ua": ua,
            },
        },
        "type": "event",
    });
    let client = state.proxy_client.clone();
    let agent = if ua.is_empty() {
        "Calibre-Web/1.0".to_owned()
    } else {
        ua
    };
    tokio::spawn(async move {
        let sent = client
            .post(url)
            .timeout(std::time::Duration::from_secs(5))
            .header(header::USER_AGENT, agent)
            .header(header::CONTENT_TYPE, "application/json")
            .body(payload.to_string())
            .send()
            .await;
        if let Err(error) = sent {
            tracing::error!("Umami tracking failed: {error}");
        }
    });
}

/// `request.path`: the percent-decoded path (invalid UTF-8 is replaced, as werkzeug does).
fn percent_decode(path: &str) -> String {
    let bytes = path.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let hex = |b: u8| (b as char).to_digit(16);
        if bytes[i] == b'%'
            && i + 2 < bytes.len()
            && let (Some(hi), Some(lo)) = (hex(bytes[i + 1]), hex(bytes[i + 2]))
        {
            out.push((hi * 16 + lo) as u8);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Timelike};

    #[test]
    fn quote_keeps_werkzeug_safe_characters() {
        assert_eq!(url_quote("a b&c'd(é).pdf"), "a%20b&c'd(%C3%A9).pdf");
        assert_eq!(url_quote("100%"), "100%25");
    }

    #[test]
    fn html_escape_matches_markupsafe() {
        assert_eq!(escape_html("a&b<c>'\""), "a&amp;b&lt;c&gt;&#39;&#34;");
    }

    #[test]
    fn isoformat_drops_a_zero_fraction() {
        let whole = Utc.with_ymd_and_hms(2026, 11, 27, 1, 2, 3).unwrap();
        assert_eq!(isoformat(whole), "2026-11-27T01:02:03+00:00");
        assert_eq!(
            isoformat(whole.with_nanosecond(5_000).unwrap()),
            "2026-11-27T01:02:03.000005+00:00"
        );
    }

    #[test]
    fn percent_decode_handles_truncated_escapes() {
        assert_eq!(
            percent_decode("/download/1/pdf/a%20b"),
            "/download/1/pdf/a b"
        );
        assert_eq!(percent_decode("/x%2"), "/x%2");
        assert_eq!(percent_decode("/x%"), "/x%");
    }
}
