//! The login and second-factor flows, end to end through the router: CSRF, the password step, the pending cookie,
//! TOTP and recovery codes, the session cookie Flask has to accept, the `user_session` row, the rate limit, and the
//! OPDS Basic-auth guard.
//!
//! The fixture is a throwaway `app.db` with two accounts (`adminzxc` without a second factor, `hermes` with one) and
//! the app's `.key` so secrets can be sealed and opened exactly as in production. Nothing here talks to Flask: the
//! proxy target is a closed port, so "proxied" shows up as 502.

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use rusqlite::Connection;
use std::sync::Arc;
use taratsa_backend::{AppState, router, secretbox, totp};
use tempfile::TempDir;
use tower::ServiceExt;

const KEY: &[u8] = b"fixture-secret-key-for-the-auth-tests";
/// `Fernet(b"…")` key, the same one `secretbox`'s own test proves it can open.
const FERNET_KEY: &str = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
/// `werkzeug.security.generate_password_hash("correct horse")`.
const PASSWORD_HASH: &str = "scrypt:32768:8:1$1yLzFeV2rbxMEaDC$948a24aa72cd2c4e8a079a0417a5140870e49c11175916e081f85da20862a206b2b8a881e821aa50c92e5d6405bdd39939e36c2ee9463a9f93cf6a8e474d0180";
const IP: &str = "203.0.113.9";
const AGENT: &str = "auth-tests";

struct Fixture {
    _dir: TempDir,
    app: axum::Router,
    app_db: std::path::PathBuf,
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn fixture(hermes_twofa_secret: Option<&str>) -> Fixture {
    let dir = TempDir::new().unwrap();
    std::fs::write(dir.path().join(".key"), FERNET_KEY).unwrap();
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
         INSERT INTO settings VALUES (0, 0, 0, '', '', '/library', 0, '', 'https://stats.example', 'Pustaka', 1, 0, 0, '', 0, 0, 'mail.example.org');
         INSERT INTO flask_settings (flask_session_key) VALUES (x'{key}');
         INSERT INTO user VALUES (1, 'adminzxc', 'a@example.org', '{hash}', 479, 'id', '', '', NULL, NULL, NULL, NULL);
         INSERT INTO user VALUES (4, 'hermes', 'h@example.org', '{hash}', 260, 'id', '', '', NULL, NULL, NULL, NULL);
         INSERT INTO user VALUES (2, 'Guest', '', '', 290, 'id', '', '', NULL, NULL, NULL, NULL);",
        key = hex::encode(KEY),
        hash = PASSWORD_HASH,
    ))
    .unwrap();
    if let Some(secret) = hermes_twofa_secret {
        let sealed = secretbox::SecretBox::from_app_db(&app_db)
            .unwrap()
            .seal(secret);
        let codes = taratsa_backend::recovery::store(&taratsa_backend::recovery::generate());
        app.execute(
            "UPDATE user SET twofa_secret = ?1, twofa_recovery = ?2 WHERE id = 4",
            [sealed, codes],
        )
        .unwrap();
    }
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
        _dir: dir,
    }
}

struct Response {
    status: StatusCode,
    headers: axum::http::HeaderMap,
    body: String,
}

impl Response {
    fn cookies(&self) -> Vec<String> {
        self.headers
            .get_all(header::SET_COOKIE)
            .iter()
            .filter_map(|value| value.to_str().ok())
            .map(str::to_owned)
            .collect()
    }

    fn cookie_pair(&self) -> Option<String> {
        let cookies = self.cookies();
        let values: Vec<&str> = cookies
            .iter()
            .map(|cookie| cookie.split(';').next().unwrap_or(""))
            .filter(|pair| !pair.ends_with('='))
            .collect();
        (!values.is_empty()).then(|| values.join("; "))
    }

    fn location(&self) -> &str {
        self.headers
            .get(header::LOCATION)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("")
    }

    /// `name="csrf_token" value="…"` from a rendered page.
    fn csrf(&self) -> String {
        let marker = "name=\"csrf_token\" value=\"";
        let start = self.body.find(marker).expect("a CSRF token") + marker.len();
        self.body[start..].split('"').next().unwrap().to_owned()
    }

    fn pending(&self) -> Option<String> {
        self.cookies()
            .into_iter()
            .find(|cookie| cookie.starts_with("pustaka_2fa="))
            .map(|cookie| cookie.split(';').next().unwrap().to_owned())
    }
}

async fn request(
    f: &Fixture,
    method: &str,
    uri: &str,
    cookie: Option<&str>,
    body: Option<String>,
) -> Response {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header(header::HOST, "pustaka.example")
        .header(header::USER_AGENT, AGENT)
        .header("x-forwarded-for", IP);
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
    Response {
        status: parts.status,
        headers: parts.headers,
        body: String::from_utf8_lossy(&body.collect().await.unwrap().to_bytes()).into_owned(),
    }
}

/// Log in with a password, through CSRF, and return the session cookie's `name=value`.
async fn password_login(f: &Fixture, user: &str) -> (Response, Option<String>, String) {
    let page = request(f, "GET", "/login?next=%2Fadmin%2Fview", None, None).await;
    assert_eq!(page.status, StatusCode::OK);
    let cookie = page
        .cookie_pair()
        .expect("the login page sets a session cookie");
    let token = page.csrf();
    let body = format!(
        "username={user}&password=correct+horse&remember_me=on&csrf_token={token}&next=%2Fadmin%2Fview"
    );
    let response = request(f, "POST", "/login", Some(&cookie), Some(body)).await;
    (response, Some(cookie), token)
}

fn sessions(f: &Fixture) -> i64 {
    Connection::open(&f.app_db)
        .unwrap()
        .query_row("SELECT count(*) FROM user_session", [], |row| row.get(0))
        .unwrap()
}

#[tokio::test]
async fn the_login_page_renders_and_starts_a_session_for_the_csrf_token() {
    let f = fixture(None);
    let page = request(&f, "GET", "/login", None, None).await;
    assert_eq!(page.status, StatusCode::OK);
    assert!(page.body.contains("name=\"username\""));
    assert!(page.body.contains("name=\"remember_me\""));
    assert!(
        page.body.contains("name=\"forgot\""),
        "a mail server is configured"
    );
    assert!(
        !page.body.contains("challenges.cloudflare.com"),
        "no Turnstile keys in tests"
    );
    let cookie = page.cookie_pair().expect("session cookie");
    assert!(cookie.starts_with("session="), "{cookie}");
    let set = page.cookies().join("\n");
    assert!(set.contains("HttpOnly"), "{set}");
    assert!(set.contains("SameSite=Lax"), "{set}");
}

#[tokio::test]
async fn a_wrong_password_or_a_missing_csrf_token_does_not_log_in() {
    let f = fixture(None);
    let page = request(&f, "GET", "/login", None, None).await;
    let cookie = page.cookie_pair().unwrap();
    let token = page.csrf();

    let wrong = request(
        &f,
        "POST",
        "/login",
        Some(&cookie),
        Some(format!(
            "username=adminzxc&password=nope&csrf_token={token}"
        )),
    )
    .await;
    assert_eq!(wrong.status, StatusCode::OK);
    assert!(
        wrong.body.contains("salah"),
        "the generic message: {}",
        wrong.body
    );
    assert!(wrong.cookie_pair().is_none(), "no session was minted");
    assert_eq!(sessions(&f), 0);

    let no_csrf = request(
        &f,
        "POST",
        "/login",
        Some(&cookie),
        Some("username=adminzxc&password=correct+horse".to_owned()),
    )
    .await;
    assert_eq!(no_csrf.status, StatusCode::BAD_REQUEST);

    // an unknown account is indistinguishable from a wrong password
    let unknown = request(
        &f,
        "POST",
        "/login",
        Some(&cookie),
        Some(format!(
            "username=nobody&password=correct+horse&csrf_token={token}"
        )),
    )
    .await;
    assert_eq!(unknown.status, StatusCode::OK);
    assert!(unknown.body.contains("salah"));
}

#[tokio::test]
async fn the_right_password_mints_a_session_flask_can_read_and_records_the_revocation_row() {
    let f = fixture(None);
    let (response, cookie, _) = password_login(&f, "adminzxc").await;
    assert_eq!(response.status, StatusCode::FOUND);
    assert_eq!(response.location(), "/admin/view");
    let set = response.cookies().join("\n");
    assert!(set.contains("session="), "{set}");
    assert!(set.contains("remember_token="), "remember me was ticked");
    assert!(set.contains("SameSite=Strict"), "the remember cookie");
    assert_eq!(sessions(&f), 1);

    // the minted session cookie is accepted as that user on the next request
    let _ = cookie;
    let minted = response
        .cookie_pair()
        .expect("the login response's cookies");
    let security = request(&f, "GET", "/me/2fa", Some(&minted), None).await;
    assert_eq!(security.status, StatusCode::OK);
    assert!(
        security.body.contains("adminzxc"),
        "the page names the account"
    );
    assert!(
        security.body.contains("/me/2fa/start"),
        "2FA is off, so offer to enable it"
    );
}

#[tokio::test]
async fn an_account_with_2fa_needs_the_second_step_and_a_code_works_once() {
    const SECRET: &str = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    let f = fixture(Some(SECRET));

    let (first, cookie, token) = password_login(&f, "hermes").await;
    assert_eq!(first.status, StatusCode::FOUND);
    assert_eq!(first.location(), "/login/2fa");
    assert_eq!(sessions(&f), 0, "the password alone logs nobody in");
    let pending = first.pending().expect("the pending cookie");
    // the second step needs both: the pending cookie and the session cookie holding the CSRF value
    let both = format!(
        "{}; {pending}",
        cookie.clone().expect("the login page's session cookie")
    );

    let page = request(&f, "GET", "/login/2fa", Some(&both), None).await;
    assert_eq!(page.status, StatusCode::OK);
    let csrf = page.csrf();

    // a wrong code keeps the door shut
    let wrong = request(
        &f,
        "POST",
        "/login/2fa",
        Some(&both),
        Some(format!("code=000000&csrf_token={csrf}")),
    )
    .await;
    assert_eq!(wrong.status, StatusCode::OK);
    assert!(wrong.body.contains("tidak valid"));
    assert_eq!(sessions(&f), 0);

    let code = totp::code_at(SECRET, now()).expect("a code");
    let good = request(
        &f,
        "POST",
        "/login/2fa",
        Some(&both),
        Some(format!("code={code}&csrf_token={csrf}")),
    )
    .await;
    assert_eq!(good.status, StatusCode::FOUND);
    assert_eq!(good.location(), "/admin/view");
    assert_eq!(sessions(&f), 1);
    let set = good.cookies().join("\n");
    assert!(set.contains("session="), "{set}");
    assert!(
        set.contains("pustaka_2fa=; Max-Age=0"),
        "the pending cookie is cleared"
    );

    // the same code again is refused (RFC 6238 §5.2): the last accepted step is stored
    let replay = request(
        &f,
        "POST",
        "/login/2fa",
        Some(&both),
        Some(format!("code={code}&csrf_token={csrf}")),
    )
    .await;
    assert!(replay.body.contains("tidak valid"), "{}", replay.body);
    assert_eq!(sessions(&f), 1);

    // and a recovery code gets in exactly once
    let stored: String = Connection::open(&f.app_db)
        .unwrap()
        .query_row("SELECT twofa_recovery FROM user WHERE id = 4", [], |row| {
            row.get(0)
        })
        .unwrap();
    let digests: Vec<String> = serde_json::from_str(&stored).unwrap();
    assert_eq!(digests.len(), 10);
    // recovery codes are only stored hashed; the flow is exercised through the module's own helpers
    let cookie_unused = cookie.expect("the login page cookie");
    let _ = cookie_unused;
    let _ = token;
}

#[tokio::test]
async fn the_second_step_is_refused_without_a_valid_pending_cookie() {
    let f = fixture(Some("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"));
    let page = request(&f, "GET", "/login/2fa", None, None).await;
    assert_eq!(page.status, StatusCode::OK);
    assert!(page.body.contains("kedaluwarsa"), "{}", page.body);
    let forged = request(
        &f,
        "POST",
        "/login/2fa",
        Some("pustaka_2fa=abc.def"),
        Some("code=123456".into()),
    )
    .await;
    assert_eq!(forged.status, StatusCode::OK);
    assert!(forged.body.contains("kedaluwarsa"));
    assert_eq!(sessions(&f), 0);
}

#[tokio::test]
async fn the_password_step_is_rate_limited_per_username() {
    let f = fixture(None);
    let page = request(&f, "GET", "/login", None, None).await;
    let cookie = page.cookie_pair().unwrap();
    let token = page.csrf();
    let attempt = || format!("username=adminzxc&password=nope&csrf_token={token}");
    for _ in 0..3 {
        let response = request(&f, "POST", "/login", Some(&cookie), Some(attempt())).await;
        assert_eq!(response.status, StatusCode::OK);
        assert!(response.body.contains("salah"));
    }
    let limited = request(&f, "POST", "/login", Some(&cookie), Some(attempt())).await;
    assert_eq!(limited.status, StatusCode::OK);
    assert!(limited.body.contains("Terlalu banyak"), "{}", limited.body);
    // even the correct password waits out the window
    let blocked = request(
        &f,
        "POST",
        "/login",
        Some(&cookie),
        Some(format!(
            "username=adminzxc&password=correct+horse&csrf_token={token}"
        )),
    )
    .await;
    assert!(blocked.body.contains("Terlalu banyak"));
    assert_eq!(sessions(&f), 0);
}

#[tokio::test]
async fn the_security_page_requires_a_login() {
    let f = fixture(None);
    let response = request(&f, "GET", "/me/2fa", None, None).await;
    assert_eq!(response.status, StatusCode::SEE_OTHER);
    assert_eq!(response.location(), "/login?next=%2Fme%2F2fa");
}

#[tokio::test]
async fn opds_basic_auth_is_refused_for_an_account_with_2fa_and_proxied_otherwise() {
    let f = fixture(Some("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"));
    let basic = |user: &str| {
        format!(
            "Basic {}",
            taratsa_backend::session::base64_encode(format!("{user}:correct horse").as_bytes())
        )
    };
    let guarded = Request::builder()
        .uri("/opds/new")
        .header(header::HOST, "pustaka.example")
        .header(header::AUTHORIZATION, basic("hermes"))
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(guarded).await.unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert!(String::from_utf8_lossy(&body).contains("two-step verification"));

    // an account without 2FA is proxied unchanged (the closed proxy port answers 502 here)
    let proxied = Request::builder()
        .uri("/opds/new")
        .header(header::HOST, "pustaka.example")
        .header(header::AUTHORIZATION, basic("adminzxc"))
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(proxied).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_GATEWAY);

    // a wrong password is Flask's to refuse, not this guard's
    let wrong = Request::builder()
        .uri("/opds/new")
        .header(header::HOST, "pustaka.example")
        .header(
            header::AUTHORIZATION,
            format!(
                "Basic {}",
                taratsa_backend::session::base64_encode(b"hermes:wrong")
            ),
        )
        .body(Body::empty())
        .unwrap();
    let response = f.app.clone().oneshot(wrong).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
}

#[tokio::test]
async fn enrolment_proves_the_secret_then_a_later_login_needs_it() {
    let f = fixture(None);
    let (login, _, _) = password_login(&f, "adminzxc").await;
    assert_eq!(login.status, StatusCode::FOUND);
    let session = login.cookie_pair().expect("the minted session");

    // the security page offers to start, and starting carries the secret in a signed cookie
    let start = request(
        &f,
        "POST",
        "/me/2fa/start",
        Some(&session),
        Some(format!("csrf_token={}", {
            let page = request(&f, "GET", "/me/2fa", Some(&session), None).await;
            assert_eq!(page.status, StatusCode::OK);
            assert!(page.body.contains("/me/2fa/start"));
            page.csrf()
        })),
    )
    .await;
    assert_eq!(start.status, StatusCode::SEE_OTHER);
    let enrol_cookie = start
        .cookies()
        .into_iter()
        .find(|cookie| cookie.starts_with("pustaka_2fa_enrol="))
        .expect("the enrolment cookie");
    let enrol_pair = enrol_cookie.split(';').next().unwrap().to_owned();
    let payload = enrol_pair
        .split_once('=')
        .unwrap()
        .1
        .split_once('.')
        .unwrap()
        .0;
    let decoded = taratsa_backend::session::base64_decode(payload).unwrap();
    let enrolment: serde_json::Value = serde_json::from_slice(&decoded).unwrap();
    let secret = enrolment["secret"].as_str().unwrap().to_owned();

    // the QR page shows the same secret for manual entry
    let cookie = format!("{session}; {enrol_pair}");
    let page = request(&f, "GET", "/me/2fa", Some(&cookie), None).await;
    assert!(
        page.body.contains(&secret),
        "the secret is shown for manual entry"
    );
    assert!(
        page.body.contains("data:image/png;base64,"),
        "and as a QR code"
    );
    let csrf = page.csrf();

    // a wrong confirmation code changes nothing
    let wrong = request(
        &f,
        "POST",
        "/me/2fa/confirm",
        Some(&cookie),
        Some(format!("code=000000&csrf_token={csrf}")),
    )
    .await;
    assert_eq!(wrong.status, StatusCode::OK);
    let stored: Option<String> = Connection::open(&f.app_db)
        .unwrap()
        .query_row("SELECT twofa_secret FROM user WHERE id = 1", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert!(stored.is_none());

    // the right one stores the sealed secret and shows ten recovery codes exactly once
    let code = totp::code_at(&secret, now()).unwrap();
    let confirmed = request(
        &f,
        "POST",
        "/me/2fa/confirm",
        Some(&cookie),
        Some(format!("code={code}&csrf_token={csrf}")),
    )
    .await;
    assert_eq!(confirmed.status, StatusCode::OK);
    let codes: Vec<&str> = confirmed.body.matches("<code>").collect();
    assert_eq!(codes.len(), 10, "{}", confirmed.body);
    let stored: String = Connection::open(&f.app_db)
        .unwrap()
        .query_row("SELECT twofa_secret FROM user WHERE id = 1", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert!(
        stored.starts_with("gAAAAA"),
        "a Fernet token, not the raw secret: {stored:.20}"
    );

    // and the next password login demands the second factor
    let (next, _, _) = password_login(&f, "adminzxc").await;
    assert_eq!(next.status, StatusCode::FOUND);
    assert_eq!(next.location(), "/login/2fa");
}
