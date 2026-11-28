//! `POST /api/webhook/upload` end to end: the bot's upload of a real EPUB and a small PDF. The library is a throwaway
//! folder, so nothing here touches `library/`.

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
    taratsa_backend::authors::register_functions(&meta, None).unwrap();
    meta.execute_batch(
        "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL COLLATE NOCASE, sort TEXT, author_sort TEXT,
            last_modified TIMESTAMP, path TEXT, timestamp TIMESTAMP, pubdate TIMESTAMP, series_index REAL DEFAULT 1, has_cover INTEGER DEFAULT 0);
         CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
            sort TEXT COLLATE NOCASE, link TEXT NOT NULL DEFAULT '');
         CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, author INTEGER NOT NULL,
            UNIQUE(book, author));
         CREATE TABLE metadata_dirtied (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE);
         CREATE TRIGGER books_update_trg AFTER UPDATE ON books BEGIN
            UPDATE books SET sort=title_sort(NEW.title) WHERE id=NEW.id AND OLD.title <> NEW.title; END;
         CREATE TRIGGER books_insert_trg AFTER INSERT ON books BEGIN
            UPDATE books SET sort=title_sort(NEW.title) WHERE id=NEW.id; END;
         CREATE TABLE custom_columns (id INTEGER PRIMARY KEY, label TEXT);
         CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, format TEXT NOT NULL COLLATE NOCASE, uncompressed_size INTEGER, name TEXT NOT NULL);
         CREATE TABLE comments (id INTEGER PRIMARY KEY, book INTEGER, text TEXT);
         CREATE TABLE identifiers (id INTEGER PRIMARY KEY, book INTEGER, type TEXT, val TEXT, UNIQUE(book, type));
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

/// A minimal but valid EPUB with the given OPF metadata values, zipped the way the uploader reads it.
fn epub_bytes(title: &str, creator: &str) -> Vec<u8> {
    let mut buffer = std::io::Cursor::new(Vec::new());
    {
        let mut zip = zip::ZipWriter::new(&mut buffer);
        let stored = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);
        let deflated = zip::write::SimpleFileOptions::default();
        zip.start_file("mimetype", stored).unwrap();
        std::io::Write::write_all(&mut zip, b"application/epub+zip").unwrap();
        zip.start_file("META-INF/container.xml", deflated).unwrap();
        std::io::Write::write_all(&mut zip, br#"<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>"#).unwrap();
        zip.start_file("OEBPS/content.opf", deflated).unwrap();
        let opf = format!(
            r#"<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>{title}</dc:title><dc:creator>{creator}</dc:creator><dc:language>id</dc:language>
<dc:subject>Uji, Unggah</dc:subject><dc:publisher>Penerbit Uji</dc:publisher><dc:date>2019-05-04</dc:date>
<dc:identifier opf:scheme="ISBN">978-602-0000</dc:identifier>
<meta name="calibre:series" content="Seri Uji"/><meta name="calibre:series_index" content="2"/>
</metadata></package>"#
        );
        std::io::Write::write_all(&mut zip, opf.as_bytes()).unwrap();
        zip.finish().unwrap();
    }
    buffer.into_inner()
}

fn multipart(filename: &str, bytes: &[u8]) -> (String, Vec<u8>) {
    let boundary = "----pustakaTestBoundary";
    let mut body = Vec::new();
    body.extend_from_slice(format!("--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: application/octet-stream\r\n\r\n").as_bytes());
    body.extend_from_slice(bytes);
    body.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());
    (format!("multipart/form-data; boundary={boundary}"), body)
}

async fn upload(f: &Fixture, cookie: Option<&str>, filename: &str, bytes: &[u8]) -> Reply {
    let (content_type, body) = multipart(filename, bytes);
    let mut builder = Request::builder()
        .method("POST")
        .uri("/api/webhook/upload")
        .header(header::HOST, "pustaka.example")
        .header(header::CONTENT_TYPE, content_type)
        .header("x-forwarded-proto", "https");
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    let response = f
        .app
        .clone()
        .oneshot(builder.body(Body::from(body)).unwrap())
        .await
        .unwrap();
    let (parts, body) = response.into_parts();
    Reply {
        status: parts.status,
        headers: parts.headers,
        body: String::from_utf8_lossy(&body.collect().await.unwrap().to_bytes()).into_owned(),
    }
}

#[tokio::test]
async fn an_epub_upload_creates_the_book_its_folder_its_file_and_an_audit_row() {
    let f = fixture();
    let anonymous = upload(&f, None, "uji.epub", &epub_bytes("Uji Unggah", "Doe, John")).await;
    assert_eq!(anonymous.status, StatusCode::UNAUTHORIZED);

    let admin = login(&f, "adminzxc").await;
    let done = upload(
        &f,
        Some(&admin),
        "uji.epub",
        &epub_bytes("Uji Unggah", "Doe, John"),
    )
    .await;
    assert_eq!(done.status, StatusCode::OK, "{}", done.body);
    let json: serde_json::Value = serde_json::from_str(&done.body).unwrap();
    let id = json["book_id"].as_i64().unwrap();
    assert_eq!(json["title"], "Uji Unggah");
    assert_eq!(json["author"], "John Doe", "Last, First is flipped");
    assert_eq!(json["languages"], "ind");
    assert_eq!(json["series"], "Seri Uji");
    assert_eq!(json["pubdate"], "2019-05-04");
    assert_eq!(json["url"], format!("https://pustaka.example/book/{id}/"));

    let conn = Connection::open(&f.metadata).unwrap();
    let (title, path, sort, has_cover): (String, String, String, i64) = conn
        .query_row(
            "SELECT title, path, sort, has_cover FROM books WHERE id = ?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .unwrap();
    assert_eq!(title, "Uji Unggah");
    assert_eq!(sort, "Uji Unggah");
    assert_eq!(has_cover, 0, "no cover in this test EPUB");
    assert_eq!(path, format!("John Doe/Uji Unggah ({id})"));
    let folder = f.metadata.parent().unwrap().join(&path);
    let listing: Vec<String> = std::fs::read_dir(&folder)
        .unwrap()
        .flatten()
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .collect();
    assert!(
        folder.join("Uji Unggah - John Doe.epub").is_file(),
        "folder {folder:?} holds {listing:?}"
    );
    let (data_name, size): (String, i64) = conn
        .query_row(
            "SELECT name, uncompressed_size FROM data WHERE book = ?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(data_name, "Uji Unggah - John Doe");
    assert!(size > 100);
    let author: String = conn.query_row("SELECT a.name FROM books_authors_link l JOIN authors a ON a.id = l.author WHERE l.book = ?1", [id], |r| r.get(0)).unwrap();
    assert_eq!(author, "John Doe");
    let audit: (String, String) = Connection::open(&f.app_db)
        .unwrap()
        .query_row(
            "SELECT action, resource_type FROM audit_log WHERE resource_id = ?1",
            [id.to_string()],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(audit, ("upload".into(), "book".into()));
}

#[tokio::test]
async fn the_route_refuses_what_flask_refuses() {
    let f = fixture();
    let hermes = login(&f, "hermes").await;
    let wrong = upload(&f, Some(&hermes), "book.mobi", b"not a book").await;
    assert_eq!(wrong.status, StatusCode::BAD_REQUEST);
    assert!(wrong.body.contains("Only PDF and EPUB"));
    let no_file = {
        let boundary = "b";
        let body = format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"other\"\r\n\r\nx\r\n--{boundary}--\r\n"
        );
        let request = Request::builder()
            .method("POST")
            .uri("/api/webhook/upload")
            .header(header::HOST, "pustaka.example")
            .header(
                header::CONTENT_TYPE,
                format!("multipart/form-data; boundary={boundary}"),
            )
            .header(header::COOKIE, &hermes)
            .body(Body::from(body))
            .unwrap();
        let response = f.app.clone().oneshot(request).await.unwrap();
        response.status()
    };
    assert_eq!(no_file, StatusCode::BAD_REQUEST);
    // an upload-only account may upload; one without the role may not
    let editor = login(&f, "plain").await;
    let denied = upload(&f, Some(&editor), "uji.epub", &epub_bytes("X", "Y")).await;
    assert_eq!(denied.status, StatusCode::FORBIDDEN);
}
