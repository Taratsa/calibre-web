//! `pustaka-rebuildd`: keeps the Astro frontend's catalog in step with Calibre's database.
//!
//! The frontend bakes `src/data` into its image at build time, so a new or edited book reaches the site only after a
//! reseed, an image rebuild and a container recreate — measured at 28 s + 40 s + ~1 s. Doing that by hand after every
//! change is the gap this daemon closes. It watches the databases (and the clippings directory) and runs the existing
//! `build-frontend.sh` once the catalog has been quiet for a while, at most once per minimum interval, and only when
//! the catalog fingerprint actually moved. It also accepts `POST /rebuild` for a manual kick, with the same token the
//! old Python listener expected.
//!
//! It is deliberately the ONLY trigger: Flask's `trigger_rebuild_async` still exists but does nothing while
//! `config_frontend_rebuild_token` is empty, and this daemon watches the database, so edits made in Calibre desktop
//! are covered too.
//!
//! Rules that keep it from turning into a rebuild machine: changes are debounced (default 90 s of quiet), a burst can
//! defer a rebuild at most `max_wait` (default 600 s), two runs never overlap, and the tree must be clean under
//! `frontend/` unless `REBUILD_ALLOW_DIRTY=1`, so an in-progress frontend change is never shipped by a book upload.
//!
//! Configuration (environment):
//!   PUSTAKA_REPO            repository root (default /home/devuser/workspaces/calibre-web)
//!   REBUILD_BIND            listen address (default 127.0.0.1:9999)
//!   REBUILD_TOKEN           optional; when set, POST /rebuild requires `X-Frontend-Token`
//!   REBUILD_DEBOUNCE_SECS   quiet time before a rebuild (default 90)
//!   REBUILD_MIN_INTERVAL_SECS  minimum spacing between two runs (default 300)
//!   REBUILD_MAX_WAIT_SECS   longest a continuous change stream may defer a rebuild (default 600)
//!   REBUILD_POLL_SECS       database poll interval (default 5)
//!   REBUILD_ALLOW_DIRTY     `1` ships the working tree (default 0: skip and report why)
//!   REBUILD_SCRIPT          script to run (default <repo>/build-frontend.sh)
//!   REBUILD_TIMEOUT_SECS    per-run timeout (default 1800)
//!
//! Usage: `pustaka-rebuildd [--once] [--dry-run]` — `--once` runs one rebuild and exits (respecting `--dry-run`).

use serde::Serialize;
use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};
use tokio::sync::Mutex;

pub const LOG_TAIL_LINES: usize = 40;

#[derive(Debug, Clone)]
pub struct Config {
    pub repo: PathBuf,
    pub bind: String,
    pub token: Option<String>,
    pub debounce: Duration,
    pub min_interval: Duration,
    pub max_wait: Duration,
    pub poll: Duration,
    pub allow_dirty: bool,
    pub script: PathBuf,
    pub timeout: Duration,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let env = |name: &str| {
            std::env::var(name)
                .ok()
                .filter(|value| !value.trim().is_empty())
        };
        let number = |name: &str, default: u64| -> Result<u64, String> {
            match env(name) {
                None => Ok(default),
                Some(text) => text
                    .trim()
                    .parse::<u64>()
                    .map_err(|_| format!("{name} must be a number of seconds, got {text:?}")),
            }
        };
        let repo = PathBuf::from(
            env("PUSTAKA_REPO")
                .unwrap_or_else(|| "/home/devuser/workspaces/calibre-web".to_owned()),
        );
        let script = env("REBUILD_SCRIPT")
            .map(PathBuf::from)
            .unwrap_or_else(|| repo.join("build-frontend.sh"));
        Ok(Self {
            bind: env("REBUILD_BIND").unwrap_or_else(|| "127.0.0.1:9999".to_owned()),
            token: env("REBUILD_TOKEN"),
            debounce: Duration::from_secs(number("REBUILD_DEBOUNCE_SECS", 90)?),
            min_interval: Duration::from_secs(number("REBUILD_MIN_INTERVAL_SECS", 300)?),
            max_wait: Duration::from_secs(number("REBUILD_MAX_WAIT_SECS", 600)?),
            poll: Duration::from_secs(number("REBUILD_POLL_SECS", 5)?.max(1)),
            allow_dirty: env("REBUILD_ALLOW_DIRTY").as_deref() == Some("1"),
            timeout: Duration::from_secs(number("REBUILD_TIMEOUT_SECS", 1800)?),
            repo,
            script,
        })
    }
}

/// What a watched path looked like at one poll: mtime and size. `metadata.db-wal` changes on every committed write,
/// so the main file's mtime alone (which a WAL checkpoint may hold back) is not enough.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Stamp {
    pub modified: Option<SystemTime>,
    pub size: u64,
}

pub fn stamp(path: &Path) -> Stamp {
    match std::fs::metadata(path) {
        Ok(meta) => Stamp {
            modified: meta.modified().ok(),
            size: meta.len(),
        },
        Err(_) => Stamp {
            modified: None,
            size: 0,
        },
    }
}

/// The newest mtime below `dir` (one level deep is enough for `data/clippings/*.md`). The directory's own entry is
/// ignored on purpose: on a filesystem with coarse timestamps it can compare equal to a fresh file and, being the
/// larger stamp by size, would hide that file's change.
pub fn newest_below(dir: &Path) -> Stamp {
    let mut newest = Stamp {
        modified: None,
        size: 0,
    };
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let candidate = stamp(&entry.path());
            if candidate.modified > newest.modified {
                newest = candidate;
            }
        }
    }
    newest
}

/// The catalog signal: Calibre's database (with its WAL files) and the clippings. `data/app.db` is deliberately
/// absent — the anonymous download counter and every login write to it, so watching it would trigger a rebuild after
/// any visitor's download. A change to app.db alone (a site setting) can be refreshed with `POST /rebuild`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Fingerprint(pub Vec<(String, Stamp)>);

pub fn fingerprint(repo: &Path) -> Fingerprint {
    let mut parts = Vec::new();
    for name in [
        "library/metadata.db",
        "library/metadata.db-wal",
        "library/metadata.db-shm",
    ] {
        parts.push((name.to_owned(), stamp(&repo.join(name))));
    }
    parts.push((
        "data/clippings".to_owned(),
        newest_below(&repo.join("data/clippings")),
    ));
    Fingerprint(parts)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Reason {
    Changed,
    Requested,
}

impl Reason {
    pub fn as_str(self) -> &'static str {
        match self {
            Reason::Changed => "change",
            Reason::Requested => "request",
        }
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct Run {
    pub started: String,
    pub seconds: u64,
    pub exit: Option<i32>,
    pub reason: String,
    pub skipped: Option<String>,
}

/// When a rebuild is due. Pure and clock-driven so the debounce rules are testable without waiting.
#[derive(Debug)]
pub struct Schedule {
    debounce: Duration,
    max_wait: Duration,
    min_interval: Duration,
    /// When the stream of changes last moved.
    last_change: Option<Instant>,
    /// When that stream began (the cap for `max_wait`).
    first_change: Option<Instant>,
    /// A manual request (not debounced further than `debounce`).
    requested: bool,
    last_run_end: Option<Instant>,
}

impl Schedule {
    pub fn new(debounce: Duration, max_wait: Duration, min_interval: Duration) -> Self {
        Self {
            debounce,
            max_wait,
            min_interval,
            last_change: None,
            first_change: None,
            requested: false,
            last_run_end: None,
        }
    }

    pub fn observe_change(&mut self, now: Instant) {
        self.last_change = Some(now);
        self.first_change.get_or_insert(now);
    }

    pub fn request(&mut self, now: Instant) {
        self.requested = true;
        self.observe_change(now);
    }

    /// The reason a rebuild is due now, or `None`.
    pub fn due(&self, now: Instant) -> Option<Reason> {
        let last_change = self.last_change?;
        let first_change = self.first_change.unwrap_or(last_change);
        let quiet = now.saturating_duration_since(last_change) >= self.debounce;
        let waited_long_enough = now.saturating_duration_since(first_change) >= self.max_wait;
        if !(quiet || waited_long_enough) {
            return None;
        }
        if let Some(end) = self.last_run_end
            && now.saturating_duration_since(end) < self.min_interval
        {
            return None;
        }
        Some(if self.requested {
            Reason::Requested
        } else {
            Reason::Changed
        })
    }

    pub fn started(&mut self) {
        self.last_change = None;
        self.first_change = None;
        self.requested = false;
    }

    pub fn finished(&mut self, now: Instant) {
        self.last_run_end = Some(now);
    }

    /// Seconds until `due` could become true, for `/status`.
    pub fn wait_seconds(&self, now: Instant) -> Option<u64> {
        let last_change = self.last_change?;
        let ready = last_change + self.debounce;
        let gate = match self.last_run_end {
            Some(end) => (end + self.min_interval).max(ready),
            None => ready,
        };
        Some(gate.saturating_duration_since(now).as_secs())
    }
}

pub struct Status {
    pub config: Config,
    pub schedule: Mutex<Schedule>,
    pub last: Mutex<Option<Run>>,
    pub last_fingerprint: Mutex<Option<Fingerprint>>,
    pub running: Mutex<bool>,
    pub tail: Mutex<VecDeque<String>>,
}

impl Status {
    pub fn new(config: Config) -> Arc<Self> {
        let schedule = Schedule::new(config.debounce, config.max_wait, config.min_interval);
        Arc::new(Self {
            config,
            schedule: Mutex::new(schedule),
            last: Mutex::new(None),
            last_fingerprint: Mutex::new(None),
            running: Mutex::new(false),
            tail: Mutex::new(VecDeque::new()),
        })
    }

    pub async fn record_output(&self, line: String) {
        tracing::info!("build: {line}");
        let mut tail = self.tail.lock().await;
        if tail.len() == LOG_TAIL_LINES {
            tail.pop_front();
        }
        tail.push_back(line);
    }

    pub async fn status_json(&self) -> serde_json::Value {
        let schedule = self.schedule.lock().await;
        let last = self.last.lock().await.clone();
        let running = *self.running.lock().await;
        let tail: Vec<String> = self.tail.lock().await.iter().cloned().collect();
        serde_json::json!({
            "running": running,
            "next_run_in_seconds": schedule.wait_seconds(Instant::now()),
            "last": last,
            "tail": tail,
            "repo": self.config.repo,
            "script": self.config.script,
            "debounce_seconds": self.config.debounce.as_secs(),
            "min_interval_seconds": self.config.min_interval.as_secs(),
            "allow_dirty": self.config.allow_dirty,
        })
    }
}

/// The frontend paths an automated rebuild would ship as-is: its CODE. `frontend/src/data` is deliberately absent —
/// the seed writes it on every run, so counting it would block every rebuild after the first one.
const CODE_PATHS: [&str; 9] = [
    "frontend/src/pages",
    "frontend/src/components",
    "frontend/src/layouts",
    "frontend/src/styles",
    "frontend/src/utils",
    "frontend/src/scripts",
    "frontend/src/middleware.ts",
    "frontend/astro.config.mjs",
    "frontend/Dockerfile",
];

/// Uncommitted frontend CODE: an automated rebuild would ship that work, so the daemon skips instead.
pub async fn dirty_frontend(repo: &Path) -> Result<Vec<String>, String> {
    let output = tokio::process::Command::new("git")
        .args(["status", "--porcelain", "--"])
        .args(CODE_PATHS)
        .current_dir(repo)
        .output()
        .await
        .map_err(|error| format!("cannot run git: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "git status failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::to_owned)
        .collect())
}

#[cfg(test)]
mod tests {
    use super::{Schedule, newest_below, stamp};
    use std::time::{Duration, Instant};

    fn schedule() -> Schedule {
        Schedule::new(
            Duration::from_secs(90),
            Duration::from_secs(600),
            Duration::from_secs(300),
        )
    }

    #[test]
    fn a_change_waits_for_quiet_and_each_new_change_defers_it() {
        let mut s = schedule();
        let t0 = Instant::now();
        s.observe_change(t0);
        assert_eq!(
            s.due(t0 + Duration::from_secs(60)),
            None,
            "still inside the debounce"
        );
        s.observe_change(t0 + Duration::from_secs(80));
        assert_eq!(
            s.due(t0 + Duration::from_secs(120)),
            None,
            "the second change restarted the quiet window"
        );
        assert_eq!(
            s.due(t0 + Duration::from_secs(170)),
            Some(super::Reason::Changed)
        );
    }

    #[test]
    fn a_continuous_stream_is_capped_by_max_wait() {
        let mut s = schedule();
        let t0 = Instant::now();
        for second in 0..700 {
            s.observe_change(t0 + Duration::from_secs(second));
        }
        assert_eq!(
            s.due(t0 + Duration::from_secs(620)),
            Some(super::Reason::Changed),
            "10 minutes of constant change must still refresh"
        );
    }

    #[test]
    fn two_runs_are_spaced_by_the_minimum_interval() {
        let mut s = schedule();
        let t0 = Instant::now();
        s.observe_change(t0);
        assert_eq!(
            s.due(t0 + Duration::from_secs(95)),
            Some(super::Reason::Changed)
        );
        s.started();
        s.finished(t0 + Duration::from_secs(160));
        s.observe_change(t0 + Duration::from_secs(170));
        assert_eq!(
            s.due(t0 + Duration::from_secs(300)),
            None,
            "the quiet window passed but the interval has not"
        );
        assert_eq!(
            s.due(t0 + Duration::from_secs(465)),
            Some(super::Reason::Changed)
        );
    }

    #[test]
    fn a_manual_request_is_debounced_but_labelled() {
        let mut s = schedule();
        let t0 = Instant::now();
        s.request(t0);
        assert_eq!(s.due(t0 + Duration::from_secs(10)), None);
        assert_eq!(
            s.due(t0 + Duration::from_secs(95)),
            Some(super::Reason::Requested)
        );
    }

    #[test]
    fn the_wait_is_reported_for_status() {
        let mut s = schedule();
        let t0 = Instant::now();
        s.observe_change(t0);
        assert_eq!(s.wait_seconds(t0), Some(90));
        assert_eq!(s.wait_seconds(t0 + Duration::from_secs(60)), Some(30));
    }

    #[test]
    fn stamps_follow_mtime_and_size() {
        let dir = tempfile::TempDir::new().unwrap();
        let file = dir.path().join("x.md");
        let missing = stamp(&dir.path().join("nope"));
        assert_eq!(missing.size, 0);
        std::fs::write(&file, b"one").unwrap();
        let first = stamp(&file);
        assert_eq!(first.size, 3);
        assert!(first.modified.is_some());
        std::fs::write(&file, b"longer").unwrap();
        std::thread::sleep(std::time::Duration::from_millis(10));
        let second = stamp(&file);
        assert_ne!(first, second);
        let newest = newest_below(dir.path());
        assert_eq!(newest.size, 6);
    }
}
