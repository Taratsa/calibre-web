//! The book manager (`/admin/books`) end to end through the router: access, search and paging, saving one field in place
//! (with the folder move), CSRF, the audit row, the bulk set/archive path and the actions that stay with Flask. The
//! library is a throwaway folder with a `metadata.db` of the real shape, so nothing here touches `library/`.

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
    app_db: std::path::PathBuf,
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
            (10, 'Solo <b>', 'abc', '2020-01-01 00:00:00', 'abc/Solo (10)', '2020-01-03'),
            (11, 'Second', 'abc', '2020-01-01 00:00:00', 'abc/Second (11)', '2020-01-02'),
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
         INSERT INTO user VALUES (2, 'Guest', '', '', 290, 'id', '', '', NULL, NULL, NULL, NULL);
         INSERT INTO user VALUES (6, 'plain', 'p@example.org', '{hash}', 2, 'id', '', '', NULL, NULL, NULL, NULL);",
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

fn lib_file(f: &Fixture, rel: &str) -> bool {
    f.metadata.parent().unwrap().join(rel).is_file()
}

#[tokio::test]
async fn the_manager_is_for_editors_and_lists_newest_first() {
    let f = fixture();
    let anonymous = call(&f, "GET", "/admin/books", None, None).await;
    assert_eq!(anonymous.status, StatusCode::SEE_OTHER);
    assert!(anonymous.location().starts_with("/login?next="));

    let uploader = login(&f, "hermes").await;
    assert_eq!(
        call(&f, "GET", "/admin/books", Some(&uploader), None)
            .await
            .status,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        call(&f, "GET", "/admin/books/10/title", Some(&uploader), None)
            .await
            .status,
        StatusCode::FORBIDDEN
    );

    let admin = login(&f, "adminzxc").await;
    let page = call(&f, "GET", "/admin/books", Some(&admin), None).await;
    assert_eq!(page.status, StatusCode::OK, "{}", page.body);
    assert!(
        page.body.contains("hx-headers=") && page.body.contains("X-CSRFToken"),
        "htmx carries the CSRF token"
    );
    assert!(
        page.body.contains("/admin/authors"),
        "the admin gets the rename link"
    );
    assert!(page.body.contains("3 buku"), "{}", page.body);
    let (solo, second, unrelated) = (
        page.body.find("book-10").unwrap(),
        page.body.find("book-11").unwrap(),
        page.body.find("book-12").unwrap(),
    );
    assert!(
        solo < second && second < unrelated,
        "newest first (timestamp)"
    );
    assert!(page.body.contains("Solo &lt;b&gt;"), "titles are escaped");
}

#[tokio::test]
async fn search_matches_title_author_and_tag_and_reports_no_results() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let by_title = call(&f, "GET", "/admin/books/rows?q=second", Some(&admin), None).await;
    assert!(
        by_title.body.contains("book-11") && !by_title.body.contains("book-10"),
        "{}",
        by_title.body
    );
    let by_author = call(
        &f,
        "GET",
        "/admin/books/rows?q=other+person",
        Some(&admin),
        None,
    )
    .await;
    assert!(by_author.body.contains("book-12") && !by_author.body.contains("book-11"));
    let by_tag = call(&f, "GET", "/admin/books/rows?q=sejarah", Some(&admin), None).await;
    assert!(
        by_tag.body.contains("book-10")
            && by_tag.body.contains("book-11")
            && !by_tag.body.contains("book-12")
    );
    let none = call(&f, "GET", "/admin/books/rows?q=zzzz", Some(&admin), None).await;
    assert!(none.body.contains("Tidak ada hasil"), "{}", none.body);
}

#[tokio::test]
async fn saving_a_title_moves_the_folder_updates_the_cell_and_writes_an_audit_row() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let csrf = call(&f, "GET", "/login", None, None).await; // any page; the token comes from the manager itself
    drop(csrf);
    let page = call(&f, "GET", "/admin/books", Some(&admin), None).await;
    let token = page
        .body
        .split("X-CSRFToken\":\"")
        .nth(1)
        .or_else(|| page.body.split("X-CSRFToken\":\"").nth(1))
        .map_or_else(String::new, |rest| {
            rest.split('"')
                .next()
                .unwrap_or("")
                .trim_end_matches('\\')
                .to_owned()
        });

    // without the token nothing is written
    let refused = call(
        &f,
        "POST",
        "/admin/books/11/title",
        Some(&admin),
        Some("value=Renamed".into()),
    )
    .await;
    assert_eq!(refused.status, StatusCode::BAD_REQUEST);
    assert!(lib_file(&f, "abc/Second (11)/Second.epub"));

    let saved = call(
        &f,
        "POST",
        "/admin/books/11/title",
        Some(&admin),
        Some(format!("value=Renamed+Title&csrf_token={token}")),
    )
    .await;
    assert_eq!(saved.status, StatusCode::OK, "{}", saved.body);
    assert!(
        saved.body.contains("Renamed Title"),
        "the display cell comes back: {}",
        saved.body
    );
    assert!(
        lib_file(&f, "abc/Renamed Title (11)/Renamed Title - abc.epub"),
        "folder and file were renamed"
    );
    assert!(!lib_file(&f, "abc/Second (11)/Second.epub"));
    let (path, title): (String, String) = Connection::open(&f.metadata)
        .unwrap()
        .query_row("SELECT path, title FROM books WHERE id = 11", [], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .unwrap();
    assert_eq!(
        (path.as_str(), title.as_str()),
        ("abc/Renamed Title (11)", "Renamed Title")
    );
    let audit: (String, String, String) = Connection::open(&f.app_db)
        .unwrap()
        .query_row(
            "SELECT action, resource_type, resource_id FROM audit_log WHERE user_id = 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(audit, ("edit".into(), "book".into(), "11".into()));
}

#[tokio::test]
async fn a_failed_save_shows_the_form_again_with_the_message_and_changes_nothing() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let page = call(&f, "GET", "/admin/books", Some(&admin), None).await;
    let token = page
        .body
        .split("X-CSRFToken")
        .nth(1)
        .unwrap()
        .split(['"', '\\'])
        .find(|s| s.len() > 20)
        .unwrap()
        .to_owned();
    let reply = call(
        &f,
        "POST",
        "/admin/books/10/languages",
        Some(&admin),
        Some(format!("value=Klingonese&csrf_token={token}")),
    )
    .await;
    assert_eq!(reply.status, StatusCode::OK);
    assert!(
        reply
            .body
            .contains("Invalid languages in request: klingonese"),
        "{}",
        reply.body
    );
    assert!(
        reply.body.contains("hx-post=\"/admin/books/10/languages\""),
        "the form is shown again"
    );
    assert!(
        reply.body.contains("value=\"Klingonese\""),
        "what was typed is kept"
    );
}

#[tokio::test]
async fn bulk_set_needs_confirmation_and_archive_runs_directly() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let page = call(&f, "GET", "/admin/books", Some(&admin), None).await;
    let token = page
        .body
        .split("X-CSRFToken")
        .nth(1)
        .unwrap()
        .split(['"', '\\'])
        .find(|s| s.len() > 20)
        .unwrap()
        .to_owned();

    let preview = call(
        &f,
        "POST",
        "/admin/books/bulk/preview",
        Some(&admin),
        Some("action=set&field=tags&value=baru&ids=10&ids=11&ids=999".into()),
    )
    .await;
    assert_eq!(preview.status, StatusCode::OK);
    assert!(
        preview.body.contains("name=\"confirm\" value=\"yes\""),
        "{}",
        preview.body
    );
    assert!(
        preview.body.contains("1 buku terpilih tidak tersedia"),
        "the unknown id is counted as left out: {}",
        preview.body
    );

    // a bare run is refused: no confirm field, nothing written
    let bare = call(
        &f,
        "POST",
        "/admin/books/bulk/run",
        Some(&admin),
        Some(format!(
            "action=set&field=tags&value=baru&ids=10&csrf_token={token}"
        )),
    )
    .await;
    assert!(bare.body.contains("dikonfirmasi"), "{}", bare.body);
    let tags = |f: &Fixture| -> i64 {
        Connection::open(&f.metadata)
            .unwrap()
            .query_row("SELECT count(*) FROM tags WHERE name = 'baru'", [], |r| {
                r.get(0)
            })
            .unwrap()
    };
    assert_eq!(tags(&f), 0);

    let run = call(
        &f,
        "POST",
        "/admin/books/bulk/run",
        Some(&admin),
        Some(format!(
            "action=set&confirm=yes&field=tags&value=baru&ids=10&ids=11&csrf_token={token}"
        )),
    )
    .await;
    assert!(run.body.contains("2 buku"), "{}", run.body);
    assert_eq!(run.headers["hx-trigger"], "books-changed");
    assert_eq!(tags(&f), 1);

    let archived = call(
        &f,
        "POST",
        "/admin/books/bulk/run",
        Some(&admin),
        Some(format!("action=archive&ids=10&csrf_token={token}")),
    )
    .await;
    assert!(
        archived.body.contains("1 buku diarsipkan"),
        "{}",
        archived.body
    );
    let flag: bool = Connection::open(&f.app_db)
        .unwrap()
        .query_row(
            "SELECT is_archived FROM archived_book WHERE user_id = 1 AND book_id = 10",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(flag);
    let synced: i64 = Connection::open(&f.app_db)
        .unwrap()
        .query_row(
            "SELECT count(*) FROM kobo_synced_books WHERE book_id = 10",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        synced, 1,
        "archiving drops only this account's Kobo sync row"
    );
}

#[tokio::test]
async fn merge_and_read_still_go_to_flask_but_delete_is_answered_here() {
    let f = fixture();
    let admin = login(&f, "adminzxc").await;
    let page = call(&f, "GET", "/admin/books", Some(&admin), None).await;
    let token = page
        .body
        .split("X-CSRFToken")
        .nth(1)
        .unwrap()
        .split(['"', '\\'])
        .find(|s| s.len() > 20)
        .unwrap()
        .to_owned();
    // Flask is down in the fixture: a proxied request answers 502, a locally answered one does not.
    for (action, extra) in [("merge", "&keep=10"), ("read", ""), ("unread", "")] {
        let body = format!("action={action}&confirm=yes&ids=10&ids=11{extra}&csrf_token={token}");
        let reply = call(
            &f,
            "POST",
            "/admin/books/bulk/run",
            Some(&admin),
            Some(body),
        )
        .await;
        assert_eq!(reply.status, StatusCode::BAD_GATEWAY, "{action}");
    }
    let delete = call(
        &f,
        "POST",
        "/admin/books/bulk/run",
        Some(&admin),
        Some(format!(
            "action=delete&confirm=yes&ids=10&ids=11&csrf_token={token}"
        )),
    )
    .await;
    assert_eq!(delete.status, StatusCode::OK, "{}", delete.body);
    assert!(delete.body.contains("2 buku dihapus"), "{}", delete.body);
    assert_eq!(delete.headers["hx-trigger"], "books-changed");
    let conn = Connection::open(&f.metadata).unwrap();
    let left: i64 = conn
        .query_row("SELECT count(*) FROM books WHERE id IN (10,11)", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(left, 0, "both catalogue rows are gone");
    assert!(
        !lib_file(&f, "abc/Solo (10)/Solo.pdf"),
        "the folder is gone"
    );
    assert!(
        !std::path::Path::new(&f.metadata.parent().unwrap().join("abc")).exists(),
        "the emptied author folder is gone"
    );
    let audits: i64 = Connection::open(&f.app_db)
        .unwrap()
        .query_row(
            "SELECT count(*) FROM audit_log WHERE action = 'delete'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(audits, 2, "one audit row per deleted book");
}

#[tokio::test]
async fn a_delete_without_the_role_or_the_confirmation_changes_nothing() {
    let f = fixture();
    verify_delete_guards(&f).await;
}

async fn verify_delete_guards(f: &Fixture) {
    let admin = login(f, "adminzxc").await;
    let page = call(f, "GET", "/admin/books", Some(&admin), None).await;
    let token = page
        .body
        .split("X-CSRFToken")
        .nth(1)
        .unwrap()
        .split(['"', '\\'])
        .find(|s| s.len() > 20)
        .unwrap()
        .to_owned();
    // a bare run (no confirm) never deletes
    let bare = call(
        f,
        "POST",
        "/admin/books/bulk/run",
        Some(&admin),
        Some(format!("action=delete&ids=10&csrf_token={token}")),
    )
    .await;
    assert!(bare.body.contains("dikonfirmasi"), "{}", bare.body);
    assert!(lib_file(f, "abc/Solo (10)/Solo.pdf"));
    // an account without ROLE_DELETE_BOOKS (plain = 2) is refused
    let plain = login(f, "plain").await;
    let denied = call(
        f,
        "POST",
        "/admin/books/bulk/run",
        Some(&plain),
        Some(format!(
            "action=delete&confirm=yes&ids=10&csrf_token={token}"
        )),
    )
    .await;
    assert!(denied.body.contains("izin"), "{}", denied.body);
    assert!(lib_file(f, "abc/Solo (10)/Solo.pdf"));
}
