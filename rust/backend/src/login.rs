//! `POST /login` and `POST /login/2fa`: the password step and the second factor, owned by Rust.
//!
//! Behaviour follows Flask's `login_post` where it is visible: the same fields (`username`, `password`, `remember_me`,
//! `next`, `csrf_token`, `forgot`), the same per-username limits (3/minute, 40/day), the same session and remember
//! cookies (signed with the app secret, so Flask accepts them unchanged), a `user_session` revocation row, and
//! "Wrong username or password" for an unknown account or a bad password. On top of that it adds Cloudflare Turnstile
//! and, for accounts that enabled it, a second step: a TOTP code or a one-time recovery code.
//!
//! Anything this module does not own — the "Forgot password?" mail, LDAP and OAuth login — is proxied to Flask
//! unchanged, so those paths keep working exactly as before.

use crate::auth_page::{self, CodePage, LoginPage};
use crate::{AppState, authdb, random, recovery, secretbox, session, settings, totp};
use axum::Router;
use axum::body::Bytes;
use axum::extract::{OriginalUri, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use hmac::{Hmac, KeyInit, Mac};
use serde_json::json;
use sha2::Sha256;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// How long the password step's result is carried to the second step.
const PENDING_SECONDS: i64 = 300;
const SESSION_COOKIE: &str = "session";
const PENDING_COOKIE: &str = "pustaka_2fa";
/// `REMEMBER_COOKIE_DURATION`'s default (365 days).
const REMEMBER_SECONDS: u64 = 365 * 24 * 60 * 60;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/login", get(show_login).post(submit_login))
        .route("/login/2fa", get(show_twofa).post(submit_twofa))
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs())
        .unwrap_or(0)
}

fn cookie_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(key, _)| *key == name)
        .map(|(_, value)| value)
}

/// `X-Forwarded-For`'s first element — the address Flask's `login_manager._create_identifier` hashes. Rust forwards
/// the header unchanged, so Flask computes the same `_id`.
fn forwarded_addr(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(|value| value.trim().to_owned())
        .unwrap_or_default()
}

/// The client address for logs and Turnstile: Cloudflare's header first, as `helper.get_client_ip` does.
fn client_ip(headers: &HeaderMap) -> String {
    for name in ["cf-connecting-ip", "x-forwarded-for"] {
        if let Some(value) = headers.get(name).and_then(|v| v.to_str().ok()) {
            let first = value.split(',').next().unwrap_or("").trim();
            if !first.is_empty() {
                return first.to_owned();
            }
        }
    }
    String::new()
}

fn user_agent(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::USER_AGENT)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned)
}

fn locale(headers: &HeaderMap) -> &'static str {
    // The site's language is Indonesian; only a browser that asks for another supported locale gets it.
    match headers.get(header::ACCEPT_LANGUAGE) {
        None => "id",
        Some(value) => crate::locale::select(value.to_str().ok()).unwrap_or("en"),
    }
}

/// Only a same-site path is a valid `next`; anything else falls back to the home page.
fn next_target(raw: Option<&str>) -> String {
    let candidate = raw.unwrap_or("").trim();
    let safe = candidate.starts_with('/')
        && !candidate.starts_with("//")
        && !candidate.contains('\\')
        && !candidate.chars().any(char::is_control)
        && !candidate.starts_with("/login")
        && candidate.len() <= 512;
    if safe {
        candidate.to_owned()
    } else {
        "/".to_owned()
    }
}

fn html(body: String, status: StatusCode, auth_page: bool) -> Response {
    let mut response = (status, body).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    headers.insert(header::VARY, HeaderValue::from_static("Cookie"));
    headers.insert(
        header::HeaderName::from_static("x-robots-tag"),
        HeaderValue::from_static("noindex"),
    );
    if auth_page {
        headers.insert(
            header::HeaderName::from_static(crate::security::AUTH_PAGE),
            HeaderValue::from_static("1"),
        );
    }
    response
}

fn redirect(location: &str) -> Response {
    let mut response = (StatusCode::FOUND, "").into_response();
    let headers = response.headers_mut();
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

/// The signed CSRF token a form carries (`csrf_token()` in Jinja) and, when the request had no session cookie, the
/// cookie that stores the value it signs.
fn csrf_for(headers: &HeaderMap, secret: &[u8], at: u64) -> (String, Option<String>) {
    let (value, minted) = match session::anonymous_csrf(headers, secret, at) {
        Ok(Some(value)) => (value, None),
        _ => {
            let value = session::new_csrf_value();
            let cookie = session::new_session_cookie(secret, &value, at);
            (value, Some(cookie))
        }
    };
    (session::csrf_token(secret, &value, at), minted)
}

fn session_cookie_header(value: &str) -> String {
    format!("{SESSION_COOKIE}={value}; HttpOnly; Path=/; SameSite=Lax")
}

fn remember_cookie_header(value: &str) -> String {
    let expires =
        httpdate::fmt_http_date(SystemTime::now() + Duration::from_secs(REMEMBER_SECONDS));
    format!("remember_token={value}; Expires={expires}; HttpOnly; Path=/; SameSite=Strict")
}

/// The signed carrier between the password step and the second step: `uid`, `remember`, `next` and an expiry. It holds
/// no secret, so an HMAC with the app secret is enough; Flask never sees it.
#[derive(serde::Serialize, serde::Deserialize)]
struct Pending {
    uid: i64,
    remember: bool,
    next: String,
    exp: i64,
}

/// HMAC-SHA256(secret, payload), base64url: the signature of Rust's own short-lived cookies.
pub(crate) fn mac(secret: &[u8], payload: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret).expect("HMAC accepts any key length");
    mac.update(payload.as_bytes());
    session::base64_encode(&mac.finalize().into_bytes())
}

fn sign_pending(secret: &[u8], pending: &Pending) -> String {
    let payload = session::base64_encode(json!(pending).to_string().as_bytes());
    let mac = mac(secret, &payload);
    format!("{payload}.{mac}")
}

fn read_pending(secret: &[u8], value: &str, at: u64) -> Option<Pending> {
    let (payload, signature) = value.rsplit_once('.')?;
    let expected = mac(secret, payload);
    if expected.len() != signature.len()
        || expected
            .bytes()
            .zip(signature.bytes())
            .fold(0u8, |difference, (a, b)| difference | (a ^ b))
            != 0
    {
        return None;
    }
    let pending: Pending = serde_json::from_slice(&session::base64_decode(payload)?).ok()?;
    let exp = u64::try_from(pending.exp).ok()?;
    // `at > exp` with a small allowance for a clock that stepped backwards.
    (at <= exp + 30).then_some(pending)
}

fn pending_cookie_header(value: &str) -> String {
    format!("{PENDING_COOKIE}={value}; Max-Age={PENDING_SECONDS}; HttpOnly; Path=/; SameSite=Lax")
}

fn clear_cookie_header(name: &str) -> String {
    format!("{name}=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax")
}

async fn show_login(
    State(state): State<Arc<AppState>>,
    uri: OriginalUri,
    headers: HeaderMap,
) -> Response {
    let query = uri.0.query().unwrap_or("");
    let next = form_value(query, "next").unwrap_or_else(|| "/".to_owned());
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("login settings unavailable: {error}");
            return notice(
                &state,
                &headers,
                "Masuk",
                "Pengaturan tidak tersedia.",
                None,
            )
            .await;
        }
    };
    let secret = state.secret(&settings);
    let at = now();
    if let Ok(session::Who::User(_)) = session::identify(&state, &settings, &headers).await {
        return redirect("/");
    }
    let (csrf, minted) = csrf_for(&headers, &secret, at);
    let locale = locale(&headers);
    let page = auth_page::login_page(LoginPage {
        instance: &settings.title,
        locale,
        next: &next_target(Some(&next)),
        username: "",
        csrf: &csrf,
        error: None,
        turnstile_site_key: state
            .turnstile
            .as_ref()
            .map(crate::turnstile::Turnstile::site_key),
        mail_configured: settings.mail_configured,
        remote_login: settings.remote_login,
    });
    with_cookie(html(page, StatusCode::OK, true), minted)
}

fn with_cookie(response: Response, cookie: Option<String>) -> Response {
    match cookie.and_then(|value| HeaderValue::from_str(&session_cookie_header(&value)).ok()) {
        Some(value) => {
            let mut response = response;
            response.headers_mut().insert(header::SET_COOKIE, value);
            response
        }
        None => response,
    }
}

async fn notice(
    state: &Arc<AppState>,
    headers: &HeaderMap,
    title: &str,
    message: &str,
    link: Option<(&str, &str)>,
) -> Response {
    let settings = state.settings().await.ok();
    let page = auth_page::notice_page(
        settings
            .as_ref()
            .map(|s| s.title.as_str())
            .unwrap_or("Pustaka"),
        locale(headers),
        title,
        message,
        link,
    );
    html(page, StatusCode::OK, false)
}

/// `application/x-www-form-urlencoded` or a query string, as `request.form` flattens it (last value wins).
fn parse_form(body: &str) -> Vec<(String, String)> {
    form_urlencoded::parse(body.as_bytes())
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect()
}

fn form_value(form: &str, name: &str) -> Option<String> {
    parse_form(form)
        .into_iter()
        .rev()
        .find(|(key, _)| key == name)
        .map(|(_, value)| value)
}

fn field<'a>(form: &'a [(String, String)], name: &str) -> Option<&'a str> {
    form.iter()
        .rev()
        .find(|(key, _)| key == name)
        .map(|(_, value)| value.as_str())
}

async fn submit_login(
    State(state): State<Arc<AppState>>,
    OriginalUri(uri): OriginalUri,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let form = parse_form(&String::from_utf8_lossy(&body));
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("login settings unavailable: {error}");
            return notice(
                &state,
                &headers,
                "Masuk",
                "Pengaturan tidak tersedia.",
                None,
            )
            .await;
        }
    };
    // LDAP and OAuth accounts, and the password-reset mail, are Flask's; hand the exact request over.
    if settings.login_type != 0 || field(&form, "forgot") == Some("forgot") {
        return proxy_login(&state, &uri, &headers, body.to_vec()).await;
    }
    let secret = state.secret(&settings);
    let at = now();
    let locale = locale(&headers);
    let next = next_target(field(&form, "next"));
    let username = field(&form, "username").unwrap_or("").trim().to_lowercase();
    let password = field(&form, "password").unwrap_or("").to_owned();
    let remember = field(&form, "remember_me").is_some();

    let rerender = |error: &str, status: StatusCode, csrf: &str, minted: Option<String>| {
        let page = auth_page::login_page(LoginPage {
            instance: &settings.title,
            locale,
            next: &next,
            username: &username,
            csrf,
            error: Some(error),
            turnstile_site_key: state
                .turnstile
                .as_ref()
                .map(crate::turnstile::Turnstile::site_key),
            mail_configured: settings.mail_configured,
            remote_login: settings.remote_login,
        });
        with_cookie(html(page, status, true), minted)
    };

    // CSRF: Flask-WTF's 400 on a missing or stale token.
    let stored_csrf = session::anonymous_csrf(&headers, &secret, at)
        .ok()
        .flatten();
    let token = field(&form, "csrf_token").unwrap_or("");
    let csrf_ok = stored_csrf
        .as_deref()
        .is_some_and(|value| session::csrf_matches(token, &secret, value, at));
    if !csrf_ok {
        let (csrf, minted) = csrf_for(&headers, &secret, at);
        let strings = auth_page::strings(locale);
        return rerender(strings.csrf_failed, StatusCode::BAD_REQUEST, &csrf, minted);
    }
    // Re-render with the token the browser sent: it is the signed form of this session's value.
    let csrf = token.to_owned();

    // Turnstile before the password: a bot must not spend an account's scrypt budget.
    if let Some(turnstile) = state.turnstile.as_ref() {
        let token = field(&form, "cf-turnstile-response").unwrap_or("");
        if !turnstile
            .verify(&state.proxy_client, token, &client_ip(&headers))
            .await
        {
            return rerender(
                auth_page::strings(locale).bot_failed,
                StatusCode::OK,
                &csrf,
                None,
            );
        }
    }

    // Flask's limits on /login, plus a per-address guard against username spraying.
    let minute = Duration::from_secs(60);
    let day = Duration::from_secs(24 * 60);
    let ip_key = format!("login-ip:{}", client_ip(&headers));
    let allowed = state
        .limits
        .allow(&format!("login-name:{username}"), 3, minute)
        && state
            .limits
            .allow(&format!("login-name-day:{username}"), 40, day)
        && state.limits.allow(&ip_key, 10, minute);
    if !allowed {
        let seconds = state
            .limits
            .retry_after(&format!("login-name:{username}"), minute);
        let message =
            auth_page::strings(locale)
                .rate_limited
                .replacen("%s", &seconds.to_string(), 1);
        return rerender(&message, StatusCode::OK, &csrf, None);
    }

    let app_db = state.app_db.clone();
    let lookup = username.clone();
    let user = tokio::task::spawn_blocking(move || authdb::find_user(&app_db, &lookup)).await;
    let user = match user {
        Ok(Ok(Some(user))) if user.name != "Guest" => user,
        Ok(Ok(_)) => {
            tracing::warn!(
                "login failed for \"{username}\" from {}",
                client_ip(&headers)
            );
            return rerender(
                auth_page::strings(locale).wrong,
                StatusCode::OK,
                &csrf,
                None,
            );
        }
        Ok(Err(error)) => {
            tracing::error!("login lookup failed: {error}");
            return rerender(
                auth_page::strings(locale).wrong,
                StatusCode::OK,
                &csrf,
                None,
            );
        }
        Err(error) => {
            tracing::error!("login lookup task failed: {error}");
            return rerender(
                auth_page::strings(locale).wrong,
                StatusCode::OK,
                &csrf,
                None,
            );
        }
    };

    // scrypt is deliberately slow: keep it off the async workers.
    let stored = user.password.clone();
    let candidate = password.clone();
    let verified =
        tokio::task::spawn_blocking(move || crate::password::verify(&stored, &candidate))
            .await
            .unwrap_or(false);
    if !verified {
        tracing::warn!(
            "login failed for \"{username}\" from {}",
            client_ip(&headers)
        );
        return rerender(
            auth_page::strings(locale).wrong,
            StatusCode::OK,
            &csrf,
            None,
        );
    }

    state.limits.clear(&format!("login-name:{username}"));
    if user.has_twofa() {
        let pending = Pending {
            uid: user.id,
            remember,
            next,
            exp: i64::try_from(at).unwrap_or(0) + PENDING_SECONDS,
        };
        let mut response = redirect("/login/2fa");
        if let Ok(value) =
            HeaderValue::from_str(&pending_cookie_header(&sign_pending(&secret, &pending)))
        {
            response.headers_mut().insert(header::SET_COOKIE, value);
        }
        return response;
    }
    log_in(&state, &settings, user.id, remember, &next, &headers, at).await
}

/// Mint the session (and remember cookie), record the revocation row, and send the person on their way.
async fn log_in(
    state: &Arc<AppState>,
    settings: &settings::Settings,
    user_id: i64,
    remember: bool,
    next: &str,
    headers: &HeaderMap,
    at: u64,
) -> Response {
    let secret = state.secret(settings);
    let session_key = session::identifier(&forwarded_addr(headers), user_agent(headers).as_deref());
    let random = random::hex(10);
    let csrf = session::session_csrf(headers, &secret, at).ok().flatten();
    let cookie = session::login_session_cookie(
        &secret,
        user_id,
        &session_key,
        &random,
        remember,
        csrf.as_deref(),
        at,
    );
    let app_db = state.app_db.clone();
    let (key, nonce) = (session_key.clone(), random.clone());
    let expiry = authdb::session_expiry(i64::try_from(at).unwrap_or(0));
    let _ = tokio::task::spawn_blocking(move || {
        authdb::record_login(&app_db, user_id, &key, &nonce, expiry)
    })
    .await;
    let mut response = redirect(next);
    let mut cookies = vec![session_cookie_header(&cookie)];
    if remember {
        cookies.push(remember_cookie_header(&session::remember_cookie(
            &secret, user_id, &random,
        )));
    }
    cookies.push(clear_cookie_header(PENDING_COOKIE));
    // A readable hint for the cached book pages: show the Edit link only to people who may use it. It carries no
    // authority (`/api/whoami` and Flask check the session), so a forged or stale marker shows nothing.
    let app_db = state.app_db.clone();
    let staff = tokio::task::spawn_blocking(move || {
        settings::load_access(&app_db, Some(user_id))
            .ok()
            .flatten()
            .is_some_and(|access| crate::whoami::can_edit(access.role))
    })
    .await
    .unwrap_or(false);
    if staff {
        cookies.push(format!(
            "{}=1; Max-Age=2678400; Path=/; SameSite=Lax; Secure",
            crate::whoami::MARKER_COOKIE
        ));
    }
    let values: Vec<HeaderValue> = cookies
        .iter()
        .filter_map(|value| HeaderValue::from_str(value).ok())
        .collect();
    for value in values {
        response.headers_mut().append(header::SET_COOKIE, value);
    }
    tracing::info!("user {user_id} logged in from {}", client_ip(headers));
    response
}

async fn proxy_login(
    state: &Arc<AppState>,
    uri: &axum::http::Uri,
    headers: &HeaderMap,
    body: Vec<u8>,
) -> Response {
    let path = uri
        .path_and_query()
        .map_or_else(|| uri.path().to_owned(), |value| value.as_str().to_owned());
    crate::proxy::fallback_with_body(state.clone(), &path, Method::POST, headers.clone(), body)
        .await
}

async fn show_twofa(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Response {
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("2FA settings unavailable: {error}");
            return notice(
                &state,
                &headers,
                "Verifikasi",
                "Pengaturan tidak tersedia.",
                None,
            )
            .await;
        }
    };
    let secret = state.secret(&settings);
    let at = now();
    let Some(pending) =
        cookie_value(&headers, PENDING_COOKIE).and_then(|value| read_pending(&secret, value, at))
    else {
        return notice(
            &state,
            &headers,
            "Verifikasi dua langkah",
            auth_page::strings(locale(&headers)).expired,
            Some(("/login", auth_page::strings(locale(&headers)).back_to_login)),
        )
        .await;
    };
    let _ = pending;
    let (csrf, minted) = csrf_for(&headers, &secret, at);
    let page = auth_page::code_page(CodePage {
        instance: &settings.title,
        locale: locale(&headers),
        csrf: &csrf,
        error: None,
        recovery: false,
    });
    with_cookie(html(page, StatusCode::OK, false), minted)
}

async fn submit_twofa(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let form = parse_form(&String::from_utf8_lossy(&body));
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("2FA settings unavailable: {error}");
            return notice(
                &state,
                &headers,
                "Verifikasi",
                "Pengaturan tidak tersedia.",
                None,
            )
            .await;
        }
    };
    let secret = state.secret(&settings);
    let at = now();
    let locale = locale(&headers);
    let reuse = |error: Option<&'static str>, recovery: bool| {
        let (csrf, minted) = csrf_for(&headers, &secret, at);
        let page = auth_page::code_page(CodePage {
            instance: &settings.title,
            locale,
            csrf: &csrf,
            error,
            recovery,
        });
        with_cookie(html(page, StatusCode::OK, false), minted)
    };
    let Some(pending) =
        cookie_value(&headers, PENDING_COOKIE).and_then(|value| read_pending(&secret, value, at))
    else {
        return notice(
            &state,
            &headers,
            "Verifikasi dua langkah",
            auth_page::strings(locale).expired,
            Some(("/login", auth_page::strings(locale).back_to_login)),
        )
        .await;
    };
    let stored_csrf = session::anonymous_csrf(&headers, &secret, at)
        .ok()
        .flatten();
    let token = field(&form, "csrf_token").unwrap_or("");
    if !stored_csrf
        .as_deref()
        .is_some_and(|value| session::csrf_matches(token, &secret, value, at))
    {
        return reuse(Some(auth_page::strings(locale).csrf_failed), false);
    }
    let key = format!("2fa:{}", pending.uid);
    if !state.limits.allow(&key, 5, Duration::from_secs(60)) {
        let strings = auth_page::strings(locale);
        let seconds = state.limits.retry_after(&key, Duration::from_secs(60));
        let message = strings.rate_limited.replacen("%s", &seconds.to_string(), 1);
        return notice(&state, &headers, "Verifikasi", &message, None).await;
    }

    let app_db = state.app_db.clone();
    let user_id = pending.uid;
    let user = tokio::task::spawn_blocking(move || {
        let conn = rusqlite::Connection::open_with_flags(
            &app_db,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )?;
        conn.query_row(
            "SELECT twofa_secret, twofa_last_step, twofa_recovery FROM user WHERE id = ?1",
            [user_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<i64>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )
    })
    .await;
    let (sealed, last_step, stored_recovery) = match user {
        Ok(Ok(row)) => row,
        Ok(Err(error)) => {
            tracing::error!("2FA lookup failed for user {user_id}: {error}");
            return reuse(Some(auth_page::strings(locale).invalid_code), false);
        }
        Err(error) => {
            tracing::error!("2FA lookup task failed: {error}");
            return reuse(Some(auth_page::strings(locale).invalid_code), false);
        }
    };
    let Some(sealed) = sealed.filter(|value| !value.is_empty()) else {
        // The second factor was removed between the two steps; the password was already correct.
        return log_in(
            &state,
            &settings,
            user_id,
            pending.remember,
            &pending.next,
            &headers,
            at,
        )
        .await;
    };
    let Some(secret_box) = secretbox::SecretBox::from_app_db(&state.app_db) else {
        tracing::error!("the app's .key is unreadable; cannot open the TOTP secret");
        return reuse(Some(auth_page::strings(locale).invalid_code), false);
    };
    let Some(totp_secret) = secret_box.open(&sealed) else {
        tracing::error!("user {user_id} has an undecryptable TOTP secret");
        return reuse(Some(auth_page::strings(locale).invalid_code), false);
    };

    if let Some(code) = field(&form, "recovery_code") {
        let stored = recovery::load(stored_recovery.as_deref());
        let Some(index) = recovery::position(&stored, code) else {
            tracing::warn!("invalid recovery code for user {user_id}");
            return reuse(Some(auth_page::strings(locale).invalid_code), true);
        };
        let mut left = stored;
        left.remove(index);
        let app_db = state.app_db.clone();
        let json = serde_json::to_string(&left).unwrap_or_else(|_| "[]".to_owned());
        let _ = tokio::task::spawn_blocking(move || authdb::set_recovery(&app_db, user_id, &json))
            .await;
        tracing::info!("user {user_id} logged in with a recovery code");
        return log_in(
            &state,
            &settings,
            user_id,
            pending.remember,
            &pending.next,
            &headers,
            at,
        )
        .await;
    }

    let code = field(&form, "code").unwrap_or("");
    let Some(step) = totp::verify(&totp_secret, code, at) else {
        tracing::warn!("invalid TOTP code for user {user_id}");
        return reuse(Some(auth_page::strings(locale).invalid_code), false);
    };
    if last_step.is_some_and(|last| i64::try_from(step).unwrap_or(i64::MAX) <= last) {
        // The code was accepted already: RFC 6238 §5.2 forbids replaying it.
        tracing::warn!("replayed TOTP code for user {user_id}");
        return reuse(Some(auth_page::strings(locale).invalid_code), false);
    }
    let app_db = state.app_db.clone();
    let step = i64::try_from(step).unwrap_or(i64::MAX);
    let _ =
        tokio::task::spawn_blocking(move || authdb::set_twofa_last_step(&app_db, user_id, step))
            .await;
    state.limits.clear(&key);
    log_in(
        &state,
        &settings,
        user_id,
        pending.remember,
        &pending.next,
        &headers,
        at,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::{Pending, next_target, parse_form, read_pending, sign_pending};

    #[test]
    fn next_accepts_only_same_site_paths() {
        assert_eq!(next_target(Some("/admin/view")), "/admin/view");
        assert_eq!(next_target(Some("/")), "/");
        for hostile in [
            "//evil.example/",
            "https://evil.example/",
            "/\\evil",
            "/login",
            "/login?next=/x",
            "/a\nb",
            "",
        ] {
            assert_eq!(next_target(Some(hostile)), "/", "{hostile:?}");
        }
        assert_eq!(next_target(None), "/");
    }

    #[test]
    fn the_form_parser_matches_flask_flattening() {
        let form = parse_form("username=Admin&password=a%26b&remember_me=on&username=last");
        assert_eq!(super::field(&form, "password"), Some("a&b"));
        assert_eq!(super::field(&form, "remember_me"), Some("on"));
        // `request.form` keeps the first value for a repeated key in Flask; this parser takes the last, which is
        // what a browser actually sends (it sends one) and what the login compares against.
        assert_eq!(super::field(&form, "username"), Some("last"));
        assert_eq!(super::field(&form, "missing"), None);
    }

    #[test]
    fn the_pending_cookie_round_trips_and_expires() {
        let secret = b"pending-secret";
        let pending = Pending {
            uid: 7,
            remember: true,
            next: "/admin/view".into(),
            exp: 1_790_000_300,
        };
        let value = sign_pending(secret, &pending);
        let read = read_pending(secret, &value, 1_790_000_000).expect("valid");
        assert_eq!(read.uid, 7);
        assert!(read.remember);
        assert_eq!(read.next, "/admin/view");
        assert!(
            read_pending(secret, &value, 1_790_000_330).is_some(),
            "clock skew allowance"
        );
        assert!(
            read_pending(secret, &value, 1_790_000_400).is_none(),
            "expired"
        );
        assert!(
            read_pending(b"other", &value, 1_790_000_000).is_none(),
            "wrong key"
        );
        assert!(read_pending(secret, "garbage", 1_790_000_000).is_none());
        // tampering with the payload breaks the MAC
        let (payload, signature) = value.split_once('.').unwrap();
        let tampered = format!("{}{}", &payload[..payload.len() - 4], signature);
        assert!(read_pending(secret, &tampered, 1_790_000_000).is_none());
    }
}
