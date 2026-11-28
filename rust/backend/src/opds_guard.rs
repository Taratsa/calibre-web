//! `/opds/*`: one guard, then Flask.
//!
//! Every OPDS feed and download is still rendered by Flask — this module answers nothing itself. It exists because
//! Flask's Basic auth is a second way into an account: a correct username and password there opens a session cookie
//! that the admin pages accept, which would walk straight past the second factor. So for an account with 2FA enabled a
//! Basic-auth request is refused here (403, with a message saying to sign in through the login page), and everything
//! else is proxied to Flask unchanged.
//!
//! A wrong password is NOT refused here: it is proxied, so Flask answers its own 401/429 and its counters and logs stay
//! the ones that apply.

use crate::AppState;
use crate::authdb;
use axum::Router;
use axum::body::Bytes;
use axum::extract::{OriginalUri, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::any;
use std::sync::Arc;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/opds", any(guard))
        .route("/opds/{*rest}", any(guard))
}

/// `Authorization: Basic base64(user:password)` → the two halves.
fn basic_credentials(headers: &HeaderMap) -> Option<(String, String)> {
    let value = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    let (scheme, encoded) = value.split_once(' ')?;
    if !scheme.eq_ignore_ascii_case("basic") {
        return None;
    }
    let decoded = crate::session::base64_decode(encoded.trim())?;
    let text = String::from_utf8(decoded).ok()?;
    let (user, password) = text.split_once(':')?;
    Some((user.to_owned(), password.to_owned()))
}

async fn guard(
    State(state): State<Arc<AppState>>,
    OriginalUri(uri): OriginalUri,
    method: Method,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let path = uri
        .path_and_query()
        .map_or_else(|| uri.path().to_owned(), |value| value.as_str().to_owned());
    if let Some((name, password)) = basic_credentials(&headers) {
        let app_db = state.app_db.clone();
        let lookup = name.trim().to_lowercase();
        let user = tokio::task::spawn_blocking(move || authdb::find_user(&app_db, &lookup))
            .await
            .ok()
            .and_then(Result::ok)
            .flatten();
        if let Some(user) = user.filter(|user| user.name != "Guest") {
            let stored = user.password.clone();
            let candidate = password;
            let verified =
                tokio::task::spawn_blocking(move || crate::password::verify(&stored, &candidate))
                    .await
                    .unwrap_or(false);
            if verified && user.has_twofa() {
                tracing::warn!(
                    "refused Basic auth for user {} on {path}: two-step verification is enabled",
                    user.id
                );
                let text = "This account uses two-step verification.\n\
                            Sign in at /login with your password and a code from your authenticator app.\n";
                let mut response = (StatusCode::FORBIDDEN, text).into_response();
                let headers = response.headers_mut();
                headers.insert(
                    header::CONTENT_TYPE,
                    HeaderValue::from_static("text/plain; charset=utf-8"),
                );
                headers.insert(
                    header::CACHE_CONTROL,
                    HeaderValue::from_static("private, no-store"),
                );
                return response;
            }
        }
    }
    crate::proxy::fallback_with_body(state, &path, method, headers, body.to_vec()).await
}
