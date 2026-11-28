//! Secrets at rest in `app.db`, encrypted exactly as Flask's `config_sql` does it: Fernet with the key in
//! `<app.db dir>/.key` (44 bytes of URL-safe base64, written by the Flask app on first start).
//!
//! The TOTP secret is stored sealed, so a copy of `app.db` alone does not let anyone mint second-factor codes. The
//! tokens are byte-compatible with `cryptography.fernet.Fernet` on the Python side, which is what lets the same file
//! be read by both backends.

use fernet::Fernet;
use std::path::Path;

pub struct SecretBox {
    fernet: Fernet,
}

impl SecretBox {
    /// `cryptography.fernet.Fernet(key)` from the app's `.key` file next to `app.db`.
    pub fn from_app_db(app_db: &Path) -> Option<Self> {
        let key = app_db.parent()?.join(".key");
        let text = std::fs::read_to_string(&key).ok()?;
        let fernet = Fernet::new(text.trim())?;
        Some(Self { fernet })
    }

    pub fn seal(&self, plain: &str) -> String {
        self.fernet.encrypt(plain.as_bytes())
    }

    /// `None` for a token that is truncated, altered, or sealed with another key.
    pub fn open(&self, token: &str) -> Option<String> {
        let bytes = self.fernet.decrypt(token.trim()).ok()?;
        String::from_utf8(bytes).ok()
    }
}

#[cfg(test)]
mod tests {
    use super::SecretBox;
    use std::io::Write;

    /// `Fernet(b"…").encrypt(b"JBSWY3DPEHPK3PXP")` from `cryptography`, with this test's key.
    const KEY: &str = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    const TOKEN: &str = "gAAAAABrCqu6bLRNxsPX0aVu-YpnmyPpHWZzo5zL_q0-zsMINBahDrznDS039t2gJputcHIb-QeT9vDJjQ64KZvXuxMq1Gl8zot_muHwIG8D_bhWJOognBI=";

    fn boxed() -> (tempfile::TempDir, SecretBox) {
        let dir = tempfile::TempDir::new().unwrap();
        let mut file = std::fs::File::create(dir.path().join(".key")).unwrap();
        // Flask writes the key without a trailing newline; a stray one must not matter either.
        file.write_all(format!("{KEY}\n").as_bytes()).unwrap();
        let app_db = dir.path().join("app.db");
        std::fs::write(&app_db, b"").unwrap();
        let secret_box = SecretBox::from_app_db(&app_db).expect("the key parses");
        (dir, secret_box)
    }

    #[test]
    fn opens_a_token_written_by_python() {
        let (_dir, secret_box) = boxed();
        assert_eq!(secret_box.open(TOKEN).as_deref(), Some("JBSWY3DPEHPK3PXP"));
        assert_eq!(secret_box.open("not-a-token"), None);
        assert_eq!(secret_box.open(&TOKEN[..TOKEN.len() - 4]), None);
    }

    #[test]
    fn seals_what_it_can_open_and_never_twice_the_same() {
        let (_dir, secret_box) = boxed();
        let first = secret_box.seal("GEZDGNBVGY3TQOJQ");
        let second = secret_box.seal("GEZDGNBVGY3TQOJQ");
        assert_ne!(first, second, "Fernet embeds a random IV and timestamp");
        assert_eq!(secret_box.open(&first).as_deref(), Some("GEZDGNBVGY3TQOJQ"));
        assert_eq!(
            secret_box.open(&second).as_deref(),
            Some("GEZDGNBVGY3TQOJQ")
        );
    }

    #[test]
    fn a_missing_or_bad_key_disables_the_box() {
        let dir = tempfile::TempDir::new().unwrap();
        let app_db = dir.path().join("app.db");
        std::fs::write(&app_db, b"").unwrap();
        assert!(SecretBox::from_app_db(&app_db).is_none());
        std::fs::write(dir.path().join(".key"), b"too-short").unwrap();
        assert!(SecretBox::from_app_db(&app_db).is_none());
    }
}
