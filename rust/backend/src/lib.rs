//! Rust side of the Pustaka backend. It serves the routes ported so far, reading the same `app.db` and
//! `metadata.db` as the Flask app (which stays the owner and only writer of both); Caddy sends everything
//! else to Flask. See `rust/backend/README.md`.

pub mod export;
pub mod filename;
pub mod files;
pub mod health;
pub mod library;
pub mod mime;
pub mod security;
pub mod settings;
pub mod signing;

use axum::Router;
use settings::Settings;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, Semaphore};

/// How long a read of `app.db` settings is reused. Short, so an admin change in the Flask UI applies quickly.
const SETTINGS_TTL: Duration = Duration::from_secs(1);

pub struct AppState {
    pub app_db: PathBuf,
    pub started: Instant,
    pub onion_location: Option<String>,
    /// `SECRET_KEY` overrides the key stored in `app.db`, exactly as in `cps/__init__.py`.
    pub secret_key_override: Option<Vec<u8>>,
    /// Bounds concurrent `calibredb export` processes.
    pub exports: Semaphore,
    cached: Mutex<Option<(Instant, Arc<Settings>)>>,
}

impl AppState {
    pub fn new(app_db: PathBuf, max_exports: usize) -> Self {
        let env = |name: &str| {
            std::env::var(name)
                .ok()
                .map(|v| v.trim().to_owned())
                .filter(|v| !v.is_empty())
        };
        AppState {
            app_db,
            started: Instant::now(),
            onion_location: env("ONION_LOCATION"),
            secret_key_override: std::env::var("SECRET_KEY")
                .ok()
                .filter(|v| !v.is_empty())
                .map(String::into_bytes),
            exports: Semaphore::new(max_exports.max(1)),
            cached: Mutex::new(None),
        }
    }

    pub async fn settings(&self) -> Result<Arc<Settings>, String> {
        let mut cached = self.cached.lock().await;
        if let Some((at, settings)) = cached.as_ref()
            && at.elapsed() < SETTINGS_TTL
        {
            return Ok(settings.clone());
        }
        let path = self.app_db.clone();
        let fresh = tokio::task::spawn_blocking(move || settings::load(&path))
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())?;
        let fresh = Arc::new(fresh);
        *cached = Some((Instant::now(), fresh.clone()));
        Ok(fresh)
    }

    /// The HMAC key of the signed URLs.
    pub fn secret(&self, settings: &Settings) -> Vec<u8> {
        self.secret_key_override
            .clone()
            .unwrap_or_else(|| settings.session_key.clone())
    }
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .merge(health::routes())
        .merge(files::routes())
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            security::layer,
        ))
        .with_state(state)
}
