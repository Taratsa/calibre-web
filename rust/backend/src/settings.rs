//! Reads the few settings the Rust routes need from `app.db` (the Flask app owns and writes it).
//! Read on every request, so an admin change in the Flask UI applies at once, as it does there.

use rusqlite::{Connection, OpenFlags};
use std::path::{Path, PathBuf};
use std::time::Duration;

#[derive(Debug, Clone, Default)]
pub struct Settings {
    pub use_google_drive: bool,
    pub embed_metadata: bool,
    pub unicode_filename: bool,
    pub binaries_dir: Option<String>,
    pub kepubify_configured: bool,
    pub calibre_dir: PathBuf,
    pub calibre_split: bool,
    pub calibre_split_dir: PathBuf,
    pub trusted_hosts: String,
    pub title: String,
    /// `flask_settings.flask_session_key`: the HMAC key of every signed URL.
    pub session_key: Vec<u8>,
}

impl Settings {
    /// Directory holding the book folders (`config.get_book_path()`).
    pub fn book_path(&self) -> &Path {
        if self.calibre_split {
            &self.calibre_split_dir
        } else {
            &self.calibre_dir
        }
    }

    pub fn metadata_db(&self) -> PathBuf {
        self.calibre_dir.join("metadata.db")
    }
}

pub fn open_read_only(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    conn.busy_timeout(Duration::from_secs(5))?;
    Ok(conn)
}

pub fn load(app_db: &Path) -> rusqlite::Result<Settings> {
    let conn = open_read_only(app_db)?;
    let mut settings = conn.query_row(
        "SELECT config_use_google_drive, config_embed_metadata, config_unicode_filename, config_binariesdir,
                config_kepubifypath, config_calibre_dir, config_calibre_split, config_calibre_split_dir, config_trustedhosts,
                config_calibre_web_title
         FROM settings LIMIT 1",
        [],
        |row| {
            let text = |i: usize| row.get::<_, Option<String>>(i).map(Option::unwrap_or_default);
            let flag = |i: usize| row.get::<_, Option<i64>>(i).map(|v| v.unwrap_or(0) != 0);
            Ok(Settings {
                use_google_drive: flag(0)?,
                embed_metadata: flag(1)?,
                unicode_filename: flag(2)?,
                binaries_dir: row.get::<_, Option<String>>(3)?.filter(|s| !s.is_empty()),
                kepubify_configured: !text(4)?.is_empty(),
                calibre_dir: PathBuf::from(text(5)?),
                calibre_split: flag(6)?,
                calibre_split_dir: PathBuf::from(text(7)?),
                trusted_hosts: text(8)?,
                title: text(9)?,
                session_key: Vec::new(),
            })
        },
    )?;
    settings.session_key = conn
        .query_row(
            "SELECT flask_session_key FROM flask_settings LIMIT 1",
            [],
            |row| row.get::<_, Option<Vec<u8>>>(0),
        )?
        .unwrap_or_default();
    Ok(settings)
}
