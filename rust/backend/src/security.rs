//! The response headers `add_security_headers` (`cps/web.py`) puts on every Flask response. The
//! reader-page and Readium branches are left out: those routes are not served from Rust.

use crate::AppState;
use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderName, HeaderValue, Request, header};
use axum::middleware::Next;
use axum::response::Response;
use std::sync::Arc;

pub fn content_security_policy(trusted_hosts: &str) -> String {
    let mut sources: Vec<&str> = trusted_hosts
        .split(',')
        .map(str::trim)
        .filter(|host| !host.is_empty())
        .collect();
    sources.extend(["'self'", "'unsafe-inline'", "'unsafe-eval'"]);
    format!(
        "default-src {}; font-src 'self' data:; img-src 'self' data:; object-src 'none';",
        sources.join(" ")
    )
}

pub async fn layer(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    let trusted_hosts = state
        .settings()
        .await
        .map(|s| s.trusted_hosts.clone())
        .unwrap_or_default();
    let headers = response.headers_mut();
    if let Ok(value) = HeaderValue::from_str(&content_security_policy(&trusted_hosts)) {
        headers.insert(header::CONTENT_SECURITY_POLICY, value);
    }
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::X_FRAME_OPTIONS,
        HeaderValue::from_static("SAMEORIGIN"),
    );
    headers.insert(
        HeaderName::from_static("x-xss-protection"),
        HeaderValue::from_static("1; mode=block"),
    );
    headers.insert(
        header::STRICT_TRANSPORT_SECURITY,
        HeaderValue::from_static("max-age=31536000"),
    );
    if let Some(onion) = state
        .onion_location
        .as_deref()
        .and_then(|v| HeaderValue::from_str(v).ok())
    {
        headers.insert(HeaderName::from_static("onion-location"), onion);
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
