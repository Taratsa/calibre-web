//! `/me/2fa`: enrolling, disabling and the one-time recovery-code display for the signed-in account.
//!
//! This is the only page Rust renders for a logged-in user: it manages the second factor that `login.rs` then
//! enforces. Identity comes from the same session cookie Flask verifies (`session::identify`), so a stale or forged
//! cookie gets the login page instead of an enrolment.
//!
//! Enrolment is two requests: `/me/2fa/start` generates a secret and carries it in a short-lived signed cookie, the
//! GET shows the QR code, and `/me/2fa/confirm` writes the (Fernet-sealed) secret plus ten recovery codes only after a
//! code from the app proves the secret was stored there.

use crate::auth_page::{self, SecurityPage};
use crate::{AppState, authdb, recovery, secretbox, session, totp};
use axum::Router;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use serde_json::json;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

const ENROL_COOKIE: &str = "pustaka_2fa_enrol";
const ENROL_SECONDS: u64 = 900;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/me/2fa", get(show))
        .route("/me/2fa/start", post(start))
        .route("/me/2fa/confirm", post(confirm))
        .route("/me/2fa/disable", post(disable))
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

fn locale(headers: &HeaderMap) -> &'static str {
    // The site's language is Indonesian; only a browser that asks for another supported locale gets it.
    match headers.get(header::ACCEPT_LANGUAGE) {
        None => "id",
        Some(value) => crate::locale::select(value.to_str().ok()).unwrap_or("en"),
    }
}

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

fn page(body: String, status: StatusCode) -> Response {
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
    response
}

fn redirect(location: &str, extra_cookie: Option<String>) -> Response {
    let mut response = (StatusCode::SEE_OTHER, "").into_response();
    let headers = response.headers_mut();
    if let Ok(value) = HeaderValue::from_str(location) {
        headers.insert(header::LOCATION, value);
    }
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    if let Some(cookie) = extra_cookie.and_then(|value| HeaderValue::from_str(&value).ok()) {
        headers.insert(header::SET_COOKIE, cookie);
    }
    response
}

/// The signed-in account, or `None` when the request must go to the login page.
async fn current_user(
    state: &Arc<AppState>,
    headers: &HeaderMap,
) -> Option<(crate::settings::Settings, i64, String, Vec<u8>)> {
    let settings = state.settings().await.ok()?;
    let secret = state.secret(&settings);
    match session::identify(state, &settings, headers).await {
        Ok(session::Who::User(access)) => {
            let app_db = state.app_db.clone();
            let id = access.id;
            let name = tokio::task::spawn_blocking(move || authdb::user_name(&app_db, id))
                .await
                .ok()?
                .ok()??;
            Some(((*settings).clone(), access.id, name, secret))
        }
        _ => None,
    }
}

fn login_redirect() -> Response {
    redirect("/login?next=%2Fme%2F2fa", None)
}

fn parse_form(body: &str) -> Vec<(String, String)> {
    form_urlencoded::parse(body.as_bytes())
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect()
}

fn field<'a>(form: &'a [(String, String)], name: &str) -> Option<&'a str> {
    form.iter()
        .rev()
        .find(|(key, _)| key == name)
        .map(|(_, value)| value.as_str())
}

async fn csrf_ok(
    state: &Arc<AppState>,
    headers: &HeaderMap,
    form: &[(String, String)],
    secret: &[u8],
    at: u64,
) -> bool {
    let _ = state;
    let stored = match session::session_csrf(headers, secret, at) {
        Ok(value) => value,
        Err(_) => return false, // an unverifiable cookie has no CSRF value to compare against
    };
    let token = field(form, "csrf_token").unwrap_or("");
    stored
        .as_deref()
        .is_some_and(|value| session::csrf_matches(token, secret, value, at))
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Enrolment {
    uid: i64,
    secret: String,
    exp: u64,
}

fn enrol_mac(secret: &[u8], payload: &str) -> String {
    // Same HMAC-SHA256 shape as the login's pending cookie: signed, not encrypted (the person owns this secret).
    crate::login::mac(secret, payload)
}

fn sign_enrolment(secret: &[u8], enrolment: &Enrolment) -> String {
    let payload = session::base64_encode(json!(enrolment).to_string().as_bytes());
    let mac = enrol_mac(secret, &payload);
    format!("{payload}.{mac}")
}

fn read_enrolment(secret: &[u8], value: &str, at: u64) -> Option<Enrolment> {
    let (payload, mac) = value.rsplit_once('.')?;
    let expected = enrol_mac(secret, payload);
    if expected.len() != mac.len()
        || expected
            .bytes()
            .zip(mac.bytes())
            .fold(0u8, |difference, (a, b)| difference | (a ^ b))
            != 0
    {
        return None;
    }
    let enrolment: Enrolment = serde_json::from_slice(&session::base64_decode(payload)?).ok()?;
    (at <= enrolment.exp + 30).then_some(enrolment)
}

async fn show(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Response {
    let Some((settings, user_id, name, secret)) = current_user(&state, &headers).await else {
        return login_redirect();
    };
    let at = now();
    let csrf = session::session_csrf(&headers, &secret, at)
        .ok()
        .flatten()
        .map(|value| session::csrf_token(&secret, &value, at))
        .unwrap_or_default();
    let app_db = state.app_db.clone();
    let id = user_id;
    let enabled = tokio::task::spawn_blocking(move || authdb::twofa_enabled(&app_db, id))
        .await
        .ok()
        .and_then(Result::ok)
        .unwrap_or(false);
    let pending = if enabled {
        None
    } else {
        cookie_value(&headers, ENROL_COOKIE)
            .and_then(|value| read_enrolment(&secret, value, at))
            .filter(|enrolment| enrolment.uid == user_id)
            .and_then(|enrolment| {
                let qr = totp::qr_data_uri(&enrolment.secret, &settings.title, &name)?;
                Some((qr, enrolment.secret))
            })
    };
    let body = auth_page::security_page(SecurityPage {
        instance: &settings.title,
        locale: locale(&headers),
        user: &name,
        csrf: &csrf,
        message: None,
        error: None,
        enabled,
        pending,
    });
    page(body, StatusCode::OK)
}

async fn start(State(state): State<Arc<AppState>>, headers: HeaderMap, body: Bytes) -> Response {
    let Some((settings, user_id, _name, secret)) = current_user(&state, &headers).await else {
        return login_redirect();
    };
    let form = parse_form(&String::from_utf8_lossy(&body));
    let at = now();
    if !csrf_ok(&state, &headers, &form, &secret, at).await {
        return page(
            auth_page::notice_page(
                &settings.title,
                locale(&headers),
                "Keamanan akun",
                auth_page::strings(locale(&headers)).csrf_failed,
                Some(("/me/2fa", "Kembali")),
            ),
            StatusCode::BAD_REQUEST,
        );
    }
    let enrolment = Enrolment {
        uid: user_id,
        secret: totp::new_secret(),
        exp: at + ENROL_SECONDS,
    };
    let cookie = format!(
        "{ENROL_COOKIE}={}; Max-Age={ENROL_SECONDS}; HttpOnly; Path=/me/2fa; SameSite=Lax",
        sign_enrolment(&secret, &enrolment)
    );
    redirect("/me/2fa", Some(cookie))
}

async fn confirm(State(state): State<Arc<AppState>>, headers: HeaderMap, body: Bytes) -> Response {
    let Some((settings, user_id, name, secret)) = current_user(&state, &headers).await else {
        return login_redirect();
    };
    let locale = locale(&headers);
    let strings = auth_page::strings(locale);
    let form = parse_form(&String::from_utf8_lossy(&body));
    let at = now();
    let error_page = |message: &str, status: StatusCode| {
        page(
            auth_page::notice_page(
                &settings.title,
                locale,
                strings.security_heading,
                message,
                Some(("/me/2fa", strings.security)),
            ),
            status,
        )
    };
    if !csrf_ok(&state, &headers, &form, &secret, at).await {
        return error_page(strings.csrf_failed, StatusCode::BAD_REQUEST);
    }
    let Some(enrolment) = cookie_value(&headers, ENROL_COOKIE)
        .and_then(|value| read_enrolment(&secret, value, at))
        .filter(|enrolment| enrolment.uid == user_id)
    else {
        return error_page(strings.expired, StatusCode::BAD_REQUEST);
    };
    let code = field(&form, "code").unwrap_or("");
    let Some(step) = totp::verify(&enrolment.secret, code, at) else {
        return error_page(strings.invalid_code, StatusCode::OK);
    };
    let Some(secret_box) = secretbox::SecretBox::from_app_db(&state.app_db) else {
        tracing::error!("the app's .key is unreadable; cannot seal a TOTP secret");
        return error_page(strings.invalid_code, StatusCode::INTERNAL_SERVER_ERROR);
    };
    let codes = recovery::generate();
    let stored = recovery::store(&codes);
    let sealed = secret_box.seal(&enrolment.secret);
    let created = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let app_db = state.app_db.clone();
    let written = tokio::task::spawn_blocking(move || {
        authdb::enable_twofa(&app_db, user_id, &sealed, &stored, &created)
    })
    .await;
    match written {
        Ok(Ok(())) => {}
        other => {
            tracing::error!("cannot store the TOTP secret for user {user_id}: {other:?}");
            return error_page(strings.invalid_code, StatusCode::INTERNAL_SERVER_ERROR);
        }
    }
    let app_db = state.app_db.clone();
    let step = i64::try_from(step).unwrap_or(i64::MAX);
    let _ =
        tokio::task::spawn_blocking(move || authdb::set_twofa_last_step(&app_db, user_id, step))
            .await;
    let app_db = state.app_db.clone();
    let ip = client_ip(&headers);
    let _ = tokio::task::spawn_blocking(move || {
        authdb::audit(
            &app_db,
            user_id,
            "2fa_enabled",
            "two-step verification enabled",
            &ip,
        )
    })
    .await;
    tracing::info!("user {user_id} enabled two-step verification");
    // The codes are in this response only; the cookie that carried the secret is cleared.
    let body = auth_page::recovery_page(&settings.title, locale, &name, &codes);
    let mut response = page(body, StatusCode::OK);
    if let Ok(value) = HeaderValue::from_str(&format!(
        "{ENROL_COOKIE}=; Max-Age=0; HttpOnly; Path=/me/2fa; SameSite=Lax"
    )) {
        response.headers_mut().insert(header::SET_COOKIE, value);
    }
    response
}

async fn disable(State(state): State<Arc<AppState>>, headers: HeaderMap, body: Bytes) -> Response {
    let Some((settings, user_id, name, secret)) = current_user(&state, &headers).await else {
        return login_redirect();
    };
    let locale = locale(&headers);
    let strings = auth_page::strings(locale);
    let form = parse_form(&String::from_utf8_lossy(&body));
    let at = now();
    let csrf = session::session_csrf(&headers, &secret, at)
        .ok()
        .flatten()
        .map(|value| session::csrf_token(&secret, &value, at))
        .unwrap_or_default();
    let error_page = |message: &str, status: StatusCode| {
        page(
            auth_page::notice_page(
                &settings.title,
                locale,
                strings.security_heading,
                message,
                Some(("/me/2fa", strings.security)),
            ),
            status,
        )
    };
    if !csrf_ok(&state, &headers, &form, &secret, at).await {
        return error_page(strings.csrf_failed, StatusCode::BAD_REQUEST);
    }
    let app_db = state.app_db.clone();
    let id = user_id;
    let stored = tokio::task::spawn_blocking(move || authdb::twofa_secret(&app_db, id))
        .await
        .ok()
        .and_then(Result::ok)
        .flatten();
    let Some(sealed) = stored else {
        return error_page(strings.invalid_code, StatusCode::OK);
    };
    let Some(secret_box) = secretbox::SecretBox::from_app_db(&state.app_db) else {
        return error_page(strings.invalid_code, StatusCode::INTERNAL_SERVER_ERROR);
    };
    let Some(totp_secret) = secret_box.open(&sealed) else {
        return error_page(strings.invalid_code, StatusCode::INTERNAL_SERVER_ERROR);
    };
    if totp::verify(&totp_secret, field(&form, "code").unwrap_or(""), at).is_none() {
        return error_page(strings.invalid_code, StatusCode::OK);
    }
    let app_db = state.app_db.clone();
    let cleared =
        tokio::task::spawn_blocking(move || authdb::disable_twofa(&app_db, user_id)).await;
    if !matches!(cleared, Ok(Ok(()))) {
        tracing::error!("cannot clear the TOTP secret for user {user_id}: {cleared:?}");
        return error_page(strings.invalid_code, StatusCode::INTERNAL_SERVER_ERROR);
    }
    let app_db = state.app_db.clone();
    let ip = client_ip(&headers);
    let _ = tokio::task::spawn_blocking(move || {
        authdb::audit(
            &app_db,
            user_id,
            "2fa_disabled",
            "two-step verification disabled",
            &ip,
        )
    })
    .await;
    tracing::info!("user {user_id} disabled two-step verification");
    let body = auth_page::security_page(SecurityPage {
        instance: &settings.title,
        locale,
        user: &name,
        csrf: &csrf,
        message: Some(strings.done),
        error: None,
        enabled: false,
        pending: None,
    });
    page(body, StatusCode::OK)
}

#[cfg(test)]
mod tests {
    use super::{Enrolment, read_enrolment, sign_enrolment};

    #[test]
    fn the_enrolment_cookie_round_trips_and_expires() {
        let secret = b"enrol-secret";
        let enrolment = Enrolment {
            uid: 3,
            secret: "GEZDGNBVGY3TQOJQ".into(),
            exp: 1_790_000_900,
        };
        let value = sign_enrolment(secret, &enrolment);
        let read = read_enrolment(secret, &value, 1_790_000_000).expect("valid");
        assert_eq!(read.uid, 3);
        assert_eq!(read.secret, "GEZDGNBVGY3TQOJQ");
        assert!(
            read_enrolment(secret, &value, 1_790_000_930).is_some(),
            "exp + 30 s skew"
        );
        assert!(read_enrolment(secret, &value, 1_790_001_000).is_none());
        assert!(read_enrolment(b"other", &value, 1_790_000_000).is_none());
    }
}
