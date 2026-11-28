use std::path::PathBuf;
use std::sync::Arc;
use taratsa_backend::{AppState, router};

#[tokio::main]
async fn main() {
    // `RUST_LOG` when set, otherwise `info`: the auth events (logins, refused codes, guard refusals) are info/warn,
    // and an unset variable used to default the filter to `error`, which dropped them all.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();
    let app_db =
        PathBuf::from(std::env::var("APP_DB_PATH").unwrap_or_else(|_| "/config/app.db".into()));
    let listen = std::env::var("LISTEN").unwrap_or_else(|_| "127.0.0.1:8084".into());
    // `calibredb` takes an exclusive lock on the library, so concurrent exports just fail on each other: one at a time.
    let max_exports = std::env::var("MAX_EXPORTS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1);

    // The second-factor columns live in `app.db`'s `user` table and are Rust's to create (Flask's ORM ignores them).
    taratsa_backend::authdb::ensure_schema(&app_db);
    let state = Arc::new(AppState::new(app_db, max_exports));
    let listener = match tokio::net::TcpListener::bind(&listen).await {
        Ok(listener) => listener,
        Err(error) => {
            eprintln!("cannot listen on {listen}: {error}");
            std::process::exit(1);
        }
    };
    tracing::info!("listening on {listen}");
    let shutdown = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    if let Err(error) = axum::serve(listener, router(state))
        .with_graceful_shutdown(shutdown)
        .await
    {
        eprintln!("server error: {error}");
        std::process::exit(1);
    }
}
