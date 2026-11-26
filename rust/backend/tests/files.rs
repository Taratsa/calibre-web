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
         INSERT INTO books VALUES (7, 'Café Müller', 'Author/Cafe (7)', '2023-10-27 07:56:53.123456', 1);
         INSERT INTO authors VALUES (1, 'First Author'), (2, 'Second Author');
         INSERT INTO books_authors_link (book, author) VALUES (7, 2), (7, 1);",
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
         CREATE TABLE user (id INTEGER PRIMARY KEY, role INTEGER, default_language TEXT, denied_tags TEXT, allowed_tags TEXT);
         CREATE TABLE archived_book (id INTEGER PRIMARY KEY, user_id INTEGER, book_id INTEGER, is_archived INTEGER);
         CREATE TABLE flask_settings (id INTEGER PRIMARY KEY, flask_session_key BLOB);",
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
    app.execute("INSERT INTO user VALUES (1, 32, 'all', '', '')", [])
        .unwrap();

    let mut state = Arc::new(AppState::new(app_db, 2));
    Arc::get_mut(&mut state).unwrap().cache_directory = dir.path().join("cache");
    Arc::get_mut(&mut state).unwrap().static_directory = dir.path().join("static");
    std::fs::create_dir_all(dir.path().join("static")).unwrap();
    std::fs::write(dir.path().join("static/generic_cover.jpg"), b"generic").unwrap();
    Arc::get_mut(&mut state).unwrap().proxy_url = "http://127.0.0.1:1".into();
    let version = format!("{}-{}", 1_698_393_413, BODY.len());
    Fixture {
        app: router(state),
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
    assert!(headers.get(header::VARY).is_none());
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
async fn bad_signature_is_404_and_reveals_nothing() {
    let f = fixture(false);
    let (status, headers, body) = get(&f, &url(&f, &"0".repeat(32)), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    // a 404 must never be cached at the edge (Flask's NO_CACHE_HEADERS)
    assert_eq!(
        headers[header::CACHE_CONTROL],
        "no-store, no-cache, must-revalidate"
    );
    assert_eq!(headers["cloudflare-cdn-cache-control"], "no-store");
    assert!(!body.windows(3).any(|w| w == b"PDF"));
    // a signature valid for a different book does not open this one
    let other = signing::signature(KEY, 8, "pdf", &f.version);
    assert_eq!(
        get(&f, &url(&f, &other), None).await.0,
        StatusCode::NOT_FOUND
    );
}

#[tokio::test]
async fn unknown_book_or_format_is_404() {
    let f = fixture(false);
    let sig = signing::signature(KEY, 99, "pdf", &f.version);
    assert_eq!(
        get(&f, &format!("/files/99/pdf/{}/{sig}", f.version), None)
            .await
            .0,
        StatusCode::NOT_FOUND
    );
    let sig = signing::signature(KEY, 7, "epub", &f.version);
    assert_eq!(
        get(&f, &format!("/files/7/epub/{}/{sig}", f.version), None)
            .await
            .0,
        StatusCode::NOT_FOUND
    );
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
