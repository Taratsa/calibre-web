//! Reads the few settings the Rust routes need from `app.db` (the Flask app owns and writes it).
//! Read on every request, so an admin change in the Flask UI applies at once, as it does there.

use rusqlite::{Connection, OpenFlags, OptionalExtension};
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
    pub anonymous_browse: bool,
    pub restricted_column: i64,
    pub reverse_proxy_login: bool,
    pub reverse_proxy_login_header: String,
    pub guest_name: String,
    pub guest_role: i64,
    pub guest_language: String,
    pub guest_denied_tags: String,
    pub guest_allowed_tags: String,
    /// Any series thumbnail rows in `app.db` (type 2); see `load`.
    pub series_thumbnails: bool,
    /// `flask_settings.flask_session_key`: the HMAC key of signed URLs.
    pub session_key: Vec<u8>,
    /// `config_login_type`: 0 local, 1 LDAP, 2/3 OAuth. Only 0 can be answered here.
    pub login_type: i64,
    /// `config_remote_login`: the magic-link page lives on Flask; the login page links to it.
    pub remote_login: bool,
    /// A mail server is configured (`mail_server` set), so "Forgot password?" can work.
    pub mail_configured: bool,
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
                config_calibre_web_title, config_anonbrowse, config_restricted_column,
                config_allow_reverse_proxy_header_login, config_reverse_proxy_login_header_name,
                config_login_type, config_remote_login, mail_server
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
                anonymous_browse: flag(10)?,
                restricted_column: row.get::<_, Option<i64>>(11)?.unwrap_or(0),
                reverse_proxy_login: flag(12)?,
                reverse_proxy_login_header: text(13)?,
                guest_name: String::new(),
                guest_role: 0,
                guest_language: String::new(),
                guest_denied_tags: String::new(),
                guest_allowed_tags: String::new(),
                series_thumbnails: true,
                session_key: Vec::new(),
                login_type: row.get::<_, Option<i64>>(14)?.unwrap_or(0),
                remote_login: flag(15)?,
                mail_configured: !text(16)?.is_empty(),
            })
        },
    )?;
    let (guest_name, guest_role, guest_language, guest_denied_tags, guest_allowed_tags) = conn.query_row(
        "SELECT name, role, default_language, denied_tags, allowed_tags FROM user WHERE (role & 32) = 32 ORDER BY id LIMIT 1",
        [],
        |row| Ok((
            row.get::<_, Option<String>>(0)?.unwrap_or_default(),
            row.get::<_, Option<i64>>(1)?.unwrap_or(0),
            row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            row.get::<_, Option<String>>(4)?.unwrap_or_default(),
        )),
    )?;
    settings.guest_name = guest_name;
    settings.guest_role = guest_role;
    settings.guest_language = guest_language;
    settings.guest_denied_tags = guest_denied_tags;
    settings.guest_allowed_tags = guest_allowed_tags;
    // `TaskGenerateSeriesThumbnails` (optional, scheduled) stores series thumbnails Flask serves first; while any
    // exist, series covers stay on Flask. A failed query counts as "exist" (the safe side).
    settings.series_thumbnails = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM thumbnail WHERE type = 2)",
        [],
        |row| row.get::<_, i64>(0),
    ) != Ok(0);
    settings.session_key = conn
        .query_row(
            "SELECT flask_session_key FROM flask_settings LIMIT 1",
            [],
            |row| row.get::<_, Option<Vec<u8>>>(0),
        )?
        .unwrap_or_default();

    Ok(settings)
}

/// What one identity (the anonymous visitor, or a logged-in user) may see, read fresh on every request. Unlike cheap
/// metadata settings, a revocation here must apply to the next request, so this does not go through
/// `AppState::settings`.
#[derive(Debug, Clone)]
pub struct Access {
    pub id: i64,
    pub language: String,
    pub role: i64,
    pub denied: String,
    pub allowed: String,
    /// This identity has at least one archived book. Flask's `get_filtered_book` hides those, which no Rust query
    /// models, so an identity with archive rows is left to Flask entirely.
    pub has_archived: bool,
}

/// The anonymous visitor's row (the user carrying `ROLE_ANONYMOUS`).
pub fn load_guest_access(app_db: &Path) -> rusqlite::Result<Access> {
    let conn = open_read_only(app_db)?;
    let id: i64 = conn.query_row(
        "SELECT id FROM user WHERE (role & 32) = 32 ORDER BY id LIMIT 1",
        [],
        |row| row.get(0),
    )?;
    access_row(&conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

/// The row of `user_id`, or `None` when that user does not exist (Flask's `load_user` then has no user either).
pub fn load_access(app_db: &Path, user_id: Option<i64>) -> rusqlite::Result<Option<Access>> {
    let Some(user_id) = user_id else {
        return load_guest_access(app_db).map(Some);
    };
    let conn = open_read_only(app_db)?;
    access_row(&conn, user_id)
}

fn access_row(conn: &rusqlite::Connection, id: i64) -> rusqlite::Result<Option<Access>> {
    let row = conn
        .query_row(
            "SELECT id, default_language, role, denied_tags, allowed_tags FROM user WHERE id = ?1",
            [id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                    row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                    row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                ))
            },
        )
        .optional()?;
    let Some((id, language, role, denied, allowed)) = row else {
        return Ok(None);
    };
    let has_archived = conn
        .query_row(
            "SELECT 1 FROM archived_book WHERE user_id = ?1 AND is_archived LIMIT 1",
            [id],
            |_| Ok(()),
        )
        .map(|()| true)
        .or_else(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => Ok(false),
            other => Err(other),
        })?;
    Ok(Some(Access {
        id,
        language,
        role,
        denied,
        allowed,
        has_archived,
    }))
}
