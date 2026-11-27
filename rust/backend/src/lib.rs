//! Rust side of the Pustaka backend. It serves the routes ported so far, reading the same `app.db` and
//! `metadata.db` as the Flask app (which stays the owner and only writer of both); Caddy sends everything
//! else to Flask. See `rust/backend/README.md`.

pub mod accept;
pub mod cover;
pub mod download;
pub mod export;
pub mod filename;
pub mod files;
pub mod health;
pub mod library;
pub mod mime;
pub mod proxy;
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
    pub secret_key_override: Option<Vec<u8>>,
    pub exports: Semaphore,
    pub proxy_url: String,
    pub proxy_client: reqwest::Client,
    pub cache_directory: PathBuf,
    pub static_directory: PathBuf,
    /// Umami endpoint of the server-side `file-download` event; `None` disables it (`UMAMI_URL=off`).
    pub umami_url: Option<String>,
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
            proxy_url: env("FLASK_BACKEND_URL").unwrap_or_else(|| "http://127.0.0.1:8083".into()),
            proxy_client: reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(2))
                // Not `.timeout()`: that bounds the WHOLE response, so a Flask answer that is merely slow (its single
                // gevent loop answers covers in 13-24 s at p95-p99 under load) became a 502 here, where Caddy talking
                // to Flask directly would have waited. A read timeout only fires when Flask stops sending.
                .read_timeout(Duration::from_secs(120))
                .build()
                .expect("valid proxy client configuration"),
            cache_directory: env("CACHE_DIRECTORY")
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from("/config/cache")),
            static_directory: env("STATIC_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from("/app/calibre-web/cps/static")),
            umami_url: match env("UMAMI_URL").as_deref() {
                Some("off") => None,
                Some(url) => Some(url.to_owned()),
                None => Some("https://umami.kenadera.org/api/send".to_owned()),
            },
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
        .merge(cover::routes())
        .merge(download::routes())
        .merge(files::routes())
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            security::layer,
        ))
        .with_state(state)
}
