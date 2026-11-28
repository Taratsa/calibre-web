//! The response headers `add_security_headers` (`cps/web.py`) puts on every Flask response. The Readium branch is left
//! out (not served from Rust); the reader-page branch applies to responses carrying [`READER_PAGE`].

use crate::AppState;
use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderName, HeaderValue, Request, header};
use axum::middleware::Next;
use axum::response::Response;
use std::sync::Arc;

/// Set by the reader route on its response so the layer adds the viewer's extra CSP sources, and removed again.
pub const READER_PAGE: &str = "x-internal-reader-page";
/// Set by the login pages, which load Cloudflare Turnstile's script and iframe.
pub const AUTH_PAGE: &str = "x-internal-auth-page";

/// Cloudflare Turnstile serves its widget script and the challenge iframe from this origin.
pub const TURNSTILE_ORIGIN: &str = "https://challenges.cloudflare.com";

fn default_sources(trusted_hosts: &str) -> Vec<&str> {
    let mut sources: Vec<&str> = trusted_hosts
        .split(',')
        .map(str::trim)
        .filter(|host| !host.is_empty())
        .collect();
    sources.extend(["'self'", "'unsafe-inline'", "'unsafe-eval'"]);
    sources
}

pub fn content_security_policy(trusted_hosts: &str) -> String {
    format!(
        "default-src {}; font-src 'self' data:; img-src 'self' data:; object-src 'none';",
        default_sources(trusted_hosts).join(" ")
    )
}

/// `request.endpoint == "web.read_book"` in `add_security_headers`: the viewer renders pages and fonts from `blob:`
/// URLs and runs its worker from a `blob:` script, so those sources are added (without Google Drive, which Rust never
/// serves).
pub fn reader_content_security_policy(trusted_hosts: &str) -> String {
    let sources = default_sources(trusted_hosts).join(" ");
    format!(
        "default-src {sources}; font-src 'self' data: blob: ; img-src 'self' data: blob: ; style-src-elem 'self' blob: 'unsafe-inline'; frame-src 'self' blob:; script-src-elem {sources} blob:; object-src 'none';"
    )
}

pub async fn layer(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    let reader_page = response.headers_mut().remove(READER_PAGE).is_some();
    let auth_page = response.headers_mut().remove(AUTH_PAGE).is_some();
    let trusted_hosts = state
        .settings()
        .await
        .map(|s| s.trusted_hosts.clone())
        .unwrap_or_default();
    let policy = if reader_page {
        reader_content_security_policy(&trusted_hosts)
    } else if auth_page {
        content_security_policy(&format!("{trusted_hosts},{TURNSTILE_ORIGIN}"))
    } else {
        content_security_policy(&trusted_hosts)
    };
    // A response proxied from Flask already carries these headers (including the reader page's wider CSP), so only
    // fill in what is missing: overwriting would replace Flask's own answer with the generic policy.
    let headers = response.headers_mut();
    if let Ok(value) = HeaderValue::from_str(&policy) {
        headers
            .entry(header::CONTENT_SECURITY_POLICY)
            .or_insert(value);
    }
    headers
        .entry(header::X_CONTENT_TYPE_OPTIONS)
        .or_insert(HeaderValue::from_static("nosniff"));
    headers
        .entry(header::X_FRAME_OPTIONS)
        .or_insert(HeaderValue::from_static("SAMEORIGIN"));
    headers
        .entry(HeaderName::from_static("x-xss-protection"))
        .or_insert(HeaderValue::from_static("1; mode=block"));
    headers
        .entry(header::STRICT_TRANSPORT_SECURITY)
        .or_insert(HeaderValue::from_static("max-age=31536000"));
    if let Some(onion) = state
        .onion_location
        .as_deref()
        .and_then(|v| HeaderValue::from_str(v).ok())
    {
        headers
            .entry(HeaderName::from_static("onion-location"))
            .or_insert(onion);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::content_security_policy;

    // The CSP of a live /files response.
    #[test]
    fn matches_live_header() {
        assert_eq!(
            content_security_policy(
                "https://www.googletagmanager.com,https://www.google-analytics.com/,https://umami.kenadera.org,https://static.cloudflareinsights.com/"
            ),
            "default-src https://www.googletagmanager.com https://www.google-analytics.com/ https://umami.kenadera.org https://static.cloudflareinsights.com/ 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; img-src 'self' data:; object-src 'none';"
        );
    }

    #[test]
    fn empty_hosts_leave_only_self() {
        assert!(
            content_security_policy("")
                .starts_with("default-src 'self' 'unsafe-inline' 'unsafe-eval';")
        );
    }
}
