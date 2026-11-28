//! The login's share of `app.db`: the account row it authenticates, the `user_session` revocation row Flask checks
//! on every request, the second-factor columns, and audit entries.
//!
//! This is the only code in the backend that WRITES `app.db` besides the anonymous download counter. It uses its own
//! short-lived connection per call (never Flask's process-wide session), `foreign_keys=ON` like the counter, and the
//! same 30-second busy timeout, so a login can wait for a concurrent upload commit instead of failing.

use rusqlite::{Connection, OptionalExtension, params};
use std::path::Path;
use std::time::Duration;

/// How long those connections wait for another writer before SQLite reports "database is locked".
const BUSY_SECONDS: u64 = 30;

/// The columns the second factor adds to `user`. Rust owns them: they are created here on startup (idempotently) and
/// never read by the ORM, so Flask's schema handling is untouched.
const TWOFA_COLUMNS: [(&str, &str); 4] = [
    ("twofa_secret", "TEXT"),
    ("twofa_last_step", "INTEGER"),
    ("twofa_recovery", "TEXT"),
    ("twofa_enabled_at", "TEXT"),
];

fn open(app_db: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open_with_flags(
        app_db,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    conn.busy_timeout(Duration::from_secs(BUSY_SECONDS))?;
    conn.execute_batch("PRAGMA foreign_keys=ON")?;
    Ok(conn)
}

/// `ALTER TABLE user ADD COLUMN …` for each missing second-factor column. Runs once at startup; a database Flask has
/// not created yet is left alone (the login route then answers with an error, it cannot authenticate anyone anyway).
pub fn ensure_schema(app_db: &Path) {
    let Ok(conn) = open(app_db) else {
        tracing::error!("cannot open {app_db:?} to prepare the second-factor columns");
        return;
    };
    for (name, kind) in TWOFA_COLUMNS {
        if let Err(error) =
            conn.execute_batch(&format!("ALTER TABLE user ADD COLUMN {name} {kind}"))
        {
            let text = error.to_string();
            if !text.contains("duplicate column name") {
                tracing::error!("cannot add user.{name}: {text}");
            }
        }
    }
}

/// The account row a password login needs.
pub struct LoginUser {
    pub id: i64,
    pub name: String,
    pub password: String,
    pub role: i64,
    /// The sealed TOTP secret (Fernet token), `None` while the account has no second factor.
    pub twofa_secret: Option<String>,
    /// The last accepted TOTP step, so one code can only be used once.
    pub twofa_last_step: Option<i64>,
    /// JSON array of `sha256` recovery-code digests.
    pub twofa_recovery: Option<String>,
}

impl LoginUser {
    pub fn has_twofa(&self) -> bool {
        self.twofa_secret.as_deref().is_some_and(|v| !v.is_empty())
    }
}

/// Case-insensitive lookup, as `func.lower(User.name) == username.lower()`.
pub fn find_user(app_db: &Path, name_lower: &str) -> rusqlite::Result<Option<LoginUser>> {
    let conn = open(app_db)?;
    conn.query_row(
        "SELECT id, name, password, role, twofa_secret, twofa_last_step, twofa_recovery
         FROM user WHERE lower(name) = ?1 LIMIT 1",
        [name_lower],
        |row| {
            Ok(LoginUser {
                id: row.get(0)?,
                name: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                password: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                role: row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                twofa_secret: row.get(4)?,
                twofa_last_step: row.get(5)?,
                twofa_recovery: row.get(6)?,
            })
        },
    )
    .optional()
}

/// The `user_logged_in` signal's `store_user_session` (a missing revocation row would log the person out again on
/// their next request) plus the expiry it would have written.
pub fn record_login(
    app_db: &Path,
    user_id: i64,
    session_key: &str,
    random: &str,
    expiry: i64,
) -> rusqlite::Result<()> {
    let conn = open(app_db)?;
    conn.execute(
        "INSERT INTO user_session (user_id, session_key, random, expiry)
         SELECT ?1, ?2, ?3, ?4
         WHERE NOT EXISTS (SELECT 1 FROM user_session WHERE user_id = ?1 AND session_key = ?2 AND random = ?3)",
        params![user_id, session_key, random, expiry],
    )?;
    Ok(())
}

/// `user.name`, for the pages that greet the account they act on.
pub fn user_name(app_db: &Path, user_id: i64) -> rusqlite::Result<Option<String>> {
    let conn = open(app_db)?;
    conn.query_row("SELECT name FROM user WHERE id = ?1", [user_id], |row| {
        row.get::<_, Option<String>>(0)
    })
    .optional()
    .map(Option::flatten)
}

/// Whether the account has a sealed TOTP secret.
pub fn twofa_enabled(app_db: &Path, user_id: i64) -> rusqlite::Result<bool> {
    Ok(twofa_secret(app_db, user_id)?.is_some_and(|value| !value.is_empty()))
}

/// The sealed TOTP secret, `None` when the account has no second factor.
pub fn twofa_secret(app_db: &Path, user_id: i64) -> rusqlite::Result<Option<String>> {
    let conn = open(app_db)?;
    conn.query_row(
        "SELECT twofa_secret FROM user WHERE id = ?1",
        [user_id],
        |row| row.get::<_, Option<String>>(0),
    )
    .optional()
    .map(Option::flatten)
}

pub fn set_twofa_last_step(app_db: &Path, user_id: i64, step: i64) -> rusqlite::Result<()> {
    let conn = open(app_db)?;
    conn.execute(
        "UPDATE user SET twofa_last_step = ?2 WHERE id = ?1",
        params![user_id, step],
    )?;
    Ok(())
}

pub fn enable_twofa(
    app_db: &Path,
    user_id: i64,
    sealed_secret: &str,
    recovery_json: &str,
    now: &str,
) -> rusqlite::Result<()> {
    let conn = open(app_db)?;
    conn.execute(
        "UPDATE user SET twofa_secret = ?2, twofa_recovery = ?3, twofa_last_step = NULL, twofa_enabled_at = ?4
         WHERE id = ?1",
        params![user_id, sealed_secret, recovery_json, now],
    )?;
    Ok(())
}

pub fn disable_twofa(app_db: &Path, user_id: i64) -> rusqlite::Result<()> {
    let conn = open(app_db)?;
    conn.execute(
        "UPDATE user SET twofa_secret = NULL, twofa_recovery = NULL, twofa_last_step = NULL, twofa_enabled_at = NULL
         WHERE id = ?1",
        [user_id],
    )?;
    Ok(())
}

/// Store the recovery-code list after one of the codes was used (the used one is dropped by the caller).
pub fn set_recovery(app_db: &Path, user_id: i64, recovery_json: &str) -> rusqlite::Result<()> {
    let conn = open(app_db)?;
    conn.execute(
        "UPDATE user SET twofa_recovery = ?2 WHERE id = ?1",
        params![user_id, recovery_json],
    )?;
    Ok(())
}

/// `create_audit_log_entry`: same columns, same `created` shape (`YYYY-MM-DD HH:MM:SS.ffffff`).
pub fn audit(app_db: &Path, user_id: i64, action: &str, details: &str, ip: &str) {
    audit_resource(app_db, user_id, action, "user", None, details, ip);
}

/// The same entry for another resource type (`resource_id` is stored as text, like Flask's `str(resource_id)`).
pub fn audit_resource(
    app_db: &Path,
    user_id: i64,
    action: &str,
    resource_type: &str,
    resource_id: Option<&str>,
    details: &str,
    ip: &str,
) {
    let created = chrono::Utc::now()
        .format("%Y-%m-%d %H:%M:%S%.6f")
        .to_string();
    let written = open(app_db).and_then(|conn| {
        conn.execute(
            "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, created)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![user_id, action, resource_type, resource_id, details, ip, created],
        )
    });
    if let Err(error) = written {
        // An audit entry must never fail the action it records.
        tracing::warn!("cannot write audit entry {action} for user {user_id}: {error}");
    }
}

/// Seconds since the epoch, `datetime.now() + 31 days` as the Python store writes it.
pub fn session_expiry(now: i64) -> i64 {
    now + 31 * 24 * 60 * 60
}

#[cfg(test)]
mod tests {
    use super::{ensure_schema, find_user, record_login, session_expiry};
    use rusqlite::Connection;

    fn database() -> (tempfile::TempDir, std::path::PathBuf) {
        let dir = tempfile::TempDir::new().unwrap();
        let path = dir.path().join("app.db");
        let conn = Connection::open(&path).unwrap();
        conn.execute_batch(
            "CREATE TABLE user (id INTEGER PRIMARY KEY, name TEXT, password TEXT, role INTEGER);
             CREATE TABLE user_session (id INTEGER PRIMARY KEY, user_id INTEGER, session_key VARCHAR,
                random VARCHAR, expiry INTEGER);
             CREATE TABLE audit_log (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, action VARCHAR(64) NOT NULL,
                resource_type VARCHAR(64) NOT NULL, resource_id VARCHAR, details VARCHAR, ip_address VARCHAR,
                created DATETIME);
             INSERT INTO user VALUES (1, 'Admin', 'scrypt:32768:8:1$s$h', 479);",
        )
        .unwrap();
        (dir, path)
    }

    #[test]
    fn adds_the_columns_once_and_reads_the_account() {
        let (_dir, path) = database();
        ensure_schema(&path);
        ensure_schema(&path);
        let columns: Vec<String> = Connection::open(&path)
            .unwrap()
            .prepare("SELECT name FROM pragma_table_info('user')")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .map(Result::unwrap)
            .collect();
        assert!(columns.contains(&"twofa_secret".to_owned()), "{columns:?}");
        let user = find_user(&path, "admin")
            .unwrap()
            .expect("case-insensitive");
        assert_eq!(user.id, 1);
        assert!(!user.has_twofa());
        assert!(find_user(&path, "nobody").unwrap().is_none());
    }

    #[test]
    fn records_the_session_row_only_once() {
        let (_dir, path) = database();
        ensure_schema(&path);
        let expiry = session_expiry(1_790_000_000);
        assert_eq!(expiry, 1_790_000_000 + 31 * 24 * 3600);
        record_login(&path, 1, "key", "random", expiry).unwrap();
        record_login(&path, 1, "key", "random", expiry).unwrap();
        let rows: i64 = Connection::open(&path)
            .unwrap()
            .query_row("SELECT count(*) FROM user_session", [], |row| row.get(0))
            .unwrap();
        assert_eq!(rows, 1);
    }

    #[test]
    fn a_missing_user_table_is_reported_not_panicked() {
        let dir = tempfile::TempDir::new().unwrap();
        let path = dir.path().join("empty.db");
        Connection::open(&path).unwrap();
        ensure_schema(&path);
        assert!(find_user(&path, "admin").is_err());
    }
}
