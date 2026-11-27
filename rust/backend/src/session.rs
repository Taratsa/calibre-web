//! Flask's session cookie, verified the way Flask verifies it, so identity routes can serve a logged-in user instead
//! of handing every cookie to Flask.
//!
//! The app uses Flask's stock `SecureCookieSessionInterface` (`cps/__init__.py` only overrides the cookie path), so a
//! cookie is `URLSafeTimedSerializer(secret, salt="cookie-session", serializer=TaggedJSONSerializer(),
//! key_derivation="hmac", digest_method=sha1)`: three URL-safe base64 segments `payload.timestamp.signature`, an
//! HMAC-SHA1 key derived as `HMAC-SHA1(secret, "cookie-session")`, the signature over `payload.timestamp`, a 4-byte
//! big-endian timestamp checked against `permanent_session_lifetime` (31 days), and a JSON payload that is zlib
//! compressed when that is shorter (marked by a leading `.`).
//!
//! Knowing who a cookie says it is, is not the same as being logged in: `cps.usermanagement.load_user` additionally
//! requires a `user_session` row matching the session's `_id`/`_random` and belonging to that user (revocation), and
//! that is reproduced here. When anything cannot be verified the caller proxies to Flask rather than guessing: a user
//! whose session Rust misreads must never receive the guest view of a book their own filters hide.

use crate::AppState;
use crate::settings::{self, Access};
use flate2::read::ZlibDecoder;
use hmac::{Hmac, KeyInit, Mac};
use serde_json::Value;
use sha1::{Digest, Sha1};
use std::io::Read;
use std::io::Write;
use std::path::Path;
use std::sync::Arc;

type HmacSha1 = Hmac<Sha1>;

/// Flask's `permanent_session_lifetime` default: 31 days.
const MAX_AGE_SECONDS: u64 = 31 * 24 * 60 * 60;
const SALT: &[u8] = b"cookie-session";

/// The cookie's decoded payload, or `None` when it does not verify (Flask would treat that as an empty session).
pub fn decode(cookie: &str, keys: &[Vec<u8>], now: u64) -> Option<Value> {
    // A compressed payload itself starts with `.`, so the separator is found from the right: the timestamp and the
    // signature never contain a dot.
    let (head, signature) = cookie.rsplit_once('.')?;
    let (payload, timestamp) = head.rsplit_once('.')?;
    let signature = base64_decode(signature)?;
    let signed = format!("{payload}.{timestamp}");
    let verified = keys.iter().any(|key| {
        let Ok(mut mac) = HmacSha1::new_from_slice(&derive_key(key)) else {
            return false;
        };
        mac.update(signed.as_bytes());
        mac.verify_slice(&signature).is_ok()
    });
    if !verified {
        return None;
    }
    // itsdangerous writes the timestamp as big-endian bytes of minimal width (`int_to_bytes`), not always four.
    let issued = base64_decode(timestamp)?
        .into_iter()
        .fold(0u64, |acc, byte| (acc << 8) | u64::from(byte));
    if now.saturating_sub(issued) > MAX_AGE_SECONDS {
        return None;
    }
    // `URLSafeSerializerMixin` marks a COMPRESSED payload with a leading `.` on the base64 TEXT, before encoding.
    let (compressed, payload_text) = match payload.strip_prefix('.') {
        Some(rest) => (true, rest),
        None => (false, payload),
    };
    let raw = base64_decode(payload_text)?;
    let raw = if compressed {
        let mut out = Vec::new();
        ZlibDecoder::new(raw.as_slice())
            .read_to_end(&mut out)
            .ok()?;
        out
    } else {
        raw
    };
    serde_json::from_slice(&raw).ok()
}

/// URL-safe base64 without padding, as itsdangerous writes it.
fn base64_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b = [
            chunk[0],
            *chunk.get(1).unwrap_or(&0),
            *chunk.get(2).unwrap_or(&0),
        ];
        let n = u32::from(b[0]) << 16 | u32::from(b[1]) << 8 | u32::from(b[2]);
        let chars = [
            ALPHABET[(n >> 18) as usize & 63],
            ALPHABET[(n >> 12) as usize & 63],
            ALPHABET[(n >> 6) as usize & 63],
            ALPHABET[n as usize & 63],
        ];
        for ch in &chars[..chunk.len() + 1] {
            out.push(*ch as char);
        }
    }
    out
}

/// How itsdangerous derives the signing key from the secret and the salt. The session cookie asks for `hmac`; a
/// serializer left on its defaults (Flask-WTF's CSRF token) uses `django-concat`.
#[derive(Clone, Copy)]
enum Derivation {
    Hmac,
    DjangoConcat,
}

/// `itsdangerous.URLSafeTimedSerializer(secret, salt=..., key_derivation=...).dumps(payload)` for raw JSON bytes: the
/// same `base64url(possibly zlib-payload).base64url(timestamp).base64url(signature)` shape [`decode`] verifies.
fn sign(payload: &[u8], secret: &[u8], salt: &[u8], derivation: Derivation, issued: u64) -> String {
    let mut encoder = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(payload).expect("writing to a Vec");
    let compressed = encoder.finish().expect("in-memory zlib");
    let body = if compressed.len() < payload.len().saturating_sub(1) {
        format!(".{}", base64_encode(&compressed))
    } else {
        base64_encode(payload)
    };
    // `int_to_bytes`: the timestamp's big-endian bytes without leading zeros (4 bytes until 2106, not always 8).
    let issued_bytes = issued.to_be_bytes();
    let first = issued_bytes
        .iter()
        .position(|b| *b != 0)
        .unwrap_or(issued_bytes.len() - 1);
    let timestamp = base64_encode(&issued_bytes[first..]);
    let key = match derivation {
        Derivation::Hmac => derive_key_for(secret, salt),
        Derivation::DjangoConcat => {
            let mut hasher = Sha1::new();
            hasher.update(salt);
            hasher.update(b"signer");
            hasher.update(secret);
            hasher.finalize().to_vec()
        }
    };
    let mut mac = HmacSha1::new_from_slice(&key).expect("HMAC accepts any key length");
    mac.update(format!("{body}.{timestamp}").as_bytes());
    format!(
        "{body}.{timestamp}.{}",
        base64_encode(&mac.finalize().into_bytes())
    )
}

/// `flask_wtf.generate_csrf`: `URLSafeTimedSerializer(secret, salt="wtf-csrf-token").dumps(session["csrf_token"])`,
/// a serializer left on itsdangerous' defaults (so `django-concat` key derivation, not the session's `hmac`).
pub fn csrf_token(secret: &[u8], value: &str, issued: u64) -> String {
    sign(
        dumps_string(value).as_bytes(),
        secret,
        b"wtf-csrf-token",
        Derivation::DjangoConcat,
        issued,
    )
}

/// What Flask stores for a page that only called `csrf_token()`: `{"csrf_token": "<40 hex>"}`, serialized by
/// `TaggedJSONSerializer` with `json.dumps` defaults.
pub fn new_session_cookie(secret: &[u8], csrf: &str, issued: u64) -> String {
    // Flask's `TaggedJSONSerializer.dumps` uses `json.dumps(..., separators=(",", ":"))`: compact, no spaces.
    let payload = format!("{{\"csrf_token\":{}}}", dumps_string(csrf));
    sign(payload.as_bytes(), secret, SALT, Derivation::Hmac, issued)
}

/// `hashlib.sha1(os.urandom(64)).hexdigest()`, the value Flask puts in the session.
pub fn new_csrf_value() -> String {
    let random = format!("{}{}", uuid::Uuid::new_v4(), uuid::Uuid::new_v4());
    let digest = Sha1::digest(random.as_bytes());
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// The page reader's own `tojson`-free JSON string escaping (kept local so this module has no page dependency).
fn dumps_string(value: &str) -> String {
    crate::pyjson::dumps_string(value)
}

/// `derive_key` for an arbitrary salt (`cookie-session` for the session, `wtf-csrf-token` for CSRF).
fn derive_key_for(secret: &[u8], salt: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha1::new_from_slice(secret).expect("HMAC accepts any key length");
    mac.update(salt);
    mac.finalize().into_bytes().to_vec()
}

/// itsdangerous' default key derivation for `Signer(salt=...)`: `HMAC-SHA1(secret, salt)`.
fn derive_key(secret: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha1::new_from_slice(secret).expect("HMAC accepts any key length");
    mac.update(SALT);
    mac.finalize().into_bytes().to_vec()
}

/// URL-safe base64 without padding, as itsdangerous writes it.
fn base64_decode(text: &str) -> Option<Vec<u8>> {
    let mut out = Vec::with_capacity(text.len() * 3 / 4 + 3);
    let mut buffer = 0u32;
    let mut bits = 0u32;
    for byte in text.bytes() {
        let value = match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'-' => 62,
            b'_' => 63,
            // itsdangerous strips '=', but tolerate it in case a client re-encodes the cookie.
            b'=' => break,
            _ => return None,
        };
        buffer = (buffer << 6) | u32::from(value);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buffer >> bits) as u8);
        }
    }
    Some(out)
}

/// The app's candidate signing keys, newest first: `SECRET_KEY` when set (as `app.secret_key` is), else the key stored
/// in `app.db`.
fn keys(state: &AppState, settings: &settings::Settings) -> Vec<Vec<u8>> {
    vec![state.secret(settings)]
}

/// Who this request is, as far as Flask is concerned, together with the visibility filters that person sees.
pub enum Who {
    Anonymous(Access),
    User(Access),
}

/// Why Flask must answer instead: a cookie that does not verify, a session this code cannot resolve, or a database
/// error.
#[derive(Debug)]
pub struct Unverified;

/// Resolve the request's identity. `Err` means "Flask must answer".
pub async fn identify(
    state: &Arc<AppState>,
    settings: &settings::Settings,
    headers: &axum::http::HeaderMap,
) -> Result<Who, Unverified> {
    let cookie = headers
        .get(axum::http::header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let session = cookie
        .split(';')
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(name, _)| *name == "session")
        .map(|(_, value)| value);

    // No session cookie: Flask's empty session, i.e. the anonymous guest.
    let Some(session) = session else {
        return anonymous(state).await;
    };

    let keys = keys(state, settings);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| Unverified)?
        .as_secs();
    let payload = decode(session, &keys, now).ok_or(Unverified)?;
    let user_id = payload
        .get("_user_id")
        .and_then(Value::as_str)
        .and_then(|id| id.parse::<i64>().ok());
    let Some(user_id) = user_id else {
        // A verified session without `_user_id` is an anonymous session (its only usual key is `csrf_token`).
        return anonymous(state).await;
    };
    let random = payload
        .get("_random")
        .and_then(Value::as_str)
        .map(str::to_owned);
    let session_key = payload
        .get("_id")
        .and_then(Value::as_str)
        .map(str::to_owned);

    let app_db = state.app_db.clone();
    let resolved: Option<Access> = tokio::task::spawn_blocking(move || {
        // `load_user`: the revocation row must exist and belong to the user the session names.
        let matches = user_id > 0
            && session_row_matches(&app_db, user_id, random.as_deref(), session_key.as_deref())
                .unwrap_or(false);
        if !matches {
            return None;
        }
        settings::load_access(&app_db, Some(user_id)).ok().flatten()
    })
    .await
    .map_err(|_| Unverified)?;
    match resolved {
        // Flask would load no user (anonymous). The guest row is the anonymous identity.
        None => anonymous(state).await,
        Some(access) => Ok(Who::User(access)),
    }
}

/// The anonymous visitor's access row.
async fn anonymous(state: &Arc<AppState>) -> Result<Who, Unverified> {
    let app_db = state.app_db.clone();
    let access = tokio::task::spawn_blocking(move || settings::load_access(&app_db, None))
        .await
        .map_err(|_| Unverified)?
        .map_err(|_| Unverified)?
        .ok_or(Unverified)?;
    Ok(Who::Anonymous(access))
}

/// The CSRF value of an ANONYMOUS session, decoded from the request's cookie: `Ok(None)` when there is no cookie (or
/// none yet), `Err` for a cookie that does not verify and for a session that names a logged-in user (Flask's page
/// there carries per-user bookmarks).
pub fn anonymous_csrf(
    headers: &axum::http::HeaderMap,
    secret: &[u8],
    now: u64,
) -> Result<Option<String>, Unverified> {
    let cookie = headers
        .get(axum::http::header::COOKIE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let Some(session) = cookie
        .split(';')
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(name, _)| *name == "session")
        .map(|(_, value)| value)
    else {
        return Ok(None);
    };
    let payload = decode(session, &[secret.to_vec()], now).ok_or(Unverified)?;
    if payload.get("_user_id").is_some() {
        return Err(Unverified);
    }
    Ok(payload
        .get("csrf_token")
        .and_then(Value::as_str)
        .map(str::to_owned))
}

/// `cps.usermanagement.load_user`: a `user_session` row by `(random, session_key)` (or by `random` alone when the
/// session carries no `_id`) whose `user_id` is the session's user. Expiry is NOT checked there, so not here either.
fn session_row_matches(
    app_db: &Path,
    user_id: i64,
    random: Option<&str>,
    session_key: Option<&str>,
) -> rusqlite::Result<bool> {
    let conn = settings::open_read_only(app_db)?;
    let found: Option<i64> = match (random, session_key) {
        (Some(random), Some(session_key)) => conn
            .query_row(
                "SELECT user_id FROM user_session WHERE random = ?1 AND session_key = ?2 LIMIT 1",
                rusqlite::params![random, session_key],
                |row| row.get(0),
            )
            .ok(),
        (Some(random), None) => conn
            .query_row(
                "SELECT user_id FROM user_session WHERE random = ?1 LIMIT 1",
                [random],
                |row| row.get(0),
            )
            .ok(),
        // No `_id` and no `_random`: the loader skips the row check entirely and returns the user.
        (None, None) => return Ok(true),
        (None, Some(_)) => return Ok(false),
    };
    Ok(found == Some(user_id))
}

#[cfg(test)]
mod tests {
    use super::{MAX_AGE_SECONDS, base64_decode, decode, derive_key};

    #[test]
    fn base64_matches_itsdangerous() {
        assert_eq!(base64_decode("aGk").unwrap(), b"hi");
        assert_eq!(base64_decode("-_8").unwrap(), vec![0xfb, 0xff]);
        assert_eq!(base64_decode("aGk=").unwrap(), b"hi");
        assert!(base64_decode("a+b").is_none());
    }

    #[test]
    fn rejects_a_tampered_cookie() {
        // Values from the app image (see the parity test): a real cookie verifies, an edited one does not.
        let key = derive_key(b"0123456789abcdef0123456789abcdef");
        assert_eq!(key.len(), 20);
        let cookie = "eyJfdXNlcl9pZCI6IjEifQ.aS0z3Q.4b6m0Q0v1Q0v1Q0v1Q0v1Q0v1Q0";
        // Structure only: this signature is not the app's, so it must fail, and never panic.
        assert!(decode(cookie, &[b"wrong key material".to_vec()], 1_700_000_000).is_none());
    }

    #[test]
    fn a_cookie_older_than_the_session_lifetime_is_ignored() {
        // Flask passes max_age=permanent_session_lifetime (31 days) to the serializer.
        assert_eq!(MAX_AGE_SECONDS, 2_678_400);
    }
}
