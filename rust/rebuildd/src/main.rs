use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use pustaka_rebuildd::{Config, Reason, Status, dirty_frontend, fingerprint};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, BufReader};

#[tokio::main]
async fn main() {
    // `RUST_LOG` when set, otherwise `info`: a service that silently drops its own warnings is not debuggable.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();
    let args: Vec<String> = std::env::args().skip(1).collect();
    let once = args.iter().any(|arg| arg == "--once");
    let dry_run = args.iter().any(|arg| arg == "--dry-run");
    let config = match Config::from_env() {
        Ok(config) => config,
        Err(error) => {
            eprintln!("configuration: {error}");
            std::process::exit(2);
        }
    };
    if let Err(error) = check_paths(&config) {
        eprintln!("{error}");
        std::process::exit(2);
    }
    let status = Status::new(config.clone());
    if once {
        let exit = run_build(&status, Reason::Requested, dry_run).await;
        // `--once` is for a person or a timer: print the outcome even though the daemon path keeps it in /status.
        let last = status.last.lock().await.clone();
        if let Ok(text) = serde_json::to_string_pretty(&last) {
            println!("{text}");
        }
        std::process::exit(exit.unwrap_or(1));
    }

    let app = axum::Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/status", get(status_handler))
        .route("/rebuild", post(request_handler))
        .with_state(status.clone());

    let listener = match tokio::net::TcpListener::bind(&config.bind).await {
        Ok(listener) => listener,
        Err(error) => {
            eprintln!("cannot listen on {}: {error}", config.bind);
            std::process::exit(1);
        }
    };
    tracing::info!(
        "rebuildd listening on {} (watching {:?}, debounce {}s, min interval {}s, allow_dirty={})",
        config.bind,
        config.repo,
        config.debounce.as_secs(),
        config.min_interval.as_secs(),
        config.allow_dirty
    );
    let server = tokio::spawn(async move {
        if let Err(error) = axum::serve(listener, app).await {
            tracing::error!("server error: {error}");
        }
    });
    watch_loop(status.clone()).await;
    server.abort();
}

fn check_paths(config: &Config) -> Result<(), String> {
    if !config.repo.is_dir() {
        return Err(format!(
            "PUSTAKA_REPO {} is not a directory",
            config.repo.display()
        ));
    }
    if !config.script.is_file() {
        return Err(format!(
            "REBUILD_SCRIPT {} does not exist",
            config.script.display()
        ));
    }
    Ok(())
}

/// Poll the catalog's fingerprint and run the build when the schedule says so.
async fn watch_loop(status: Arc<Status>) {
    let repo: PathBuf = status.config.repo.clone();
    let poll = status.config.poll;
    let mut observed = fingerprint(&repo);
    loop {
        tokio::time::sleep(poll).await;
        let current = fingerprint(&repo);
        if current != observed {
            tracing::debug!("catalog changed");
            observed = current;
            status.schedule.lock().await.observe_change(Instant::now());
        }
        let due = {
            let mut schedule = status.schedule.lock().await;
            match schedule.due(Instant::now()) {
                Some(reason) => {
                    schedule.started();
                    Some(reason)
                }
                None => None,
            }
        };
        if let Some(reason) = due {
            run_build(&status, reason, false).await;
            status.schedule.lock().await.finished(Instant::now());
        }
    }
}

/// Run `build-frontend.sh` once. Returns the child's exit code (`None` when it never started).
async fn run_build(status: &Arc<Status>, reason: Reason, dry_run: bool) -> Option<i32> {
    {
        let mut running = status.running.lock().await;
        if *running {
            tracing::info!("a build is already running; not starting another");
            return None;
        }
        *running = true;
    }
    let started = chrono_stamp();
    let began = Instant::now();
    let result = run_build_inner(status, reason, dry_run).await;
    let mut running = status.running.lock().await;
    *running = false;
    drop(running);
    let run = pustaka_rebuildd::Run {
        started,
        seconds: began.elapsed().as_secs(),
        exit: result.exit,
        reason: reason.as_str().to_owned(),
        skipped: result.skipped,
    };
    tracing::info!(
        "build finished: exit={:?} seconds={} reason={} skipped={:?}",
        run.exit,
        run.seconds,
        run.reason,
        run.skipped
    );
    *status.last.lock().await = Some(run);
    result.exit
}

struct Outcome {
    exit: Option<i32>,
    skipped: Option<String>,
}

async fn run_build_inner(status: &Arc<Status>, reason: Reason, dry_run: bool) -> Outcome {
    let config = &status.config;
    if !config.allow_dirty {
        match dirty_frontend(&config.repo).await {
            Ok(dirty) if !dirty.is_empty() => {
                let message = format!(
                    "frontend/ has {} uncommitted change(s); commit them or set REBUILD_ALLOW_DIRTY=1",
                    dirty.len()
                );
                tracing::warn!("{message}");
                return Outcome {
                    exit: None,
                    skipped: Some(message),
                };
            }
            Ok(_) => {}
            Err(error) => tracing::warn!("cannot check the working tree: {error}"),
        }
    }
    if dry_run {
        status
            .record_output(format!(
                "would run {:?} ({})",
                config.script,
                reason.as_str()
            ))
            .await;
        return Outcome {
            exit: Some(0),
            skipped: Some("dry run".to_owned()),
        };
    }
    let mut child = match tokio::process::Command::new("bash")
        .arg(&config.script)
        .current_dir(&config.repo)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => {
            tracing::error!("cannot start {:?}: {error}", config.script);
            return Outcome {
                exit: None,
                skipped: None,
            };
        }
    };
    let mut readers = Vec::new();
    for stream in [
        child
            .stdout
            .take()
            .map(|out| Box::new(out) as Box<dyn tokio::io::AsyncRead + Unpin + Send>),
        child
            .stderr
            .take()
            .map(|err| Box::new(err) as Box<dyn tokio::io::AsyncRead + Unpin + Send>),
    ]
    .into_iter()
    .flatten()
    {
        let status = status.clone();
        readers.push(tokio::spawn(async move {
            let mut lines = BufReader::new(stream).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                status.record_output(line).await;
            }
        }));
    }
    let waited = tokio::time::timeout(config.timeout, child.wait()).await;
    for reader in readers {
        let _ = reader.await;
    }
    match waited {
        Ok(Ok(exit)) => Outcome {
            exit: exit.code(),
            skipped: None,
        },
        Ok(Err(error)) => {
            tracing::error!("waiting for the build failed: {error}");
            Outcome {
                exit: None,
                skipped: None,
            }
        }
        Err(_) => {
            tracing::error!(
                "the build exceeded {}s; killing it",
                config.timeout.as_secs()
            );
            let _ = child.kill().await;
            Outcome {
                exit: None,
                skipped: Some(format!("timed out after {}s", config.timeout.as_secs())),
            }
        }
    }
}

fn chrono_stamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or(Duration::ZERO);
    format!("{}.{:03}Z", now.as_secs(), now.subsec_millis())
}

async fn status_handler(State(status): State<Arc<Status>>) -> Response {
    (StatusCode::OK, axum::Json(status.status_json().await)).into_response()
}

/// `POST /rebuild`: queue one refresh. The token, when configured, is the same `WEBHOOK_TOKEN` the old listener used.
async fn request_handler(State(status): State<Arc<Status>>, headers: HeaderMap) -> Response {
    if let Some(expected) = status.config.token.as_deref() {
        let given = headers
            .get("x-frontend-token")
            .and_then(|value| value.to_str().ok())
            .unwrap_or("");
        if !constant_time_eq(given.as_bytes(), expected.as_bytes()) {
            tracing::warn!("rebuild request refused: bad or missing X-Frontend-Token");
            return (
                StatusCode::FORBIDDEN,
                axum::Json(serde_json::json!({"ok": false, "error": "forbidden"})),
            )
                .into_response();
        }
    }
    status.schedule.lock().await.request(Instant::now());
    let wait = status.schedule.lock().await.wait_seconds(Instant::now());
    let mut response = (
        StatusCode::ACCEPTED,
        axum::Json(serde_json::json!({"ok": true, "queued": true, "next_run_in_seconds": wait})),
    )
        .into_response();
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        "no-store".parse().expect("static header"),
    );
    response
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    let mut difference = left.len() ^ right.len();
    for (a, b) in left.iter().zip(right.iter()) {
        difference |= usize::from(a ^ b);
    }
    difference == 0
}
