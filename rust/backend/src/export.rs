//! `calibredb export` with embedded metadata, as `do_calibre_export` in `cps/embed_helper.py`.
//!
//! With `config_embed_metadata` and a Calibre binaries directory set, every download is a fresh export of the
//! book with its current metadata written into the file, so the bytes differ from the file on disk.

use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::process::Command;
use uuid::Uuid;

/// A single export is bounded so a stuck `calibredb` cannot hold a worker slot forever.
const EXPORT_TIMEOUT: Duration = Duration::from_secs(300);

pub struct Staged {
    pub path: PathBuf,
}

impl Staged {
    /// Unlinking is safe while a response still streams the file: the open handle keeps the inode alive.
    pub fn remove(self) {
        if let Err(error) = std::fs::remove_file(&self.path) {
            tracing::warn!(
                "failed to remove staged download {}: {error}",
                self.path.display()
            );
        }
    }
}

/// `<tmp>/calibre_web`, the directory the Flask app stages exports in.
pub fn staging_dir() -> std::io::Result<PathBuf> {
    let dir = std::env::temp_dir().join("calibre_web");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub struct Request<'a> {
    pub calibredb: &'a Path,
    pub library: &'a Path,
    /// Set when the library is split: `metadata.db` lives elsewhere than the book folders.
    pub metadata_db: Option<&'a Path>,
    pub book_id: i64,
    pub book_format: &'a str,
}

/// What an export attempt came to.
pub enum Outcome {
    /// The file with the book's metadata written in.
    Staged(Staged),
    /// `calibredb` could not take the library lock (another calibre process, e.g. Flask's own export, holds it) even
    /// after retries. The stored file is NOT the same bytes as an export, so the caller must not serve it as if it were.
    Busy,
    /// The export failed for another reason; Flask serves the stored file then too.
    Failed,
}

/// `calibredb` writes this when another calibre program holds the library.
const LOCKED: &str = "Another calibre program";
/// Tries and pause between them when the library is locked (about 6 s in total).
const LOCK_ATTEMPTS: u32 = 12;
const LOCK_RETRY: Duration = Duration::from_millis(500);

pub async fn export(request: Request<'_>) -> Outcome {
    for attempt in 1..=LOCK_ATTEMPTS {
        match export_once(&request).await {
            Outcome::Busy if attempt < LOCK_ATTEMPTS => tokio::time::sleep(LOCK_RETRY).await,
            other => return other,
        }
    }
    Outcome::Busy
}

async fn export_once(request: &Request<'_>) -> Outcome {
    let Ok(dir) =
        staging_dir().inspect_err(|e| tracing::error!("cannot create the staging dir: {e}"))
    else {
        return Outcome::Failed;
    };
    let stem = Uuid::new_v4().to_string();
    let mut command = Command::new(request.calibredb);
    command
        .args([
            "export",
            "--dont-write-opf",
            "--dont-save-cover",
            "--with-library",
        ])
        .arg(request.library)
        .arg("--to-dir")
        .arg(&dir)
        .args(["--formats", request.book_format, "--template", &stem])
        .arg(request.book_id.to_string())
        .kill_on_drop(true);
    if let Some(metadata_db) = request.metadata_db {
        command.env("CALIBRE_OVERRIDE_DATABASE_PATH", metadata_db);
    }
    let output = match tokio::time::timeout(EXPORT_TIMEOUT, command.output()).await {
        Ok(Ok(output)) => output,
        Ok(Err(error)) => {
            tracing::error!("calibredb could not start: {error}");
            return Outcome::Failed;
        }
        Err(_) => {
            tracing::error!("calibredb export of book {} timed out", request.book_id);
            return Outcome::Failed;
        }
    };
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains(LOCKED) {
        tracing::warn!(
            "calibre library locked while exporting book {}",
            request.book_id
        );
        return Outcome::Busy;
    }
    if !output.stderr.is_empty() {
        tracing::error!("Metadata embedder encountered an error: {stderr}");
    }
    let staged = dir.join(format!("{stem}.{}", request.book_format));
    if !output.status.success() {
        tracing::warn!(
            "calibredb export failed for book {} ({}); skipping metadata embed",
            request.book_id,
            output.status
        );
        return Outcome::Failed;
    }
    if !staged.is_file() {
        tracing::warn!(
            "calibredb export produced no file for book {} at {}",
            request.book_id,
            staged.display()
        );
        return Outcome::Failed;
    }
    Outcome::Staged(Staged { path: staged })
}
