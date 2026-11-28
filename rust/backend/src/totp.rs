//! Time-based one-time passwords (RFC 6238), the second factor of the admin login.
//!
//! `totp-rs` (MIT) does the RFC work: SHA-1, 6 digits, a 30-second step and the recommended skew of one step, which
//! every authenticator app understands. This module only fixes those parameters, turns secrets into base32 (what the
//! `otpauth://` URI and the QR code carry) and builds the QR PNG the enrolment page embeds.
//!
//! A code from a step that was already accepted must not be accepted again, which the library leaves to the caller:
//! [`verify`] returns the matched step and the caller stores it (`user.twofa_last_step`).

use totp_rs::{Algorithm, Builder, Secret, Totp};

const DIGITS: u8 = 6;
const STEP_SECONDS: u64 = 30;
/// One step either side, as RFC 6238 §5.2 recommends.
const SKEW: u16 = 1;

fn build(secret_base32: &str, issuer: &str, account: &str) -> Option<Totp> {
    let secret = Secret::try_from_base32(secret_base32.trim()).ok()?;
    Builder::new()
        .with_secret(secret)
        .with_algorithm(Algorithm::SHA1)
        .with_digits(DIGITS)
        .with_step_duration(STEP_SECONDS)
        .with_skew(SKEW)
        .with_issuer(Some(issuer))
        .with_account_name(account)
        .build()
        .ok()
}

/// A fresh 160-bit secret, base32 (32 characters), as authenticator apps expect.
pub fn new_secret() -> String {
    Secret::generate().to_base32()
}

/// The step the code belongs to, or `None` when it matches no step within the skew.
pub fn verify(secret_base32: &str, code: &str, now: u64) -> Option<u64> {
    let code = code.trim();
    if code.len() != usize::from(DIGITS) || !code.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    build(secret_base32, "", "")?.check(code, now)
}

/// The code for `now`: the tests mint codes with it, and an operator can use it to check a secret.
pub fn code_at(secret_base32: &str, now: u64) -> Option<String> {
    Some(build(secret_base32, "", "")?.generate(now).to_string())
}

/// `data:image/png;base64,…` of the enrolment QR code (the `otpauth://totp/` URI, which is what authenticator apps
/// scan; the page also prints the secret for manual entry).
pub fn qr_data_uri(secret_base32: &str, issuer: &str, account: &str) -> Option<String> {
    let png = build(secret_base32, issuer, account)?.to_qr_base64().ok()?;
    Some(format!("data:image/png;base64,{png}"))
}

#[cfg(test)]
mod tests {
    use super::{code_at, new_secret, qr_data_uri, verify};

    /// RFC 6238 appendix B (SHA-1, 8 digits) uses the ASCII secret "12345678901234567890"; base32 of it is
    /// `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`. The library is tested against that vector itself; here the point is that
    /// this module's six-digit, 30-second configuration is self-consistent and time-bounded.
    const SECRET: &str = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    #[test]
    fn a_code_is_valid_only_inside_its_skew_window() {
        let now = 1_790_000_000;
        let code = code_at(SECRET, now).expect("the secret is valid base32");
        assert_eq!(code.len(), 6);
        let step = now / 30 * 30;
        // the code's own step, the two neighbours and nothing beyond the skew
        assert_eq!(verify(SECRET, &code, step), Some(step / 30));
        assert_eq!(verify(SECRET, &code, step + 30), Some(step / 30));
        assert_eq!(verify(SECRET, &code, step + 59), Some(step / 30));
        assert_eq!(verify(SECRET, &code, step + 90), None);
        assert_eq!(verify(SECRET, &code, step.saturating_sub(60)), None);
    }

    #[test]
    fn malformed_codes_are_refused_without_panicking() {
        let now = 1_790_000_000;
        for bad in ["", "12345", "1234567", "abcdef", " 12345", "１２３４５６"] {
            assert_eq!(verify(SECRET, bad, now), None, "{bad:?}");
        }
        // surrounds are trimmed, which is what a paste from an authenticator app looks like
        let code = code_at(SECRET, now).unwrap();
        assert!(verify(SECRET, &format!(" {code}\n"), now).is_some());
    }

    #[test]
    fn secrets_are_base32_and_differ() {
        let first = new_secret();
        let second = new_secret();
        assert_eq!(first.len(), 32);
        assert!(
            first
                .bytes()
                .all(|b| b.is_ascii_uppercase() || b.is_ascii_digit())
        );
        assert_ne!(first, second);
    }

    #[test]
    fn the_qr_code_is_a_png_data_uri() {
        let uri =
            qr_data_uri(SECRET, "Pustaka", "admin@example.org").expect("a short secret encodes");
        assert!(
            uri.starts_with("data:image/png;base64,iVBORw0KGgo"),
            "{uri:.40}"
        );
    }
}
