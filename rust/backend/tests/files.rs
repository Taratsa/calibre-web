use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use rusqlite::Connection;
use std::sync::Arc;
use taratsa_backend::{AppState, router, signing};
use tempfile::TempDir;
use tower::ServiceExt;

const KEY: &[u8] = b"fixture-secret-key-32-bytes-long";
const BODY: &[u8] = b"%PDF-1.4 fixture body, long enough to range over";

struct Fixture {
    _dir: TempDir,
    app: axum::Router,
    app_db: std::path::PathBuf,
    version: String,
}

/// A library with one book (id 7): title "Café Müller", two authors, a PDF of `BODY`.
fn fixture(embed_metadata: bool) -> Fixture {
    let dir = TempDir::new().unwrap();
    let library = dir.path().join("library");
    let book_dir = library.join("Author/Cafe (7)");
    std::fs::create_dir_all(&book_dir).unwrap();
    std::fs::write(book_dir.join("Cafe Muller.pdf"), BODY).unwrap();
    std::fs::write(book_dir.join("cover.jpg"), b"jpeg-fixture").unwrap();
    std::fs::write(book_dir.join("cover.webp"), b"webp-fixture").unwrap();

    let meta = Connection::open(library.join("metadata.db")).unwrap();
    meta.execute_batch(
        "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, path TEXT, last_modified TIMESTAMP, has_cover INTEGER);
         CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT);
         CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER, author INTEGER);
         CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT, uncompressed_size INTEGER, name TEXT);
         CREATE TABLE books_languages_link (id INTEGER PRIMARY KEY, book INTEGER, lang_code INTEGER);
         CREATE TABLE languages (id INTEGER PRIMARY KEY, lang_code TEXT);
         CREATE TABLE books_tags_link (id INTEGER PRIMARY KEY, book INTEGER, tag INTEGER);
         CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT);
         CREATE TABLE books_series_link (id INTEGER PRIMARY KEY, book INTEGER, series INTEGER);
         INSERT INTO books VALUES (7, 'Café Müller', 'Author/Cafe (7)', '2023-10-27 07:56:53.123456', 1);
         INSERT INTO authors VALUES (1, 'First Author'), (2, 'Second Author');
         INSERT INTO books_authors_link (book, author) VALUES (7, 2), (7, 1);
         INSERT INTO books_series_link (book, series) VALUES (7, 3);",
    )
    .unwrap();
    meta.execute(
        "INSERT INTO data VALUES (1, 7, 'PDF', ?1, 'Cafe Muller')",
        [BODY.len() as i64],
    )
    .unwrap();

    let app_db = dir.path().join("app.db");
    let app = Connection::open(&app_db).unwrap();
    app.execute_batch(
        "CREATE TABLE settings (config_use_google_drive INTEGER, config_embed_metadata INTEGER,
            config_unicode_filename INTEGER, config_binariesdir TEXT, config_kepubifypath TEXT,
            config_calibre_dir TEXT, config_calibre_split INTEGER, config_calibre_split_dir TEXT,
            config_trustedhosts TEXT, config_calibre_web_title TEXT, config_anonbrowse INTEGER,
            config_restricted_column INTEGER, config_allow_reverse_proxy_header_login INTEGER,
            config_reverse_proxy_login_header_name TEXT);
         CREATE TABLE user (id INTEGER PRIMARY KEY, name TEXT, role INTEGER, default_language TEXT, denied_tags TEXT, allowed_tags TEXT);
         CREATE TABLE downloads (id INTEGER NOT NULL, book_id INTEGER, user_id INTEGER,
            hit_count INTEGER NOT NULL DEFAULT 1, last_hit DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',
            PRIMARY KEY (id), FOREIGN KEY(user_id) REFERENCES user (id));
         CREATE UNIQUE INDEX uq_downloads_user_book ON downloads (user_id, book_id);
         CREATE TABLE archived_book (id INTEGER PRIMARY KEY, user_id INTEGER, book_id INTEGER, is_archived INTEGER);
         CREATE TABLE thumbnail (id INTEGER PRIMARY KEY, entity_id INTEGER, type SMALLINT, resolution SMALLINT);
         CREATE TABLE flask_settings (id INTEGER PRIMARY KEY, flask_session_key BLOB);
         CREATE TABLE user_session (id INTEGER PRIMARY KEY, user_id INTEGER, session_key TEXT, random TEXT, expiry INTEGER);",
    )
    .unwrap();
    app.execute(
        "INSERT INTO settings VALUES (0, ?1, 0, '/nonexistent-binaries', '', ?2, 0, '', 'https://stats.example', 'Fixture', 1, 0, 0, '')",
        rusqlite::params![embed_metadata as i64, library.to_str().unwrap()],
    )
    .unwrap();
    app.execute(
        "INSERT INTO flask_settings (flask_session_key) VALUES (?1)",
        [KEY],
    )
    .unwrap();
    app.execute(
        "INSERT INTO user VALUES (0, '__anonymous__', 0, 'all', '', ''), (1, 'Guest', 34, 'all', '', '')",
        [],
    )
    .unwrap();

    let mut state = Arc::new(AppState::new(app_db.clone(), 2));
    Arc::get_mut(&mut state).unwrap().cache_directory = dir.path().join("cache");
    Arc::get_mut(&mut state).unwrap().static_directory = dir.path().join("static");
    std::fs::create_dir_all(dir.path().join("static")).unwrap();
    std::fs::write(dir.path().join("static/generic_cover.jpg"), b"generic").unwrap();
    Arc::get_mut(&mut state).unwrap().proxy_url = "http://127.0.0.1:1".into();
    Arc::get_mut(&mut state).unwrap().umami_url = None;
    Arc::get_mut(&mut state).unwrap().ocr_cache_directory = dir.path().join("ocr");
    let version = format!("{}-{}", 1_698_393_413, BODY.len());
    Fixture {
        app: router(state),
        app_db,
        _dir: dir,
        version,
    }
}

fn url(f: &Fixture, sig: &str) -> String {
    format!("/files/7/pdf/{}/{sig}", f.version)
}

async fn get(
    f: &Fixture,
    uri: &str,
    range: Option<&str>,
) -> (StatusCode, axum::http::HeaderMap, Vec<u8>) {
    let mut request = Request::builder()
        .uri(uri)
        .header(header::HOST, "pustaka.example");
    if let Some(range) = range {
        request = request.header(header::RANGE, range);
    }
    let response = f
        .app
        .clone()
        .oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    (
        parts.status,
        parts.headers,
        body.collect().await.unwrap().to_bytes().to_vec(),
    )
}

#[tokio::test]
async fn serves_the_file_with_the_flask_headers() {
    let f = fixture(false);
    let sig = signing::signature(KEY, 7, "pdf", &f.version);
    let (status, headers, body) = get(&f, &url(&f, &sig), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, BODY);
    assert_eq!(headers[header::CONTENT_TYPE], "application/pdf");
    assert_eq!(
        headers[header::CACHE_CONTROL],
        "public, max-age=31536000, immutable"
    );
    assert_eq!(
        headers["link"].to_str().unwrap(),
        format!(
            "<https://pustaka.example/files/7/pdf/{}/{sig}>; rel=\"canonical\"",
            f.version
        )
    );
    // first author = lowest author id, not link order
    assert_eq!(
        headers[header::CONTENT_DISPOSITION],
        "attachment; filename=\"Cafe Muller - First Author.pdf\"; filename*=UTF-8''Caf%C3%A9%20M%C3%BCller%20-%20First%20Author.pdf"
    );
    assert_eq!(headers[header::X_CONTENT_TYPE_OPTIONS], "nosniff");
    assert_eq!(
        headers[header::STRICT_TRANSPORT_SECURITY],
        "max-age=31536000"
    );
    assert!(
        headers[header::CONTENT_SECURITY_POLICY]
            .to_str()
            .unwrap()
            .contains("https://stats.example 'self'")
    );
    assert_eq!(headers[header::VARY], "Cookie");
    assert_eq!(headers[header::ACCEPT_RANGES], "bytes");
}

#[tokio::test]
async fn a_conditional_request_gets_flasks_304_headers() {
    let f = fixture(false);
    let sig = signing::signature(KEY, 7, "pdf", &f.version);
    let request = Request::builder()
        .uri(url(&f, &sig))
        .header(header::HOST, "pustaka.example")
        .header(header::IF_NONE_MATCH, "*")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_MODIFIED);
    let headers = response.headers();
    // Flask's 304 keeps the immutable cache policy, the canonical link and the file name, but has no Last-Modified
    assert_eq!(
        headers[header::CACHE_CONTROL],
        "public, max-age=31536000, immutable"
    );
    assert!(headers.get("link").is_some());
    assert!(headers.get(header::CONTENT_DISPOSITION).is_some());
    assert_eq!(headers[header::VARY], "Cookie");
    assert_eq!(headers[header::ACCEPT_RANGES], "bytes");
    assert!(headers.get(header::LAST_MODIFIED).is_none());
}

#[tokio::test]
async fn trailing_name_is_ignored_and_ranges_work() {
    let f = fixture(false);
    let sig = signing::signature(KEY, 7, "pdf", &f.version);
    let (status, _, body) = get(
        &f,
        &format!("{}/anything.pdf", url(&f, &sig)),
        Some("bytes=5-8"),
    )
    .await;
    assert_eq!(status, StatusCode::PARTIAL_CONTENT);
    assert_eq!(body, &BODY[5..9]);
}

#[tokio::test]
async fn a_bad_signature_is_handed_to_flask_and_reveals_nothing() {
    // The fixture's Flask is down, so a request Rust hands over answers 502 with no file bytes. In production Flask
    // renders its own 404 page (title, Vary, no-store headers), which Rust must not imitate with a bare body.
    let f = fixture(false);
    let (status, _, body) = get(&f, &url(&f, &"0".repeat(32)), None).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY);
    assert!(!body.windows(3).any(|w| w == b"PDF"));
    // a signature valid for a different book does not open this one
    let other = signing::signature(KEY, 8, "pdf", &f.version);
    assert_eq!(
        get(&f, &url(&f, &other), None).await.0,
        StatusCode::BAD_GATEWAY
    );
}

#[tokio::test]
async fn unknown_book_or_format_is_handed_to_flask() {
    let f = fixture(false);
    let sig = signing::signature(KEY, 99, "pdf", &f.version);
    assert_eq!(
        get(&f, &format!("/files/99/pdf/{}/{sig}", f.version), None)
            .await
            .0,
        StatusCode::BAD_GATEWAY
    );
    let sig = signing::signature(KEY, 7, "epub", &f.version);
    assert_eq!(
        get(&f, &format!("/files/7/epub/{}/{sig}", f.version), None)
            .await
            .0,
        StatusCode::BAD_GATEWAY
    );
}

#[tokio::test]
async fn an_unsatisfiable_range_is_handed_to_flask() {
    let f = fixture(false);
    let sig = signing::signature(KEY, 7, "pdf", &f.version);
    let (status, _, _) = get(&f, &url(&f, &sig), Some("bytes=999999-")).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY);
}

#[tokio::test]
async fn stale_version_redirects_to_download_uncached() {
    let f = fixture(false);
    let stale = "1000-1";
    let sig = signing::signature(KEY, 7, "pdf", stale);
    let (status, headers, _) = get(&f, &format!("/files/7/pdf/{stale}/{sig}"), None).await;
    assert_eq!(status, StatusCode::FOUND);
    assert_eq!(headers[header::LOCATION], "/download/7/pdf");
    assert_eq!(headers[header::CACHE_CONTROL], "private, no-store");
}

#[tokio::test]
async fn failed_metadata_export_falls_back_to_the_file_on_disk() {
    // embed_metadata on, but the binaries directory does not exist: Flask serves the stored file then too.
    let f = fixture(true);
    let sig = signing::signature(KEY, 7, "pdf", &f.version);
    let (status, _, body) = get(&f, &url(&f, &sig), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, BODY);
}

#[tokio::test]
async fn health_endpoints() {
    let f = fixture(false);
    let (status, headers, body) = get(&f, "/healthz/live", None).await;
    assert_eq!(
        (status, body.as_slice()),
        (StatusCode::OK, b"ok".as_slice())
    );
    assert_eq!(headers[header::CACHE_CONTROL], "no-store");

    let (status, _, body) = get(&f, "/healthz/ready", None).await;
    assert_eq!(
        (status, body.as_slice()),
        (StatusCode::OK, b"ready".as_slice())
    );

    let (status, headers, body) = get(&f, "/healthz", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        headers[header::CACHE_CONTROL],
        "no-store, no-cache, must-revalidate"
    );
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "up");
    assert_eq!(json["version"], "Fixture");
    for part in ["config", "calibre_db", "app_db"] {
        assert_eq!(json["checks"][part]["status"], "up", "{part}");
    }
}

#[tokio::test]
async fn health_reports_a_missing_library() {
    let f = fixture(false);
    std::fs::remove_file(f._dir.path().join("library/metadata.db")).unwrap();
    let (status, _, body) = get(&f, "/healthz/ready", None).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["checks"]["calibre_db"]["status"], "down");
    assert_eq!(get(&f, "/healthz/live", None).await.0, StatusCode::OK);
}

#[tokio::test]
async fn cover_original_serves_cached_jpeg_or_prebuilt_webp() {
    let f = fixture(false);
    let (status, headers, body) = get(&f, "/cover/7", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, b"jpeg-fixture");
    assert_eq!(headers[header::CONTENT_TYPE], "image/jpeg");
    assert_eq!(
        headers[header::CONTENT_DISPOSITION],
        "inline; filename=cover.jpg"
    );
    assert_eq!(headers[header::CACHE_CONTROL], "no-cache");
    assert_eq!(headers[header::VARY], "Cookie");

    let request = Request::builder()
        .uri("/cover/7")
        .header(header::HOST, "pustaka.example")
        .header(header::ACCEPT, "image/webp")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()[header::CONTENT_TYPE], "image/webp");
    assert_eq!(
        response.headers()[header::CONTENT_DISPOSITION],
        "inline; filename=cover.webp"
    );
    assert_eq!(
        response.headers()[header::CACHE_CONTROL],
        "public, max-age=604800"
    );
    assert_eq!(response.headers()[header::VARY], "Accept-Encoding, Cookie");
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        &b"webp-fixture"[..]
    );
}

#[tokio::test]
async fn cover_thumbnail_reads_existing_cache_files() {
    let f = fixture(false);
    let cache_dir = f._dir.path().join("cache/thumbnails");
    std::fs::create_dir_all(&cache_dir).unwrap();
    std::fs::write(cache_dir.join("cover_7_r1.jpg"), b"thumbnail-jpeg").unwrap();
    std::fs::write(cache_dir.join("cover_7_r1.webp"), b"thumbnail-webp").unwrap();

    let request = Request::builder()
        .uri("/cover_thumb/7")
        .header(header::HOST, "pustaka.example")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()[header::CONTENT_TYPE], "image/jpeg");
    assert_eq!(
        response.headers()[header::CACHE_CONTROL],
        "public, max-age=604800"
    );
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        &b"thumbnail-jpeg"[..]
    );

    let request = Request::builder()
        .uri("/cover_thumb/7/sm")
        .header(header::HOST, "pustaka.example")
        .header(header::ACCEPT, "image/webp")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()[header::CONTENT_TYPE], "image/webp");
    assert_eq!(
        response.headers()[header::CONTENT_DISPOSITION],
        "inline; filename=cover_7_r1.webp"
    );
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        &b"thumbnail-webp"[..]
    );
}

#[tokio::test]
async fn cover_head_range_and_conditional_requests_work() {
    let f = fixture(false);
    let request = Request::builder()
        .method("HEAD")
        .uri("/cover/7")
        .header(header::HOST, "pustaka.example")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()[header::CONTENT_LENGTH], "12");
    assert!(
        response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes()
            .is_empty()
    );

    let request = Request::builder()
        .uri("/cover/7")
        .header(header::HOST, "pustaka.example")
        .header(header::RANGE, "bytes=0-3")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
    assert_eq!(response.headers()[header::CONTENT_RANGE], "bytes 0-3/12");
    assert_eq!(
        response.into_body().collect().await.unwrap().to_bytes(),
        &b"jpeg"[..]
    );

    let request = Request::builder()
        .uri("/cover/7")
        .header(header::HOST, "pustaka.example")
        .header(header::IF_NONE_MATCH, "*")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_MODIFIED);
    assert_eq!(response.headers()[header::CACHE_CONTROL], "no-cache");
}

#[tokio::test]
async fn request_identity_and_generic_cases_are_preserved() {
    let f = fixture(false);
    let request = Request::builder()
        .uri("/cover/7")
        .header(header::HOST, "pustaka.example")
        .header(header::COOKIE, "session=abc")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(
        response.status(),
        StatusCode::BAD_GATEWAY,
        "cookie requests must proxy to Flask"
    );
    assert!(
        response
            .headers()
            .get(header::CONTENT_SECURITY_POLICY)
            .is_some()
    );

    for path in ["/cover/99", "/cover_thumb/99"] {
        let request = Request::builder()
            .uri(path)
            .header(header::HOST, "pustaka.example")
            .body(Body::empty())
            .unwrap();
        let response = f.app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        assert_eq!(response.headers()[header::CONTENT_TYPE], "image/jpeg");
        assert_eq!(
            response.into_body().collect().await.unwrap().to_bytes(),
            &b"generic"[..]
        );
    }
}

async fn download(
    f: &Fixture,
    uri: &str,
    extra: &[(&str, &str)],
) -> (StatusCode, axum::http::HeaderMap, String) {
    let mut request = Request::builder()
        .uri(uri)
        .header(header::HOST, "pustaka.example");
    if !extra.iter().any(|(name, _)| *name == "user-agent") {
        request = request.header(header::USER_AGENT, "Mozilla/5.0");
    }
    for (name, value) in extra {
        request = request.header(*name, *value);
    }
    let response = f
        .app
        .clone()
        .oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    let text = String::from_utf8_lossy(&body.collect().await.unwrap().to_bytes()).into_owned();
    (parts.status, parts.headers, text)
}

fn hits(f: &Fixture) -> Vec<(i64, i64, i64)> {
    let conn = Connection::open(&f.app_db).unwrap();
    let mut statement = conn
        .prepare("SELECT book_id, user_id, hit_count FROM downloads ORDER BY id")
        .unwrap();
    statement
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .unwrap()
        .map(Result::unwrap)
        .collect()
}

#[tokio::test]
async fn anonymous_download_counts_and_redirects_to_the_signed_url() {
    let f = fixture(false);
    let sig = signing::signature(KEY, 7, "pdf", &f.version);
    let location = format!("/files/7/pdf/{}/{sig}/Cafe%20Muller.pdf", f.version);
    let (status, headers, body) = download(&f, "/download/7/pdf", &[]).await;
    assert_eq!(status, StatusCode::FOUND);
    assert_eq!(headers[header::LOCATION], location.as_str());
    assert_eq!(headers[header::CACHE_CONTROL], "private, no-store");
    assert_eq!(headers[header::VARY], "Cookie");
    assert_eq!(headers[header::CONTENT_TYPE], "text/html; charset=utf-8");
    assert!(body.starts_with("<!doctype html>\n<html lang=en>\n<title>Redirecting...</title>"));
    assert!(body.contains(&format!(
        "<a href=\"/files/7/pdf/{}/{sig}/Cafe%20Muller.pdf\">",
        f.version
    )));
    assert_eq!(hits(&f), vec![(7, 0, 1)]);

    // the named variant and a dotted format both count the same (user, book) row again
    let (status, _, _) = download(&f, "/download/7/pdf.pdf/whatever.pdf", &[]).await;
    assert_eq!(status, StatusCode::FOUND);
    assert_eq!(hits(&f), vec![(7, 0, 2)]);

    // the redirect target is the signed file
    let (status, _, served) = get(&f, headers[header::LOCATION].to_str().unwrap(), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(served, BODY);
}

#[tokio::test]
async fn download_leaves_identity_and_failures_to_flask_without_counting() {
    let f = fixture(false);
    for extra in [
        vec![("cookie", "session=abc")],
        vec![("authorization", "Basic eDp5")],
        vec![("user-agent", "Mozilla/5.0 (Linux; Kindle Fire)")],
    ] {
        let (status, _, _) = download(&f, "/download/7/pdf", &extra).await;
        assert_eq!(status, StatusCode::BAD_GATEWAY, "{extra:?} must proxy");
    }
    for path in ["/download/99/pdf", "/download/7/epub", "/download/7x/pdf"] {
        let (status, _, _) = download(&f, path, &[]).await;
        assert_ne!(status, StatusCode::FOUND, "{path}");
    }
    // no User-Agent: Flask raises, so the request goes to Flask
    let request = Request::builder()
        .uri("/download/7/pdf")
        .header(header::HOST, "pustaka.example")
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
    assert!(hits(&f).is_empty(), "nothing may be counted");
}

#[tokio::test]
async fn a_failed_counter_write_never_fails_the_download() {
    let f = fixture(false);
    // a guest without the sentinel row: the foreign key rejects the insert
    Connection::open(&f.app_db)
        .unwrap()
        .execute("DELETE FROM user WHERE id = 0", [])
        .unwrap();
    let (status, _, _) = download(&f, "/download/7/pdf", &[]).await;
    assert_eq!(status, StatusCode::FOUND);
    assert!(hits(&f).is_empty());
}

#[tokio::test]
async fn series_cover_is_its_first_book_with_a_cover() {
    let f = fixture(false);
    // series 3 contains book 7: the original JPEG, no visibility filter, same headers as /cover/7
    let (status, headers, body) = get(&f, "/series_cover/3", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, b"jpeg-fixture");
    let (_, book_headers, _) = get(&f, "/cover/7", None).await;
    assert_eq!(headers[header::ETAG], book_headers[header::ETAG]);
    assert_eq!(headers[header::CONTENT_TYPE], "image/jpeg");

    // an unknown series is the generic cover, like an unknown book
    let (status, _, body) = get(&f, "/series_cover/99", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, b"generic");

    // a thumbnail miss and a cookie go to Flask (502 here: the fixture's Flask is down)
    let (status, _, _) = get(&f, "/series_cover/3/sm", None).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY);
}

#[tokio::test]
async fn series_cover_stays_on_flask_while_series_thumbnails_exist() {
    let f = fixture(false);
    Connection::open(&f.app_db)
        .unwrap()
        .execute(
            "INSERT INTO thumbnail (entity_id, type, resolution) VALUES (3, 2, 1)",
            [],
        )
        .unwrap();
    // the settings cache lives 1 s; wait it out
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    let (status, _, _) = get(&f, "/series_cover/3", None).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY);
    // book covers are unaffected
    let (status, _, _) = get(&f, "/cover/7", None).await;
    assert_eq!(status, StatusCode::OK);
}

fn static_dir(f: &Fixture) -> std::path::PathBuf {
    f._dir.path().join("static")
}

async fn static_request(
    f: &Fixture,
    method: &str,
    uri: &str,
    extra: &[(&str, &str)],
) -> (StatusCode, axum::http::HeaderMap, Vec<u8>) {
    let mut request = Request::builder()
        .method(method)
        .uri(uri)
        .header(header::HOST, "pustaka.example");
    for (name, value) in extra {
        request = request.header(*name, *value);
    }
    let response = f
        .app
        .clone()
        .oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    (
        parts.status,
        parts.headers,
        body.collect().await.unwrap().to_bytes().to_vec(),
    )
}

#[tokio::test]
async fn static_file_is_served_with_flasks_headers() {
    let f = fixture(false);
    std::fs::create_dir_all(static_dir(&f).join("css")).unwrap();
    std::fs::write(static_dir(&f).join("css/main.css"), b"body{margin:0}").unwrap();

    let (status, headers, body) =
        static_request(&f, "GET", "/static/css/main.css?q=abc1234", &[]).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, b"body{margin:0}");
    assert_eq!(headers[header::CONTENT_TYPE], "text/css; charset=utf-8");
    assert_eq!(headers[header::CONTENT_LENGTH], "14");
    assert_eq!(headers[header::CACHE_CONTROL], "no-cache");
    assert_eq!(headers[header::VARY], "Cookie");
    assert_eq!(headers[header::ACCEPT_RANGES], "bytes");
    assert_eq!(
        headers[header::CONTENT_DISPOSITION],
        "inline; filename=main.css"
    );
    assert!(headers.contains_key(header::LAST_MODIFIED));
    assert!(
        headers[header::CONTENT_SECURITY_POLICY]
            .to_str()
            .unwrap()
            .contains("object-src 'none'")
    );

    // HEAD: same headers, no body
    let (status, head, body) = static_request(&f, "HEAD", "/static/css/main.css", &[]).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.is_empty());
    assert_eq!(head[header::CONTENT_LENGTH], "14");
    assert_eq!(head[header::ETAG], headers[header::ETAG]);
}

#[tokio::test]
async fn static_conditional_and_range_requests() {
    let f = fixture(false);
    std::fs::write(static_dir(&f).join("app.js"), b"0123456789").unwrap();
    let (_, headers, _) = static_request(&f, "GET", "/static/app.js", &[]).await;
    let etag = headers[header::ETAG].to_str().unwrap().to_owned();
    let modified = headers[header::LAST_MODIFIED].to_str().unwrap().to_owned();

    // 304 by ETag and by date: no body, no Content-Type, Flask's validators kept
    for extra in [
        ("If-None-Match", etag.as_str()),
        ("If-Modified-Since", modified.as_str()),
    ] {
        let (status, h, body) = static_request(&f, "GET", "/static/app.js", &[extra]).await;
        assert_eq!(status, StatusCode::NOT_MODIFIED, "{extra:?}");
        assert!(body.is_empty());
        assert!(!h.contains_key(header::CONTENT_TYPE));
        assert_eq!(h[header::ETAG].to_str().unwrap(), etag);
        assert_eq!(h[header::CACHE_CONTROL], "no-cache");
    }
    // a different ETag is a full 200
    let (status, _, body) = static_request(
        &f,
        "GET",
        "/static/app.js",
        &[("If-None-Match", "\"other\"")],
    )
    .await;
    assert_eq!(
        (status, body.as_slice()),
        (StatusCode::OK, &b"0123456789"[..])
    );

    // ranges
    let (status, h, body) =
        static_request(&f, "GET", "/static/app.js", &[("Range", "bytes=2-4")]).await;
    assert_eq!(status, StatusCode::PARTIAL_CONTENT);
    assert_eq!(body, b"234");
    assert_eq!(h[header::CONTENT_RANGE], "bytes 2-4/10");
    let (_, _, body) = static_request(&f, "GET", "/static/app.js", &[("Range", "bytes=-3")]).await;
    assert_eq!(body, b"789");
    // If-Range with a stale validator ignores the range
    let (status, _, body) = static_request(
        &f,
        "GET",
        "/static/app.js",
        &[("Range", "bytes=2-4"), ("If-Range", "\"stale\"")],
    )
    .await;
    assert_eq!((status, body.len()), (StatusCode::OK, 10));
    // an unsatisfiable range, and a failed precondition, are Flask's pages (502: the fixture's Flask is down)
    let (status, _, _) =
        static_request(&f, "GET", "/static/app.js", &[("Range", "bytes=50-")]).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY);
    let (status, _, _) =
        static_request(&f, "GET", "/static/app.js", &[("If-Match", "\"nope\"")]).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY);
    // werkzeug answers 416 to a Range header it cannot parse, so Rust must not answer 200 for it
    for bad in ["bytes=a-b", "items=0-1", "bytes=-0"] {
        let (status, _, _) = static_request(&f, "GET", "/static/app.js", &[("Range", bad)]).await;
        assert_eq!(status, StatusCode::BAD_GATEWAY, "Range: {bad}");
    }
}

#[tokio::test]
async fn static_misses_and_unsafe_paths_go_to_flask() {
    let f = fixture(false);
    std::fs::create_dir_all(static_dir(&f).join("css")).unwrap();
    std::fs::write(static_dir(&f).join("css/main.css"), b"x").unwrap();
    std::fs::write(static_dir(&f).join("data.unknownext"), b"x").unwrap();
    std::fs::write(f._dir.path().join("secret.txt"), b"outside").unwrap();
    #[cfg(unix)]
    std::os::unix::fs::symlink(
        f._dir.path().join("secret.txt"),
        static_dir(&f).join("link.txt"),
    )
    .unwrap();

    for (method, uri) in [
        ("GET", "/static/css/missing.css"),
        ("GET", "/static/css"), // a directory
        ("GET", "/static/css/"),
        ("GET", "/static/"),
        ("GET", "/static"),
        ("GET", "/static/data.unknownext"), // a type Rust was not compared on
        ("GET", "/static/../secret.txt"),
        ("GET", "/static/css/../../secret.txt"),
        ("GET", "/static/%2e%2e/secret.txt"),
        ("GET", "/static/css%2f..%2f..%2fsecret.txt"),
        ("GET", "/static/css//main.css"),
        ("GET", "/static/link.txt"), // a symlink out of the directory
        ("POST", "/static/css/main.css"),
    ] {
        let (status, _, body) = static_request(&f, method, uri, &[]).await;
        assert_eq!(
            status,
            StatusCode::BAD_GATEWAY,
            "{method} {uri} must be Flask's"
        );
        assert!(
            !String::from_utf8_lossy(&body).contains("outside"),
            "{uri} leaked a file"
        );
    }
}

fn reader_state(f: &Fixture) {
    // the fixture's `user` rows: Guest is role 34 (anonymous + download); the PDF reader needs the viewer bit too
    Connection::open(&f.app_db)
        .unwrap()
        .execute("UPDATE user SET role = 34 | 256 WHERE id = 1", [])
        .unwrap();
}

async fn reader(
    f: &Fixture,
    extra: &[(&str, &str)],
) -> (StatusCode, axum::http::HeaderMap, String) {
    let mut request = Request::builder()
        .uri("/read/7/pdf")
        .header(header::HOST, "pustaka.example");
    for (name, value) in extra {
        request = request.header(*name, *value);
    }
    let response = f
        .app
        .clone()
        .oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    let text = String::from_utf8_lossy(&body.collect().await.unwrap().to_bytes()).into_owned();
    (parts.status, parts.headers, text)
}

#[tokio::test]
async fn pdf_reader_renders_the_guest_page() {
    let f = fixture(false);
    reader_state(&f);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    let sig = signing::signature(KEY, 7, "pdf", &f.version);
    let (status, headers, page) = reader(&f, &[("Accept-Language", "id-ID,id;q=0.9")]).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers[header::CONTENT_TYPE], "text/html; charset=utf-8");
    assert_eq!(headers[header::VARY], "Cookie");
    assert_eq!(headers["x-robots-tag"], "noindex");
    assert!(
        page.contains("<title>Pembaca PDF | Café Müller</title>"),
        "{page}"
    );
    assert!(page.contains(&format!("\"/files/7/pdf/{}/{sig}\"", f.version)));
    // the guest has the download role in this fixture, so the toolbar keeps print and download
    assert!(page.contains("id=\"downloadButton\"") && page.contains("id=\"printButton\""));
    assert!(!page.contains("{{") && !page.contains("{%"));
    assert!(page.contains("window.umami.track(\"pdf-read\""));
}

#[tokio::test]
async fn pdf_reader_hides_download_buttons_without_the_role() {
    let f = fixture(false);
    Connection::open(&f.app_db)
        .unwrap()
        .execute("UPDATE user SET role = 32 | 256 WHERE id = 1", [])
        .unwrap();
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    let (status, _, page) = reader(&f, &[]).await;
    assert_eq!(status, StatusCode::OK);
    assert!(!page.contains("id=\"downloadButton\"") && !page.contains("id=\"printButton\""));
    assert!(!page.contains("id=\"secondaryDownload\""));
}

#[tokio::test]
async fn pdf_reader_applies_the_guest_role_at_once() {
    // the viewer bit is read fresh, not through the 1 s settings cache
    let f = fixture(false);
    reader_state(&f);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    assert_eq!(reader(&f, &[]).await.0, StatusCode::OK);
    Connection::open(&f.app_db)
        .unwrap()
        .execute("UPDATE user SET role = 34 WHERE id = 1", [])
        .unwrap();
    assert_eq!(
        reader(&f, &[]).await.0,
        StatusCode::BAD_GATEWAY,
        "revoked: Flask answers"
    );
}

#[tokio::test]
async fn pdf_reader_leaves_identity_and_odd_cases_to_flask() {
    let f = fixture(false);
    reader_state(&f);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    // 502: the fixture's Flask is down, so reaching it is what these cases must do
    for extra in [
        vec![("Cookie", "session=abc")],
        vec![("Authorization", "Basic eDp5")],
        vec![("Accept-Language", "id;q=\"x\"")], // a header Werkzeug parses differently
    ] {
        assert_eq!(
            reader(&f, &extra).await.0,
            StatusCode::BAD_GATEWAY,
            "{extra:?}"
        );
    }
    let (status, _, _) = get(&f, "/read/99/pdf", None).await; // unknown book: Flask redirects
    assert_eq!(status, StatusCode::BAD_GATEWAY);
    // a book the guest's language filter hides is Flask's redirect as well
    Connection::open(&f.app_db)
        .unwrap()
        .execute("UPDATE user SET default_language = 'ind' WHERE id = 1", [])
        .unwrap();
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    assert_eq!(reader(&f, &[]).await.0, StatusCode::BAD_GATEWAY);
}

/// The cache file name for the fixture's PDF at mtime 1_700_000_000.123456789 s, computed with CPython's
/// `json.dumps(request, sort_keys=True, separators=(",", ":"))` + sha256.
const OCR_CACHE_FILE: &str =
    "7-f6ee0b01563e8a866b5f9539dd051452f11c7cfeeb37a2ebca03332975e96f8e.json";

fn ocr_ready(f: &Fixture, result: &str) {
    let book = f
        ._dir
        .path()
        .join("library/Author/Cafe (7)/Cafe Muller.pdf");
    let file = std::fs::OpenOptions::new().write(true).open(&book).unwrap();
    file.set_modified(std::time::UNIX_EPOCH + std::time::Duration::new(1_700_000_000, 123_456_789))
        .unwrap();
    let cache = f._dir.path().join("ocr");
    std::fs::create_dir_all(&cache).unwrap();
    std::fs::write(
        cache.join(OCR_CACHE_FILE),
        format!("{{\"request\":{{}},\"result\":{result}}}"),
    )
    .unwrap();
}

const READY: &str = r#"{"status":"ready","markdown_html":"<p>x</p>","page_count":3,"pages_routed_to_ocr":1,"processing_time_ms":9}"#;

#[tokio::test]
async fn ocr_status_answers_a_cached_document_like_flask() {
    let f = fixture(false);
    reader_state(&f);
    ocr_ready(&f, READY);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    for uri in [
        "/api/read/7/ocr/status",
        "/api/read/7/ocr/status/pdf",
        "/api/read/7/ocr/status/PDF",
    ] {
        let (status, headers, body) = get(&f, uri, None).await;
        assert_eq!(status, StatusCode::OK, "{uri}");
        assert_eq!(body, b"{\"available\":true,\"state\":null}\n", "{uri}");
        assert_eq!(headers[header::CONTENT_TYPE], "application/json");
        assert_eq!(headers[header::VARY], "Cookie");
        assert!(headers.get(header::CACHE_CONTROL).is_none());
    }
}

#[tokio::test]
async fn ocr_status_leaves_everything_it_cannot_prove_to_flask() {
    // 502 = reached Flask (down in the fixture). A miss must never be answered `available: false` from here: Flask
    // asks the in-memory job queue, extracts an EPUB inline and rejects a non-PDF file.
    let f = fixture(false);
    reader_state(&f);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    assert_eq!(
        get(&f, "/api/read/7/ocr/status/pdf", None).await.0,
        StatusCode::BAD_GATEWAY,
        "cache miss"
    );

    ocr_ready(&f, READY);
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    for uri in [
        "/api/read/7/ocr/status/pdf/",  // trailing slash is a Flask 404
        "/api/read/7/ocr/status/epub",  // no EPUB format on this book
        "/api/read/7/ocr/status/txt",   // not an OCR format
        "/api/read/07x/ocr/status/pdf", // not an int
        "/api/read/99/ocr/status/pdf",  // unknown book
    ] {
        assert_eq!(get(&f, uri, None).await.0, StatusCode::BAD_GATEWAY, "{uri}");
    }
    // identity stays with Flask even for a cached book
    for (name, value) in [("Cookie", "session=abc"), ("Authorization", "Basic eDp5")] {
        let request = Request::builder()
            .uri("/api/read/7/ocr/status/pdf")
            .header(header::HOST, "pustaka.example")
            .header(name, value)
            .body(Body::empty())
            .unwrap();
        let response = f.app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY, "{name}");
    }
    // a cache file that is not a finished result is a miss, not an answer
    ocr_ready(&f, r#"{"status":"queued"}"#);
    assert_eq!(
        get(&f, "/api/read/7/ocr/status/pdf", None).await.0,
        StatusCode::BAD_GATEWAY
    );
    ocr_ready(
        &f,
        r#"{"status":"ready","markdown_html":"x","page_count":"many"}"#,
    );
    assert_eq!(
        get(&f, "/api/read/7/ocr/status/pdf", None).await.0,
        StatusCode::BAD_GATEWAY
    );
}

#[tokio::test]
async fn ocr_status_follows_the_guest_role_and_archive_at_once() {
    let f = fixture(false);
    reader_state(&f);
    ocr_ready(&f, READY);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    assert_eq!(
        get(&f, "/api/read/7/ocr/status/pdf", None).await.0,
        StatusCode::OK
    );
    let app = Connection::open(&f.app_db).unwrap();
    app.execute("UPDATE user SET role = 34 WHERE id = 1", [])
        .unwrap(); // viewer role taken away
    assert_eq!(
        get(&f, "/api/read/7/ocr/status/pdf", None).await.0,
        StatusCode::BAD_GATEWAY
    );
    app.execute("UPDATE user SET role = 34 | 256 WHERE id = 1", [])
        .unwrap();
    assert_eq!(
        get(&f, "/api/read/7/ocr/status/pdf", None).await.0,
        StatusCode::OK
    );
    // an archived book of the guest hides it in Flask (`get_filtered_book`), which Rust does not model
    app.execute(
        "INSERT INTO archived_book (user_id, book_id, is_archived) VALUES (1, 7, 1)",
        [],
    )
    .unwrap();
    assert_eq!(
        get(&f, "/api/read/7/ocr/status/pdf", None).await.0,
        StatusCode::BAD_GATEWAY
    );
}

#[tokio::test]
async fn the_cached_document_is_flasks_jsonify_body() {
    let f = fixture(false);
    reader_state(&f);
    ocr_ready(&f, READY);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    // jsonify sorts keys and escapes non-ASCII: the title's é is \u00e9, and the body ends with a newline.
    let expected = "{\"book\":{\"id\":7,\"title\":\"Caf\\u00e9 M\\u00fcller\"},\"document\":{\"markdown_html\":\"<p>x</p>\",\"page_count\":3,\"pages_routed_to_ocr\":1,\"processing_time_ms\":9}}\n";
    for uri in [
        "/api/read/7/ocr",
        "/api/read/7/ocr/pdf",
        "/api/read/7/ocr/PDF",
    ] {
        let (status, headers, body) = get(&f, uri, None).await;
        assert_eq!(status, StatusCode::OK, "{uri}");
        assert_eq!(String::from_utf8_lossy(&body), expected, "{uri}");
        assert_eq!(headers[header::CONTENT_TYPE], "application/json");
        assert_eq!(headers[header::VARY], "Cookie");
        assert_eq!(headers[header::CACHE_CONTROL], "private, no-store");
    }
    // a miss is Flask's 202/404, never a body from here
    ocr_ready(&f, r#"{"status":"queued"}"#);
    assert_eq!(
        get(&f, "/api/read/7/ocr/pdf", None).await.0,
        StatusCode::BAD_GATEWAY
    );
}

// ── readium ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/// An EPUB with one clean chapter and one carrying a `<script>`; the dirty one must never leave Rust.
fn write_epub(f: &Fixture, dirty: bool) {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    let path = f
        ._dir
        .path()
        .join("library/Author/Cafe (7)/Cafe Muller.epub");
    let file = std::fs::File::create(&path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
    let mut put = |name: &str, data: &[u8]| {
        zip.start_file(name, options).unwrap();
        zip.write_all(data).unwrap();
    };
    put(
        "META-INF/container.xml",
        br#"<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>"#,
    );
    put(
        "OEBPS/content.opf",
        br#"<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Caf&#233; &amp; co</dc:title><dc:creator>An Author</dc:creator><dc:language>id</dc:language></metadata><manifest><item id="ch" href="text/ch.xhtml" media-type="application/xhtml+xml"/><item id="css" href="style.css" media-type="text/css"/></manifest><spine><itemref idref="ch"/></spine></package>"#,
    );
    if dirty {
        put(
            "OEBPS/text/ch.xhtml",
            br#"<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p onclick="x()">hi</p><script>alert(1)</script></body></html>"#,
        );
    } else {
        put(
            "OEBPS/text/ch.xhtml",
            br#"<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p>Hal&#233; &amp; dunia</p></body></html>"#,
        );
    }
    put("OEBPS/style.css", b"p { color: red }\n");
}

async fn readium(
    epub_format_rows: bool,
    dirty: bool,
    uri: &str,
    extra: &[(&str, &str)],
) -> (StatusCode, axum::http::HeaderMap, Vec<u8>) {
    let f = fixture(false);
    reader_state(&f);
    if epub_format_rows {
        Connection::open(f._dir.path().join("library/metadata.db"))
            .unwrap()
            .execute(
                "INSERT INTO data VALUES (2, 7, 'EPUB', 0, 'Cafe Muller')",
                [],
            )
            .unwrap();
        write_epub(&f, dirty);
    }
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    let mut request = Request::builder()
        .uri(uri)
        .header(header::HOST, "pustaka.example");
    for (name, value) in extra {
        request = request.header(*name, *value);
    }
    let response = f
        .app
        .clone()
        .oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    (
        parts.status,
        parts.headers,
        body.collect().await.unwrap().to_bytes().to_vec(),
    )
}

#[tokio::test]
async fn readium_serves_a_clean_chapter_byte_for_byte() {
    let (status, headers, body) =
        readium(true, false, "/show/readium/7/OEBPS/text/ch.xhtml", &[]).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers[header::CONTENT_TYPE], "application/xhtml+xml");
    assert_eq!(headers[header::CACHE_CONTROL], "private, no-cache");
    assert_eq!(headers["x-robots-tag"], "noindex");
    assert!(body.starts_with(b"<?xml"));
    assert!(body.ends_with(b"</html>"));
    let (status, headers, _) = readium(true, false, "/show/readium/7/OEBPS/style.css", &[]).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers[header::CONTENT_TYPE], "text/css");
}

#[tokio::test]
async fn readium_hands_markup_it_would_rewrite_to_flask() {
    // A `<script>` member: lxml strips it and re-serialises, so only Flask can answer with the same bytes.
    let (status, _, _) = readium(true, true, "/show/readium/7/OEBPS/text/ch.xhtml", &[]).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY);
    // A book without EPUB, a missing member and an odd path are Flask's 404s too.
    for uri in [
        "/show/readium/7/OEBPS/missing.xhtml",
        "/show/readium/7/OEBPS/../content.opf",
        "/show/readium/99/manifest.json",
    ] {
        assert_eq!(
            readium(true, false, uri, &[]).await.0,
            StatusCode::BAD_GATEWAY,
            "{uri}"
        );
    }
    assert_eq!(
        readium(false, false, "/show/readium/7/manifest.json", &[])
            .await
            .0,
        StatusCode::BAD_GATEWAY
    );
}

async fn on(
    f: &Fixture,
    uri: &str,
    extra: &[(&str, &str)],
) -> (StatusCode, axum::http::HeaderMap, Vec<u8>) {
    let mut request = Request::builder()
        .uri(uri)
        .header(header::HOST, "pustaka.example");
    for (name, value) in extra {
        request = request.header(*name, *value);
    }
    let response = f
        .app
        .clone()
        .oneshot(request.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    (
        parts.status,
        parts.headers,
        body.collect().await.unwrap().to_bytes().to_vec(),
    )
}

#[tokio::test]
async fn readium_manifest_and_positions_match_readium_shapes() {
    let f = fixture(false);
    reader_state(&f);
    Connection::open(f._dir.path().join("library/metadata.db"))
        .unwrap()
        .execute(
            "INSERT INTO data VALUES (2, 7, 'EPUB', 0, 'Cafe Muller')",
            [],
        )
        .unwrap();
    write_epub(&f, false);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    let (status, headers, body) = on(&f, "/show/readium/7/manifest.json", &[]).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers[header::CONTENT_TYPE], "application/webpub+json");
    let etag = headers[header::ETAG].to_str().unwrap().to_owned();
    assert!(
        etag.starts_with('"') && etag.ends_with('"') && etag[1..].contains('-'),
        "{etag}"
    );
    let text = String::from_utf8(body).unwrap();
    // `json.dumps` separators and order: @context, metadata, readingOrder, resources, toc, links.
    assert!(text.starts_with("{\"@context\": \"https://readium.org/webpub-manifest/context.jsonld\", \"metadata\": {\"title\": \"Caf\\u00e9 & co\""));
    assert!(text.contains("\"readingOrder\": [{\"href\": \"OEBPS/text/ch.xhtml\", \"type\": \"application/xhtml+xml\"}]"));
    assert!(text.contains("\"href\": \"positions.json\""));
    // Same identity, conditional request: 304 with the same headers.
    let (status, conditional, empty) = on(
        &f,
        "/show/readium/7/manifest.json",
        &[("If-None-Match", &etag)],
    )
    .await;
    assert_eq!(status, StatusCode::NOT_MODIFIED);
    assert!(empty.is_empty());
    assert_eq!(conditional[header::ETAG], etag);
    let (status, _, positions) = on(&f, "/show/readium/7/positions.json", &[]).await;
    assert_eq!(status, StatusCode::OK);
    let text = String::from_utf8(positions).unwrap();
    assert!(text.starts_with("{\"total\": 1, \"positions\": [{\"href\": \"OEBPS/text/ch.xhtml\""));
    assert!(text.contains("\"progression\": 0.0, \"totalProgression\": 0.0"));
}

// ── Flask session cookie ────────────────────────────────────────────────────────────────────────────────────────────
/// A cookie signed exactly as Flask's `URLSafeTimedSerializer(..., salt="cookie-session", key_derivation="hmac",
/// digest_method=sha1)` writes it: `base64url(zlib-json or json).timestamp.signature`, the signature over
/// `payload.timestamp` with `HMAC-SHA1(HMAC-SHA1(secret, salt), ...)` and the timestamp as 4 big-endian bytes.
fn flask_cookie(payload: &str, key: &[u8], issued: u64) -> String {
    use base64_like::encode as b64;
    use hmac::{Hmac, KeyInit, Mac};
    use sha1::Sha1;
    let derive = |key: &[u8], message: &[u8]| {
        let mut mac = Hmac::<Sha1>::new_from_slice(key).unwrap();
        mac.update(message);
        mac.finalize().into_bytes().to_vec()
    };
    let derived = derive(key, b"cookie-session");
    let json = payload.as_bytes();
    let mut encoder = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::default());
    use std::io::Write;
    encoder.write_all(json).unwrap();
    let compressed = encoder.finish().unwrap();
    let body = if compressed.len() < json.len() - 1 {
        format!(".{}", b64(&compressed))
    } else {
        b64(json)
    };
    let timestamp = b64(&issued.to_be_bytes());
    let mut mac = Hmac::<Sha1>::new_from_slice(&derived).unwrap();
    mac.update(format!("{body}.{timestamp}").as_bytes());
    let signature = b64(&mac.finalize().into_bytes());
    format!("{body}.{timestamp}.{signature}")
}

/// itsdangerous' `base64_encode`: URL-safe alphabet, padding stripped.
mod base64_like {
    pub fn encode(data: &[u8]) -> String {
        const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        let mut out = String::new();
        for chunk in data.chunks(3) {
            let b = [
                chunk[0],
                *chunk.get(1).unwrap_or(&0),
                *chunk.get(2).unwrap_or(&0),
            ];
            let n = u32::from(b[0]) << 16 | u32::from(b[1]) << 8 | u32::from(b[2]);
            let chars = [
                ALPHABET[(n >> 18) as usize & 63],
                ALPHABET[(n >> 12) as usize & 63],
                ALPHABET[(n >> 6) as usize & 63],
                ALPHABET[n as usize & 63],
            ];
            let take = chunk.len() + 1;
            for ch in &chars[..take] {
                out.push(*ch as char);
            }
        }
        out
    }
}

fn session_state(f: &Fixture, user_id: i64, role: i64, denied: &str) {
    let app = Connection::open(&f.app_db).unwrap();
    app.execute(
        "INSERT INTO user (id, name, role, default_language, denied_tags, allowed_tags) VALUES (?1, 'Reader', ?2, 'all', ?3, '')",
        rusqlite::params![user_id, role, denied],
    )
    .unwrap();
    app.execute(
        "INSERT INTO user_session (user_id, session_key, random, expiry) VALUES (?1, 'sid', 'rnd', 0)",
        [user_id],
    )
    .unwrap();
}

fn session_cookie(user_id: i64) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    flask_cookie(
        &format!(
            "{{\"_user_id\":\"{user_id}\",\"_id\":\"sid\",\"_random\":\"rnd\",\"csrf_token\":\"t\"}}"
        ),
        KEY,
        now,
    )
}

#[tokio::test]
async fn readium_serves_a_logged_in_user_with_that_users_filters() {
    let f = fixture(false);
    reader_state(&f);
    Connection::open(f._dir.path().join("library/metadata.db"))
        .unwrap()
        .execute(
            "INSERT INTO data VALUES (2, 7, 'EPUB', 0, 'Cafe Muller')",
            [],
        )
        .unwrap();
    write_epub(&f, false);
    let cookie = session_cookie(3);
    // A user whose denied tag matches the fixture book sees Flask's 404; without the deny, the publication loads.
    Connection::open(f._dir.path().join("library/metadata.db")).unwrap()
        .execute_batch(
            "INSERT INTO tags VALUES (1, 'Fiction'); INSERT INTO books_tags_link (book, tag) VALUES (7, 1);",
        )
        .unwrap();
    session_state(&f, 3, 34 | 256, "Fiction");
    let denied = format!("session={cookie}");
    assert_eq!(
        on(&f, "/show/readium/7/manifest.json", &[("Cookie", &denied)])
            .await
            .0,
        StatusCode::BAD_GATEWAY
    );
    Connection::open(&f.app_db)
        .unwrap()
        .execute("UPDATE user SET denied_tags = '' WHERE id = 3", [])
        .unwrap();
    let (status, headers, body) =
        on(&f, "/show/readium/7/manifest.json", &[("Cookie", &denied)]).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers[header::CONTENT_TYPE], "application/webpub+json");
    assert!(
        String::from_utf8(body)
            .unwrap()
            .contains("\"title\": \"Caf\\u00e9 & co\"")
    );
    // A cookie that does not verify is Flask's, never the guest's answer.
    let tampered = format!("session={cookie}x");
    assert_eq!(
        on(
            &f,
            "/show/readium/7/manifest.json",
            &[("Cookie", &tampered)]
        )
        .await
        .0,
        StatusCode::BAD_GATEWAY
    );
    // Revoked session row: Flask loads no user, so the guest answer is the same one Flask would give.
    Connection::open(&f.app_db)
        .unwrap()
        .execute("DELETE FROM user_session WHERE user_id = 3", [])
        .unwrap();
    assert_eq!(
        on(&f, "/show/readium/7/manifest.json", &[("Cookie", &denied)])
            .await
            .0,
        StatusCode::OK
    );
}

#[test]
fn session_cookie_round_trips_the_flask_signer() {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let cookie = flask_cookie(
        "{\"_user_id\":\"3\",\"_id\":\"sid\",\"_random\":\"rnd\"}",
        KEY,
        now,
    );
    let payload =
        taratsa_backend::session::decode(&cookie, &[KEY.to_vec()], now).expect("verifies");
    assert_eq!(payload["_user_id"], "3");
    assert_eq!(payload["_random"], "rnd");
    assert!(taratsa_backend::session::decode(&cookie, &[b"other".to_vec()], now).is_none());
    assert!(
        taratsa_backend::session::decode(&cookie, &[KEY.to_vec()], now + 40 * 24 * 3600).is_none()
    );
}

#[test]
fn session_cookie_from_itsdangerous_decodes() {
    // A cookie produced by the app image's own itsdangerous with the fixture key:
    //   URLSafeTimedSerializer(KEY, salt="cookie-session", serializer=TaggedJSONSerializer(),
    //                          signer_kwargs={"key_derivation": "hmac", "digest_method": sha1})
    let (Ok(cookie), Ok(payload), Ok(issued)) = (
        std::env::var("SESSION_TEST_COOKIE"),
        std::env::var("SESSION_TEST_PAYLOAD"),
        std::env::var("SESSION_TEST_ISSUED"),
    ) else {
        return;
    };
    let issued: u64 = issued.parse().unwrap();
    let decoded = taratsa_backend::session::decode(&cookie, &[KEY.to_vec()], issued + 5)
        .expect("a cookie from itsdangerous must verify");
    assert_eq!(decoded["_user_id"], "3");
    assert_eq!(decoded["_id"], "sid");
    assert_eq!(decoded["_random"], payload);
}

// ── EPUB reader shell (guest) ──────────────────────────────────────────────────────────────────────────────────────
#[tokio::test]
async fn epub_page_mints_a_flask_session_and_csrf_token_for_a_guest() {
    let f = fixture(false);
    reader_state(&f);
    Connection::open(f._dir.path().join("library/metadata.db"))
        .unwrap()
        .execute(
            "INSERT INTO data VALUES (2, 7, 'EPUB', 0, 'Cafe Muller')",
            [],
        )
        .unwrap();
    write_epub(&f, false);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    let (status, headers, body) = on(&f, "/read/7/epub", &[("Accept-Language", "de")]).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers["x-robots-tag"], "noindex");
    let cookie = headers[header::SET_COOKIE].to_str().unwrap().to_owned();
    assert!(
        cookie.starts_with("session=")
            && cookie.contains("HttpOnly")
            && cookie.contains("SameSite=Lax"),
        "{cookie}"
    );
    let text = String::from_utf8(body).unwrap();
    assert!(!text.contains("{{") && !text.contains("{%"));
    assert!(
        text.contains("| Café Müller</title>"),
        "the title is escaped text, not JSON"
    );
    assert!(
        text.contains("Einstellungen"),
        "the German catalog translated the labels"
    );
    assert!(text.contains("useBookmarks: false"));
    // The cookie it set decodes with the very key that signed it, and holds only the CSRF value.
    let value = cookie
        .trim_start_matches("session=")
        .split(';')
        .next()
        .unwrap();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let payload =
        taratsa_backend::session::decode(value, &[KEY.to_vec()], now).expect("cookie verifies");
    assert_eq!(payload.as_object().unwrap().len(), 1);
    assert_eq!(payload["csrf_token"].as_str().unwrap().len(), 40);
    // A returning visitor reuses that CSRF value and gets no new cookie.
    let (status, headers, _) = on(
        &f,
        "/read/7/epub",
        &[("Cookie", &format!("session={value}"))],
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert!(headers.get(header::SET_COOKIE).is_none());
}

#[tokio::test]
async fn epub_page_leaves_users_and_odd_cookies_to_flask() {
    let f = fixture(false);
    reader_state(&f);
    Connection::open(f._dir.path().join("library/metadata.db"))
        .unwrap()
        .execute(
            "INSERT INTO data VALUES (2, 7, 'EPUB', 0, 'Cafe Muller')",
            [],
        )
        .unwrap();
    write_epub(&f, false);
    tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
    // 502 = reached Flask (down in the fixture).
    assert_eq!(
        on(&f, "/read/7/epub", &[("Cookie", "session=garbage")])
            .await
            .0,
        StatusCode::BAD_GATEWAY
    );
    let user = session_cookie(3);
    assert_eq!(
        on(
            &f,
            "/read/7/epub",
            &[("Cookie", &format!("session={user}"))]
        )
        .await
        .0,
        StatusCode::BAD_GATEWAY
    );
    assert_eq!(
        on(&f, "/read/99/epub", &[]).await.0,
        StatusCode::BAD_GATEWAY
    );
    assert_eq!(
        on(&f, "/read/7/kepub", &[]).await.0,
        StatusCode::BAD_GATEWAY
    );
    assert_eq!(
        on(&f, "/read/7/epub/", &[]).await.0,
        StatusCode::BAD_GATEWAY
    );
}
