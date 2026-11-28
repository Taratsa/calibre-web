//! `/admin/authors` end to end through the router: who may use it, CSRF, the preview, the confirmed run, a stale
//! confirmation, the backup and the audit row. The library is a throwaway `metadata.db` with the real triggers'
//! shape, so nothing here touches `library/`.

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
    dir: TempDir,
    app: axum::Router,
    app_db: std::path::PathBuf,
    metadata: std::path::PathBuf,
}

fn fixture() -> Fixture {
    let dir = TempDir::new().unwrap();
    let library = dir.path().join("library");
    std::fs::create_dir_all(&library).unwrap();
    let metadata = library.join("metadata.db");
    let meta = Connection::open(&metadata).unwrap();
    meta.execute_batch(
        "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, sort TEXT, author_sort TEXT,
            last_modified TIMESTAMP, path TEXT);
         CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
            sort TEXT COLLATE NOCASE, link TEXT NOT NULL DEFAULT '');
         CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, author INTEGER NOT NULL,
            UNIQUE(book, author));
         CREATE TABLE metadata_dirtied (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE);
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
         INSERT INTO books (id, title, author_sort, last_modified, path) VALUES
            (10, 'Solo <b>', 'abc', '2020-01-01 00:00:00', 'abc/Solo (10)'),
            (11, 'Second', 'abc', '2020-01-01 00:00:00', 'abc/Second (11)'),
            (12, 'Unrelated', 'Person, Other', '2020-01-01 00:00:00', 'Other Person/Unrelated (12)');
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
         CREATE TABLE archived_book (id INTEGER PRIMARY KEY, user_id INTEGER, book_id INTEGER, is_archived INTEGER);
         CREATE TABLE thumbnail (id INTEGER PRIMARY KEY, entity_id INTEGER, type SMALLINT, resolution SMALLINT);
         CREATE TABLE audit_log (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, action VARCHAR(64) NOT NULL,
            resource_type VARCHAR(64) NOT NULL, resource_id VARCHAR, details VARCHAR, ip_address VARCHAR,
            created DATETIME);
         CREATE TABLE flask_settings (id INTEGER PRIMARY KEY, flask_session_key BLOB);
         INSERT INTO settings VALUES (0, 0, 0, '', '', '{library}', 0, '', 'https://stats.example', 'Pustaka', 1, 0, 0, '', 0, 0, 'mail.example.org');
         INSERT INTO flask_settings (flask_session_key) VALUES (x'{key}');
         INSERT INTO user VALUES (1, 'adminzxc', 'a@example.org', '{hash}', 479, 'id', '', '', NULL, NULL, NULL, NULL);
         INSERT INTO user VALUES (4, 'hermes', 'h@example.org', '{hash}', 260, 'id', '', '', NULL, NULL, NULL, NULL);
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

fn authors(f: &Fixture) -> Vec<(i64, String, String)> {
    Connection::open(&f.metadata)
        .unwrap()
        .prepare("SELECT id, name, sort FROM authors ORDER BY id")
        .unwrap()
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .unwrap()
        .map(Result::unwrap)
        .collect()
}

#[tokio::test]
async fn only_an_administrator_gets_in() {
    let f = fixture();
    let anonymous = call(&f, "GET", "/admin/authors", None, None).await;
    assert_eq!(anonymous.status, StatusCode::SEE_OTHER);
    assert_eq!(anonymous.location(), "/login?next=%2Fadmin%2Fauthors");

    let editor = login(&f, "hermes").await;
    for (method, uri) in [
        ("GET", "/admin/authors"),
        ("POST", "/admin/authors/preview"),
        ("POST", "/admin/authors/run"),
    ] {
        let reply = call(&f, method, uri, Some(&editor), Some("old=abc&new=x".into())).await;
        assert_eq!(reply.status, StatusCode::FORBIDDEN, "{method} {uri}");
    }
    assert_eq!(authors(&f)[0].1, "abc", "nothing was written");

    let admin = login(&f, "adminzxc").await;
    let form = call(&f, "GET", "/admin/authors", Some(&admin), None).await;
    assert_eq!(form.status, StatusCode::OK);
    assert!(
        form.body.contains("/admin/authors/preview"),
        "{}",
        form.body
    );
    assert_eq!(form.headers[header::CACHE_CONTROL], "private, no-store");
}

#[tokio::test]
async fn a_post_without_the_csrf_token_changes_nothing() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    for uri in ["/admin/authors/preview", "/admin/authors/run"] {
        let reply = call(
            &f,
            "POST",
            uri,
            Some(&admin),
            Some("old=abc&new=Xavier+Yu&expected=2&confirm=yes".into()),
        )
        .await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "{uri}");
    }
    assert_eq!(authors(&f)[0].1, "abc");
}

#[tokio::test]
async fn preview_then_confirm_renames_the_author_writes_a_backup_and_an_audit_row() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let csrf = call(&f, "GET", "/admin/authors", Some(&admin), None)
        .await
        .csrf();

    let preview = call(
        &f,
        "POST",
        "/admin/authors/preview",
        Some(&admin),
        Some(format!("csrf_token={csrf}&old=abc&new=Xavier+Yu")),
    )
    .await;
    assert_eq!(preview.status, StatusCode::OK, "{}", preview.body);
    assert!(preview.body.contains("2 buku"), "{}", preview.body);
    assert!(
        preview.body.contains("Solo &lt;b&gt;"),
        "titles are escaped: {}",
        preview.body
    );
    assert!(preview.body.contains("name=\"expected\" value=\"2\""));
    assert_eq!(authors(&f)[0].1, "abc", "a preview writes nothing");

    // a bare POST (no `confirm=yes`, no count) is refused even with a valid token
    let bare = call(
        &f,
        "POST",
        "/admin/authors/run",
        Some(&admin),
        Some(format!("csrf_token={csrf}&old=abc&new=Xavier+Yu")),
    )
    .await;
    assert_eq!(bare.status, StatusCode::BAD_REQUEST);
    assert_eq!(authors(&f)[0].1, "abc");

    let run = call(
        &f,
        "POST",
        "/admin/authors/run",
        Some(&admin),
        Some(format!(
            "csrf_token={csrf}&old=abc&new=Xavier+Yu&expected=2&confirm=yes"
        )),
    )
    .await;
    assert_eq!(run.status, StatusCode::OK, "{}", run.body);
    assert!(run.body.contains("2 buku"), "{}", run.body);
    assert_eq!(authors(&f)[0], (1, "Xavier Yu".into(), "Yu, Xavier".into()));
    let sort: String = Connection::open(&f.metadata)
        .unwrap()
        .query_row("SELECT author_sort FROM books WHERE id = 10", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(sort, "Yu, Xavier");

    let backups = f.dir.path().join("processed_books/author_renames");
    let copies: Vec<_> = std::fs::read_dir(&backups).unwrap().collect();
    assert_eq!(copies.len(), 1, "one backup, taken before the write");
    let old: String = Connection::open(copies[0].as_ref().unwrap().path())
        .unwrap()
        .query_row("SELECT name FROM authors WHERE id = 1", [], |r| r.get(0))
        .unwrap();
    assert_eq!(old, "abc");

    let (action, resource, details): (String, String, String) = Connection::open(&f.app_db)
        .unwrap()
        .query_row(
            "SELECT action, resource_type, details FROM audit_log WHERE user_id = 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(
        (action.as_str(), resource.as_str()),
        ("author_rename", "author")
    );
    assert!(details.contains("abc -> Xavier Yu"), "{details}");
}

#[tokio::test]
async fn a_confirmation_that_no_longer_matches_the_library_is_refused() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let csrf = call(&f, "GET", "/admin/authors", Some(&admin), None)
        .await
        .csrf();
    // a third book appears between the preview (2 books) and the confirmation
    let meta = Connection::open(&f.metadata).unwrap();
    meta.execute_batch(
        "INSERT INTO books (id, title, author_sort) VALUES (13, 'New', 'abc');
         INSERT INTO books_authors_link (book, author) VALUES (13, 1);",
    )
    .unwrap();
    let run = call(
        &f,
        "POST",
        "/admin/authors/run",
        Some(&admin),
        Some(format!(
            "csrf_token={csrf}&old=abc&new=Xavier+Yu&expected=2&confirm=yes"
        )),
    )
    .await;
    assert_eq!(run.status, StatusCode::CONFLICT, "{}", run.body);
    assert_eq!(authors(&f)[0].1, "abc");
}

#[tokio::test]
async fn bad_names_come_back_to_the_form_with_a_message() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let csrf = call(&f, "GET", "/admin/authors", Some(&admin), None)
        .await
        .csrf();
    for (old, new, needle) in [
        ("nobody", "x", "Tidak ada penulis"),
        ("abc", "abc", "sama dengan"),
        ("abc", "A+%26+B", "dua penulis"),
        ("abc", "+++", "Isi kedua nama"),
    ] {
        let reply = call(
            &f,
            "POST",
            "/admin/authors/preview",
            Some(&admin),
            Some(format!("csrf_token={csrf}&old={old}&new={new}")),
        )
        .await;
        assert_eq!(
            reply.status,
            StatusCode::UNPROCESSABLE_ENTITY,
            "{old} {new}"
        );
        assert!(reply.body.contains(needle), "{old} {new}: {}", reply.body);
    }
}

#[tokio::test]
async fn whoami_answers_from_the_session_and_login_sets_a_marker_only_for_staff() {
    let f = fixture();
    let anonymous = call(&f, "GET", "/api/whoami", None, None).await;
    assert_eq!(anonymous.status, StatusCode::OK);
    assert_eq!(anonymous.body, r#"{"edit":false,"admin":false}"#);
    assert_eq!(
        anonymous.headers[header::CACHE_CONTROL],
        "private, no-store"
    );

    // a forged marker proves nothing
    let forged = call(&f, "GET", "/api/whoami", Some("pustaka_staff=1"), None).await;
    assert_eq!(forged.body, r#"{"edit":false,"admin":false}"#);

    let page = call(&f, "GET", "/login", None, None).await;
    let cookie = page.cookie_pair().unwrap();
    let token = page.csrf();
    let post =
        |user: &str| format!("username={user}&password=correct+horse&csrf_token={token}&next=%2F");
    let admin = call(&f, "POST", "/login", Some(&cookie), Some(post("adminzxc"))).await;
    let set: Vec<&str> = admin
        .headers
        .get_all(header::SET_COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .collect();
    assert!(
        set.iter()
            .any(|c| c.starts_with("pustaka_staff=1;") && !c.contains("HttpOnly")),
        "readable marker for an admin: {set:?}"
    );
    let session = admin.cookie_pair().unwrap();
    let who = call(&f, "GET", "/api/whoami", Some(&session), None).await;
    assert_eq!(who.body, r#"{"edit":true,"admin":true}"#);

    let hermes = call(&f, "POST", "/login", Some(&cookie), Some(post("hermes"))).await;
    assert!(
        !hermes
            .headers
            .get_all(header::SET_COOKIE)
            .iter()
            .any(|c| c.to_str().unwrap_or("").starts_with("pustaka_staff")),
        "a download/upload account gets no marker"
    );
    let who = call(
        &f,
        "GET",
        "/api/whoami",
        Some(&hermes.cookie_pair().unwrap()),
        None,
    )
    .await;
    assert_eq!(who.body, r#"{"edit":false,"admin":false}"#);
}

#[tokio::test]
async fn suggestions_are_for_editors_only_and_come_back_in_the_form_the_editor_saves() {
    let f = fixture();
    let anonymous = call(&f, "GET", "/api/suggest?field=authors&q=a", None, None).await;
    assert_eq!(
        anonymous.status,
        StatusCode::UNAUTHORIZED,
        "no catalogue data without a session"
    );
    assert_eq!(
        anonymous.headers[header::CACHE_CONTROL],
        "private, no-store"
    );

    // `hermes` (role 260: download + upload, no edit) may not use the editor, so gets nothing
    let uploader = login(&f, "hermes").await;
    let denied = call(&f, "GET", "/api/suggest?field=tags", Some(&uploader), None).await;
    assert_eq!(denied.status, StatusCode::FORBIDDEN);

    let admin = login(&f, "adminzxc").await;
    let tags = call(
        &f,
        "GET",
        "/api/suggest?field=tags&q=sej",
        Some(&admin),
        None,
    )
    .await;
    assert_eq!(tags.status, StatusCode::OK, "{}", tags.body);
    let json: serde_json::Value = serde_json::from_str(&tags.body).unwrap();
    assert_eq!(
        json["items"],
        serde_json::json!([{"name": "Sejarah", "count": 2}])
    );

    // most used first with no text; the author the form shows is `abc` (two books)
    let authors = call(&f, "GET", "/api/suggest?field=authors", Some(&admin), None).await;
    let json: serde_json::Value = serde_json::from_str(&authors.body).unwrap();
    assert_eq!(
        json["items"][0],
        serde_json::json!({"name": "abc", "count": 2})
    );

    // the account's locale is `en` in the fixture: language names are what the editor parses in that locale
    let languages = call(
        &f,
        "GET",
        "/api/suggest?field=languages&q=indo",
        Some(&admin),
        None,
    )
    .await;
    let json: serde_json::Value = serde_json::from_str(&languages.body).unwrap();
    assert_eq!(json["items"][0]["name"], "Indonesian");
    assert_eq!(json["items"][0]["count"], 1);

    let publishers = call(
        &f,
        "GET",
        "/api/suggest?field=publishers&q=satu",
        Some(&admin),
        None,
    )
    .await;
    assert!(
        publishers.body.contains("Penerbit Satu"),
        "{}",
        publishers.body
    );

    let bad = call(&f, "GET", "/api/suggest?field=password", Some(&admin), None).await;
    assert_eq!(bad.status, StatusCode::BAD_REQUEST);
}
