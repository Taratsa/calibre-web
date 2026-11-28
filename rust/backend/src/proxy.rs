//! Forward routes not ported yet to Flask. The loop guard rejects targets that point back to this server.

use axum::http::request::Parts;

use crate::AppState;
use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderName, Request, StatusCode, header};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
use std::sync::Arc;

const HOP_BY_HOP: [&str; 8] = [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
];

pub async fn fallback(State(state): State<Arc<AppState>>, request: Request<Body>) -> Response {
    let (parts, body) = request.into_parts();
    proxy_parts(state, parts, body).await
}

pub async fn fallback_with_path(
    state: Arc<AppState>,
    request: Request<Body>,
    path: &str,
) -> Response {
    let (mut parts, body) = request.into_parts();
    parts.uri = match path.parse() {
        Ok(uri) => uri,
        Err(_) => return (StatusCode::BAD_GATEWAY, "Invalid fallback path").into_response(),
    };
    proxy_parts(state, parts, body).await
}

pub async fn fallback_reconstructed(
    state: Arc<AppState>,
    path: &str,
    method: axum::http::Method,
    headers: axum::http::HeaderMap,
) -> Response {
    let request = match Request::builder()
        .method(method)
        .uri(path)
        .body(Body::empty())
    {
        Ok(request) => request,
        Err(_) => return (StatusCode::BAD_GATEWAY, "Invalid fallback request").into_response(),
    };
    let (mut parts, body) = request.into_parts();
    parts.headers = headers;
    proxy_parts(state, parts, body).await
}

/// A fallback that carries a body (the login form's `forgot` case, proxied to Flask as it always was).
pub async fn fallback_with_body(
    state: Arc<AppState>,
    path: &str,
    method: axum::http::Method,
    headers: axum::http::HeaderMap,
    body: Vec<u8>,
) -> Response {
    let request = match Request::builder()
        .method(method)
        .uri(path)
        .body(Body::from(body))
    {
        Ok(request) => request,
        Err(_) => return (StatusCode::BAD_GATEWAY, "Invalid fallback request").into_response(),
    };
    let (mut parts, body) = request.into_parts();
    parts.headers = headers;
    proxy_parts(state, parts, body).await
}

async fn proxy_parts(state: Arc<AppState>, parts: Parts, body: Body) -> Response {
    let target = match reqwest::Url::parse(&state.proxy_url) {
        Ok(target) => target,
        Err(_) => return (StatusCode::BAD_GATEWAY, "Invalid FLASK_BACKEND_URL").into_response(),
    };
    if matches!(target.host_str(), Some("127.0.0.1" | "localhost" | "::1"))
        && target.port_or_known_default() == Some(8084)
    {
        return (
            StatusCode::LOOP_DETECTED,
            "Flask fallback points back to Rust",
        )
            .into_response();
    }
    let path_and_query = parts.uri.path_and_query().map_or("/", |v| v.as_str());
    let base = target.as_str().trim_end_matches('/').to_owned();
    let original_host = parts.headers.get(header::HOST).cloned();
    let mut builder = state
        .proxy_client
        .request(parts.method, format!("{base}{path_and_query}"));
    if let Some(host) = original_host {
        builder = builder.header(header::HOST, host);
    }
    for (name, value) in &parts.headers {
        if is_hop_by_hop(name) || name == header::HOST {
            continue;
        }
        builder = builder.header(name, value);
    }
    let body_stream = body
        .into_data_stream()
        .map(|result| result.map_err(|error| std::io::Error::other(error.to_string())));
    let upstream = match builder
        .body(reqwest::Body::wrap_stream(body_stream))
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            tracing::error!("Flask proxy request failed: {error}");
            return (StatusCode::BAD_GATEWAY, "Flask backend unavailable").into_response();
        }
    };
    let status =
        StatusCode::from_u16(upstream.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    let upstream_headers = upstream.headers().clone();
    let mut response =
        Response::new(Body::from_stream(upstream.bytes_stream().map(|result| {
            result.map_err(|error| std::io::Error::other(error.to_string()))
        })));
    *response.status_mut() = status;
    for (name, value) in &upstream_headers {
        if is_hop_by_hop(name) {
            continue;
        }
        response.headers_mut().append(name.clone(), value.clone());
    }
    response
}

fn is_hop_by_hop(name: &HeaderName) -> bool {
    HOP_BY_HOP.iter().any(|value| name == *value)
}
