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

/// The staged file, or `None` when the export failed; the caller then serves the unmodified file, like Flask.
pub async fn export(request: Request<'_>) -> Option<Staged> {
    let dir = staging_dir()
        .inspect_err(|e| tracing::error!("cannot create the staging dir: {e}"))
        .ok()?;
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
            return None;
        }
        Err(_) => {
            tracing::error!("calibredb export of book {} timed out", request.book_id);
            return None;
        }
    };
    if !output.stderr.is_empty() {
        tracing::error!(
            "Metadata embedder encountered an error: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
    let staged = dir.join(format!("{stem}.{}", request.book_format));
    if !output.status.success() {
        tracing::warn!(
            "calibredb export failed for book {} ({}); skipping metadata embed",
            request.book_id,
            output.status
        );
        return None;
    }
    if !staged.is_file() {
        tracing::warn!(
            "calibredb export produced no file for book {} at {}",
            request.book_id,
            staged.display()
        );
        return None;
    }
    Some(Staged { path: staged })
}
