//! `GET /api/whoami`: may this browser edit the catalogue? The public pages are cached at the edge, so they cannot know
//! the visitor; a small script on the book page asks this endpoint, and only when the `pustaka_staff` marker cookie
//! (set at login, readable by script, carries no authority) is present, so anonymous readers make no extra request.
//! The answer comes from the verified session (`session::identify`), never from the marker.

use crate::{AppState, session};
use axum::Router;
use axum::extract::State;
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use std::sync::Arc;

/// `ROLE_ADMIN` and `ROLE_EDIT` in `cps/constants.py`: the roles `/admin/book/<id>` accepts.
const ROLE_ADMIN: i64 = 1;
const ROLE_EDIT: i64 = 1 << 3;

/// Name of the marker cookie; `login.rs` sets it for staff and the page script reads it.
pub const MARKER_COOKIE: &str = "pustaka_staff";

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/whoami", get(whoami))
}

pub fn can_edit(role: i64) -> bool {
    role & (ROLE_ADMIN | ROLE_EDIT) != 0
}

async fn whoami(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Response {
    let (edit, admin) = match state.settings().await {
        Ok(settings) => match session::identify(&state, &settings, &headers).await {
            Ok(session::Who::User(access)) => {
                (can_edit(access.role), access.role & ROLE_ADMIN != 0)
            }
            _ => (false, false),
        },
        Err(_) => (false, false),
    };
    let mut response = (
        StatusCode::OK,
        format!("{{\"edit\":{edit},\"admin\":{admin}}}"),
    )
        .into_response();
    let out = response.headers_mut();
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    out.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    out.insert(
        header::HeaderName::from_static("cloudflare-cdn-cache-control"),
        HeaderValue::from_static("no-store"),
    );
    out.insert(header::VARY, HeaderValue::from_static("Cookie"));
    response
}

#[cfg(test)]
mod tests {
    use super::can_edit;

    #[test]
    fn edit_and_admin_roles_may_edit_and_others_may_not() {
        assert!(can_edit(1), "admin");
        assert!(can_edit(1 << 3), "edit");
        assert!(can_edit(479), "the real admin account");
        assert!(!can_edit(260), "download + upload only (hermes)");
        assert!(!can_edit(290), "guest");
        assert!(!can_edit(0));
    }
}
