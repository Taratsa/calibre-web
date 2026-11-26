//! Health probes, same paths and payload keys as `cps/health.py`. `process` names the Rust runtime instead of Python.

use crate::{AppState, library, settings};
use axum::Router;
use axum::extract::State;
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use serde_json::{Value, json};
use std::sync::Arc;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(aggregate))
        .route("/healthz", get(aggregate))
        .route("/readyz", get(aggregate))
        .route("/healthz/live", get(live))
        .route("/healthz/ready", get(ready))
}

struct Check {
    ok: bool,
    error: Option<String>,
}

impl Check {
    fn from(result: Result<(), String>, label: &str) -> Self {
        match result {
            Ok(()) => Check {
                ok: true,
                error: None,
            },
            Err(error) => Check {
                ok: false,
                error: Some(format!("{label}: {error}").chars().take(200).collect()),
            },
        }
    }
}

async fn checks(state: &AppState) -> (Vec<(&'static str, Check)>, String) {
    let loaded = state.settings().await;
    let config = match &loaded {
        Ok(s) if !s.calibre_dir.as_os_str().is_empty() => Check {
            ok: true,
            error: None,
        },
        Ok(_) => Check {
            ok: false,
            error: Some("config_not_configured".into()),
        },
        Err(error) => Check {
            ok: false,
            error: Some(format!("config_unavailable: {error}")),
        },
    };
    let (calibre, title) = match &loaded {
        Ok(s) => {
            let path = s.metadata_db();
            let result = tokio::task::spawn_blocking(move || library::ping(&path))
                .await
                .unwrap_or_else(|e| Err(e.to_string()));
            (Check::from(result, "calibre_db_error"), s.title.clone())
        }
        Err(_) => (
            Check {
                ok: false,
                error: Some("calibre_db_not_configured".into()),
            },
            String::new(),
        ),
    };
    let app_db = state.app_db.clone();
    let result = tokio::task::spawn_blocking(move || {
        settings::open_read_only(&app_db)
            .and_then(|c| c.query_row("SELECT 1", [], |_| Ok(())))
            .map_err(|e| e.to_string())
    })
    .await
    .unwrap_or_else(|e| Err(e.to_string()));
    (
        vec![
            ("config", config),
            ("calibre_db", calibre),
            ("app_db", Check::from(result, "app_db_error")),
        ],
        title,
    )
}

fn no_store(mut response: Response) -> Response {
    let headers = response.headers_mut();
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store, no-cache, must-revalidate"),
    );
    headers.insert(header::PRAGMA, HeaderValue::from_static("no-cache"));
    response
}

fn payload(
    state: &AppState,
    checks: &[(&'static str, Check)],
    title: String,
) -> (StatusCode, Value) {
    let up = checks.iter().all(|(_, c)| c.ok);
    let components: serde_json::Map<String, Value> = checks
        .iter()
        .map(|(name, c)| {
            (
                name.to_string(),
                json!({"status": if c.ok { "up" } else { "down" }, "error": c.error}),
            )
        })
        .collect();
    let body = json!({
        "status": if up { "up" } else { "down" },
        "uptime_seconds": (state.started.elapsed().as_secs_f64() * 1000.0).round() / 1000.0,
        "version": title,
        "checks": components,
        "process": {
            "runtime": "rust",
            "platform": format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
            "process": std::process::id(),
        },
    });
    (
        if up {
            StatusCode::OK
        } else {
            StatusCode::SERVICE_UNAVAILABLE
        },
        body,
    )
}

async fn aggregate(State(state): State<Arc<AppState>>) -> Response {
    let (checks, title) = checks(&state).await;
    let (status, body) = payload(&state, &checks, title);
    no_store((status, axum::Json(body)).into_response())
}

async fn live() -> Response {
    (
        [
            (header::CONTENT_TYPE, "text/plain"),
            (header::CACHE_CONTROL, "no-store"),
        ],
        "ok",
    )
        .into_response()
}

async fn ready(State(state): State<Arc<AppState>>) -> Response {
    let (checks, title) = checks(&state).await;
    if checks.iter().all(|(_, c)| c.ok) {
        return (
            [
                (header::CONTENT_TYPE, "text/plain"),
                (header::CACHE_CONTROL, "no-store"),
            ],
            "ready",
        )
            .into_response();
    }
    let (_, body) = payload(&state, &checks, title);
    no_store((StatusCode::SERVICE_UNAVAILABLE, axum::Json(body)).into_response())
}
