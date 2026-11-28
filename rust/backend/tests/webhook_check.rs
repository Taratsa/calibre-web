//! `/api/webhook/check` end to end: the upload bot's pre-upload search. The library is a throwaway `metadata.db`; the
//! fixture accounts carry the roles the live ones have (`hermes` 260: download + upload).

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use rusqlite::Connection;
use std::sync::Arc;
use taratsa_backend::{AppState, router};
use tempfile::TempDir;
use tower::ServiceExt;

const KEY: &[u8] = b"fixture-secret-key-for-the-author-tests";
/// `werkzeug.security.generate_password_hash("correct horse")`.
const PASSWORD_HASH: &str = "scrypt:32768:8:1$1yLzFeV2rbxMEaDC$948a24aa72cd2c4e8a079a0417a5140870e49c11175916e081f85da20862a206b2b8a881e821aa50c92e5d6405bdd39939e36c2ee9463a9f93cf6a8e474d0180";

struct Fixture {
    #[allow(dead_code)]
    dir: TempDir,
    app: axum::Router,
    #[allow(dead_code)]
    app_db: std::path::PathBuf,
    #[allow(dead_code)]
    metadata: std::path::PathBuf,
}

fn fixture() -> Fixture {
    let dir = TempDir::new().unwrap();
    let library = dir.path().join("library");
    std::fs::create_dir_all(&library).unwrap();
    for (path, file) in [
        ("abc/Solo (10)", "Solo.pdf"),
        ("abc/Second (11)", "Second.epub"),
        ("Other Person/Unrelated (12)", "Unrelated.pdf"),
    ] {
        std::fs::create_dir_all(library.join(path)).unwrap();
        std::fs::write(library.join(path).join(file), b"x").unwrap();
    }
    let metadata = library.join("metadata.db");
    let meta = Connection::open(&metadata).unwrap();
    meta.execute_batch(
        "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL COLLATE NOCASE, sort TEXT, author_sort TEXT,
            last_modified TIMESTAMP, path TEXT, timestamp TIMESTAMP, series_index REAL DEFAULT 1);
         CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
            sort TEXT COLLATE NOCASE, link TEXT NOT NULL DEFAULT '');
         CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, author INTEGER NOT NULL,
            UNIQUE(book, author));
         CREATE TABLE metadata_dirtied (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE);
         CREATE TRIGGER books_update_trg AFTER UPDATE ON books BEGIN
            UPDATE books SET sort=title_sort(NEW.title) WHERE id=NEW.id AND OLD.title <> NEW.title; END;
         CREATE TABLE custom_columns (id INTEGER PRIMARY KEY, label TEXT);
         CREATE TABLE duplicate_settings (id INTEGER PRIMARY KEY, detection_enabled INTEGER);
         CREATE TABLE duplicate_index_cache (id INTEGER PRIMARY KEY, criteria_fingerprint TEXT);
         CREATE TABLE duplicate_book_key (book_id INTEGER PRIMARY KEY, duplicate_key TEXT, criteria_fingerprint TEXT);
         INSERT INTO duplicate_settings VALUES (1, 1);
         INSERT INTO duplicate_index_cache VALUES (1, 'fp');
         INSERT INTO duplicate_book_key VALUES (10, 'same', 'fp'), (12, 'same', 'fp'), (11, 'other', 'fp');
         CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, format TEXT NOT NULL COLLATE NOCASE, uncompressed_size INTEGER, name TEXT NOT NULL);
         CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT);
         CREATE TABLE books_tags_link (id INTEGER PRIMARY KEY, book INTEGER, tag INTEGER);
         CREATE TABLE series (id INTEGER PRIMARY KEY, name TEXT);
         CREATE TABLE books_series_link (id INTEGER PRIMARY KEY, book INTEGER, series INTEGER);
         CREATE TABLE publishers (id INTEGER PRIMARY KEY, name TEXT);
         CREATE TABLE books_publishers_link (id INTEGER PRIMARY KEY, book INTEGER, publisher INTEGER);
         CREATE TABLE languages (id INTEGER PRIMARY KEY, lang_code TEXT);
         CREATE TABLE books_languages_link (id INTEGER PRIMARY KEY, book INTEGER, lang_code INTEGER);
         INSERT INTO tags VALUES (1, 'Sejarah'), (2, 'Sastra');
         INSERT INTO books_tags_link (book, tag) VALUES (10, 1), (11, 1), (12, 2);
         INSERT INTO publishers VALUES (1, 'Penerbit Satu');
         INSERT INTO languages VALUES (1, 'ind');
         INSERT INTO books_languages_link (book, lang_code) VALUES (10, 1);
         INSERT INTO authors VALUES (1, 'abc', 'abc', ''), (2, 'Other Person', 'Person, Other', '');
         INSERT INTO books (id, title, author_sort, last_modified, path, timestamp) VALUES
            (10, 'Solo <b>', 'abc', '2020-01-01 00:00:00', 'abc/Solo (10)', '2020-01-03 04:05:06.123456'),
            (11, 'Second', 'abc', '2020-01-01 00:00:00', 'abc/Second (11)', '2020-01-02 04:05:06.123456'),
            (12, 'Unrelated', 'Person, Other', '2020-01-01 00:00:00', 'Other Person/Unrelated (12)', '2020-01-01');
         INSERT INTO data (book, format, uncompressed_size, name) VALUES
            (10, 'PDF', 3, 'Solo'), (11, 'EPUB', 3, 'Second'), (12, 'PDF', 3, 'Unrelated');
         INSERT INTO books_authors_link (book, author) VALUES (10,1),(11,1),(12,2);",
    )
    .unwrap();

    let app_db = dir.path().join("app.db");
    let app = Connection::open(&app_db).unwrap();
    app.execute_batch(&format!(
        "CREATE TABLE settings (config_use_google_drive INTEGER, config_embed_metadata INTEGER,
            config_unicode_filename INTEGER, config_binariesdir TEXT, config_kepubifypath TEXT,
            config_calibre_dir TEXT, config_calibre_split INTEGER, config_calibre_split_dir TEXT,
            config_trustedhosts TEXT, config_calibre_web_title TEXT, config_anonbrowse INTEGER,
            config_restricted_column INTEGER, config_allow_reverse_proxy_header_login INTEGER,
            config_reverse_proxy_login_header_name TEXT, config_login_type INTEGER,
            config_remote_login INTEGER, mail_server TEXT);
         CREATE TABLE user (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT, role INTEGER,
            default_language TEXT, denied_tags TEXT, allowed_tags TEXT,
            twofa_secret TEXT, twofa_last_step INTEGER, twofa_recovery TEXT, twofa_enabled_at TEXT);
         CREATE TABLE user_session (id INTEGER PRIMARY KEY, user_id INTEGER, session_key VARCHAR,
            random VARCHAR, expiry INTEGER);
         CREATE TABLE archived_book (id INTEGER PRIMARY KEY, user_id INTEGER, book_id INTEGER, is_archived BOOLEAN, last_modified DATETIME);
         CREATE TABLE kobo_synced_books (id INTEGER PRIMARY KEY, user_id INTEGER, book_id INTEGER);
         INSERT INTO kobo_synced_books (user_id, book_id) VALUES (1, 10), (2, 10);
         CREATE TABLE thumbnail (id INTEGER PRIMARY KEY, entity_id INTEGER, type SMALLINT, resolution SMALLINT);
         CREATE TABLE audit_log (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, action VARCHAR(64) NOT NULL,
            resource_type VARCHAR(64) NOT NULL, resource_id VARCHAR, details VARCHAR, ip_address VARCHAR,
            created DATETIME);
         CREATE TABLE flask_settings (id INTEGER PRIMARY KEY, flask_session_key BLOB);
         INSERT INTO settings VALUES (0, 0, 0, '', '', '{library}', 0, '', 'https://stats.example', 'Pustaka', 1, 0, 0, '', 0, 0, 'mail.example.org');
         INSERT INTO flask_settings (flask_session_key) VALUES (x'{key}');
         INSERT INTO user VALUES (1, 'adminzxc', 'a@example.org', '{hash}', 479, 'all', '', '', NULL, NULL, NULL, NULL);
         INSERT INTO user VALUES (4, 'hermes', 'h@example.org', '{hash}', 260, 'all', '', '', NULL, NULL, NULL, NULL);
         INSERT INTO user VALUES (2, 'Guest', '', '', 290, 'id', '', '', NULL, NULL, NULL, NULL);",
        library = library.display(),
        key = hex::encode(KEY),
        hash = PASSWORD_HASH,
    ))
    .unwrap();
    let mut state = Arc::new(AppState::new(app_db.clone(), 1));
    {
        let state = Arc::get_mut(&mut state).unwrap();
        state.secret_key_override = Some(KEY.to_vec());
        state.proxy_url = "http://127.0.0.1:1".into();
        state.umami_url = None;
    }
    Fixture {
        app: router(state),
        app_db,
        metadata,
        dir,
    }
}

struct Reply {
    status: StatusCode,
    headers: axum::http::HeaderMap,
    body: String,
}

impl Reply {
    fn cookie_pair(&self) -> Option<String> {
        let values: Vec<String> = self
            .headers
            .get_all(header::SET_COOKIE)
            .iter()
            .filter_map(|v| v.to_str().ok())
            .map(|c| c.split(';').next().unwrap_or("").to_owned())
            .filter(|pair| !pair.ends_with('='))
            .collect();
        (!values.is_empty()).then(|| values.join("; "))
    }

    #[allow(dead_code)]
    fn location(&self) -> &str {
        self.headers
            .get(header::LOCATION)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
    }

    fn csrf(&self) -> String {
        let marker = "name=\"csrf_token\" value=\"";
        let start = self.body.find(marker).expect("a CSRF token") + marker.len();
        self.body[start..].split('"').next().unwrap().to_owned()
    }
}

async fn call(
    f: &Fixture,
    method: &str,
    uri: &str,
    cookie: Option<&str>,
    body: Option<String>,
) -> Reply {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header(header::HOST, "pustaka.example")
        .header(header::USER_AGENT, "author-tests")
        .header("x-forwarded-for", "203.0.113.9");
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    let body = match body {
        Some(body) => {
            builder = builder.header(header::CONTENT_TYPE, "application/x-www-form-urlencoded");
            Body::from(body)
        }
        None => Body::empty(),
    };
    let response = f
        .app
        .clone()
        .oneshot(builder.body(body).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    Reply {
        status: parts.status,
        headers: parts.headers,
        body: String::from_utf8_lossy(&body.collect().await.unwrap().to_bytes()).into_owned(),
    }
}

/// Log in through the real form and return the minted session cookie.
async fn login(f: &Fixture, user: &str) -> String {
    let page = call(f, "GET", "/login", None, None).await;
    let cookie = page.cookie_pair().expect("anonymous session");
    let token = page.csrf();
    let reply = call(
        f,
        "POST",
        "/login",
        Some(&cookie),
        Some(format!(
            "username={user}&password=correct+horse&csrf_token={token}&next=%2F"
        )),
    )
    .await;
    assert_eq!(reply.status, StatusCode::FOUND, "{}", reply.body);
    reply.cookie_pair().expect("the logged-in session")
}

#[tokio::test]
async fn the_check_needs_a_signed_in_account_and_a_title_or_author() {
    let f = fixture();
    let anonymous = call(&f, "GET", "/api/webhook/check?title=zine", None, None).await;
    assert_eq!(anonymous.status, StatusCode::UNAUTHORIZED);
    assert!(anonymous.body.contains("Authentication required"));
    assert_eq!(
        anonymous.headers[header::CACHE_CONTROL],
        "private, no-store"
    );

    let hermes = login(&f, "hermes").await;
    let neither = call(&f, "GET", "/api/webhook/check", Some(&hermes), None).await;
    assert_eq!(neither.status, StatusCode::BAD_REQUEST);
    assert!(neither.body.contains("At least one of"));
}

#[tokio::test]
async fn a_title_search_answers_flasks_document() {
    let f = fixture();
    let hermes = login(&f, "hermes").await;
    let reply = call(
        &f,
        "GET",
        "/api/webhook/check?title=Solo",
        Some(&hermes),
        None,
    )
    .await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.body);
    let json: serde_json::Value = serde_json::from_str(&reply.body).unwrap();
    assert_eq!(json["count"], 1, "{}", reply.body);
    assert_eq!(json["found"], true);
    // normalize_title keeps word characters, so "<b>" leaves a stray "b": same as Flask, and not an exact match
    assert_eq!(json["exact_match"], false);
    assert_eq!(
        json["is_duplicate"], true,
        "book 10 shares a duplicate key with 12"
    );
    let book = &json["results"][0];
    assert_eq!(book["book_id"], 10);
    assert_eq!(book["title"], "Solo <b>", "the title is sent as stored");
    assert_eq!(book["authors"], serde_json::json!(["abc"]));
    assert_eq!(book["formats"], serde_json::json!(["PDF"]));
    assert_eq!(book["url"], "http://pustaka.example/book/10/");
    assert_eq!(
        book["has_format"],
        serde_json::Value::Null,
        "no format filter -> null"
    );
    assert!(book.get("missing_formats").is_none());
    assert!(
        book["timestamp"].as_str().unwrap().contains('T'),
        "isoformat: {}",
        book["timestamp"]
    );
}

#[tokio::test]
async fn an_exact_title_is_reported_as_such() {
    let f = fixture();
    let hermes = login(&f, "hermes").await;
    let reply = call(
        &f,
        "GET",
        "/api/webhook/check?title=Second",
        Some(&hermes),
        None,
    )
    .await;
    let json: serde_json::Value = serde_json::from_str(&reply.body).unwrap();
    assert_eq!(json["exact_match"], true);
    assert_eq!(json["results"][0]["book_id"], 11);
}

#[tokio::test]
async fn an_author_search_works_where_flask_raised() {
    // The Flask route joined the authors relationship without a left side and answered 500 for every author query.
    let f = fixture();
    let hermes = login(&f, "hermes").await;
    let reply = call(
        &f,
        "GET",
        "/api/webhook/check?author=other",
        Some(&hermes),
        None,
    )
    .await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.body);
    let json: serde_json::Value = serde_json::from_str(&reply.body).unwrap();
    assert_eq!(json["count"], 1);
    assert_eq!(json["results"][0]["book_id"], 12);
    assert_eq!(json["partial"], false);

    // sort names match too ("Person, Other")
    let by_sort = call(
        &f,
        "GET",
        "/api/webhook/check?author=person",
        Some(&hermes),
        None,
    )
    .await;
    let json: serde_json::Value = serde_json::from_str(&by_sort.body).unwrap();
    assert_eq!(json["results"][0]["book_id"], 12);

    // every title word must match, and the author narrows further
    let both = call(
        &f,
        "GET",
        "/api/webhook/check?title=second&author=abc",
        Some(&hermes),
        None,
    )
    .await;
    let json: serde_json::Value = serde_json::from_str(&both.body).unwrap();
    assert_eq!(json["count"], 1);
    assert_eq!(json["results"][0]["book_id"], 11);
}

#[tokio::test]
async fn a_format_filter_reports_what_is_missing_and_a_useless_title_only_sets_partial() {
    let f = fixture();
    let hermes = login(&f, "hermes").await;
    let reply = call(
        &f,
        "GET",
        "/api/webhook/check?title=Solo&format=epub,pdf",
        Some(&hermes),
        None,
    )
    .await;
    let json: serde_json::Value = serde_json::from_str(&reply.body).unwrap();
    assert_eq!(json["results"][0]["has_format"], true);
    assert_eq!(
        json["results"][0]["missing_formats"],
        serde_json::json!(["EPUB"])
    );

    // "???" has no searchable word: Flask filters nothing and marks the answer partial
    let useless = call(
        &f,
        "GET",
        "/api/webhook/check?title=???",
        Some(&hermes),
        None,
    )
    .await;
    let json: serde_json::Value = serde_json::from_str(&useless.body).unwrap();
    assert_eq!(json["partial"], true);
    assert_eq!(json["count"], 3);
}

#[tokio::test]
async fn a_post_body_is_read_like_the_get_parameters() {
    let f = fixture();
    let hermes = login(&f, "hermes").await;
    let reply = call(
        &f,
        "POST",
        "/api/webhook/check",
        Some(&hermes),
        Some(r#"{"title": "second", "format": ".epub"}"#.into()),
    )
    .await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.body);
    let json: serde_json::Value = serde_json::from_str(&reply.body).unwrap();
    assert_eq!(json["count"], 1);
    assert_eq!(json["results"][0]["book_id"], 11);
    assert_eq!(json["results"][0]["has_format"], true);
}
