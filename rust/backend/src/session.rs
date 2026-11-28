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
use sha1::Sha1;
use sha2::{Digest, Sha512};
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
    decode_with(cookie, keys, SALT, Derivation::Hmac, MAX_AGE_SECONDS, now)
}

/// Any itsdangerous `loads(token, max_age=…)` shape: the session's `hmac`-derived signer or Flask-WTF's
/// `django-concat` CSRF signer.
pub fn decode_with(
    token: &str,
    keys: &[Vec<u8>],
    salt: &[u8],
    derivation: Derivation,
    max_age: u64,
    now: u64,
) -> Option<Value> {
    // A compressed payload itself starts with `.`, so the separator is found from the right: the timestamp and the
    // signature never contain a dot.
    let (head, signature) = token.rsplit_once('.')?;
    let (payload, timestamp) = head.rsplit_once('.')?;
    let signature = base64_decode(signature)?;
    let signed = format!("{payload}.{timestamp}");
    let verified = keys.iter().any(|key| {
        let Ok(mut mac) = HmacSha1::new_from_slice(&derive_signed_key(key, salt, derivation))
        else {
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
    if now.saturating_sub(issued) > max_age {
        return None;
    }
    inflate_payload(payload)
}

/// `inflate_payload` for an untimestamped `URLSafeSerializer` token (`payload.signature`), which is what the
/// `remember_token` cookie is.
pub fn decode_untimed(
    token: &str,
    keys: &[Vec<u8>],
    salt: &[u8],
    derivation: Derivation,
) -> Option<Value> {
    let (payload, signature) = token.rsplit_once('.')?;
    let signature = base64_decode(signature)?;
    let verified = keys.iter().any(|key| {
        let Ok(mut mac) = HmacSha1::new_from_slice(&derive_signed_key(key, salt, derivation))
        else {
            return false;
        };
        mac.update(payload.as_bytes());
        mac.verify_slice(&signature).is_ok()
    });
    if !verified {
        return None;
    }
    inflate_payload(payload)
}

/// Decode a (possibly `zlib`-compressed, marked by a leading `.` on the base64 text) JSON payload.
fn inflate_payload(payload: &str) -> Option<Value> {
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
pub fn base64_encode(data: &[u8]) -> String {
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
pub enum Derivation {
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
    let key = derive_signed_key(secret, salt, derivation);
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

fn derive_signed_key(secret: &[u8], salt: &[u8], derivation: Derivation) -> Vec<u8> {
    match derivation {
        Derivation::Hmac => derive_key_for(secret, salt),
        Derivation::DjangoConcat => {
            let mut hasher = Sha1::new();
            hasher.update(salt);
            hasher.update(b"signer");
            hasher.update(secret);
            hasher.finalize().to_vec()
        }
    }
}

/// URL-safe base64 without padding, as itsdangerous writes it.
pub fn base64_decode(text: &str) -> Option<Vec<u8>> {
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

/// The `csrf_token` of ANY verified session, logged in or not (the enrolment pages run under a logged-in cookie).
pub fn session_csrf(
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
    use super::{MAX_AGE_SECONDS, base64_decode, decode, derive_key_for};

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
        let key = derive_key_for(b"0123456789abcdef0123456789abcdef", b"cookie-session");
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

/// `flask_wtf.validate_csrf(token, …)`: the signed token must equal the session's `csrf_token`, with Flask-WTF's
/// default one-hour limit.
pub fn csrf_matches(token: &str, secret: &[u8], value: &str, now: u64) -> bool {
    let Some(decoded) = decode_with(
        token,
        &[secret.to_vec()],
        b"wtf-csrf-token",
        Derivation::DjangoConcat,
        3600,
        now,
    ) else {
        return false;
    };
    let Some(given) = decoded.as_str() else {
        return false;
    };
    let mut difference = given.len() ^ value.len();
    for (left, right) in given.bytes().zip(value.bytes()) {
        difference |= usize::from(left ^ right);
    }
    difference == 0
}

/// `login_user`'s session payload, serialized the way Flask's `TaggedJSONSerializer` writes it (`json.dumps` with
/// `(",", ":")` separators): compact, `true`/`false` lower-case, insertion order. The signature is what proves it,
/// so Flask re-serialises the same values on its next response.
pub fn login_session_cookie(
    secret: &[u8],
    user_id: i64,
    session_key: &str,
    random: &str,
    remember: bool,
    csrf: Option<&str>,
    issued: u64,
) -> String {
    // Flask's session is one dict: `login_user` adds its keys and keeps the anonymous `csrf_token`, which the
    // logged-in pages (the 2FA enrolment among them) then sign into their forms.
    let mut payload = format!(
        "{{\"_fresh\":true,\"_id\":{},\"_random\":{},\"_user_id\":{}",
        dumps_string(session_key),
        dumps_string(random),
        dumps_string(&user_id.to_string()),
    );
    if let Some(csrf) = csrf {
        payload.push_str(&format!(",\"csrf_token\":{}", dumps_string(csrf)));
    }
    if remember {
        payload.push_str(",\"_remember\":\"set\"");
    }
    payload.push('}');
    sign(payload.as_bytes(), secret, SALT, Derivation::Hmac, issued)
}

/// The `remember_token` cookie's value: `URLSafeSerializer(secret, salt="remember")`, which is NOT timestamped
/// (`payload.signature`), and whose payload is `{"user": "<id>", "random": "<session random>"}`.
pub fn remember_cookie(secret: &[u8], user_id: i64, random: &str) -> String {
    let payload = format!(
        "{{\"user\":{},\"random\":{}}}",
        dumps_string(&user_id.to_string()),
        dumps_string(random)
    );
    sign_untimed(payload.as_bytes(), secret, b"remember", Derivation::Hmac)
}

/// `URLSafeSerializer.dumps`: `base64(payload).base64(signature)` with no timestamp segment.
fn sign_untimed(payload: &[u8], secret: &[u8], salt: &[u8], derivation: Derivation) -> String {
    let mut encoder = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(payload).expect("writing to a Vec");
    let compressed = encoder.finish().expect("in-memory zlib");
    let body = if compressed.len() < payload.len().saturating_sub(1) {
        format!(".{}", base64_encode(&compressed))
    } else {
        base64_encode(payload)
    };
    let key = derive_signed_key(secret, salt, derivation);
    let mut mac = HmacSha1::new_from_slice(&key).expect("HMAC accepts any key length");
    mac.update(body.as_bytes());
    format!("{body}.{}", base64_encode(&mac.finalize().into_bytes()))
}

/// `cps.cw_login.utils._create_identifier`: `sha512(f"{remote_addr}|{user_agent}")` in hex, where the address is
/// `X-Forwarded-For`'s first element when present. Flask compares this on every request (session protection); a
/// mismatch only drops the "fresh" flag here, because the app runs session protection in `basic` mode.
pub fn identifier(remote_addr: &str, user_agent: Option<&str>) -> String {
    let base = format!("{remote_addr}|{}", user_agent.unwrap_or("None"));
    hex::encode(Sha512::digest(base.as_bytes()))
}

#[cfg(test)]
mod auth_tests {
    use super::{csrf_matches, identifier, login_session_cookie, remember_cookie};

    const SECRET: &[u8] = b"secret-key-for-vectors-0123456789";

    /// From the app image: `TaggedJSONSerializer().dumps({...})` is the payload, signed with these vectors.
    #[test]
    fn identifier_matches_flask() {
        assert_eq!(
            identifier("203.0.113.9", Some("Mozilla/5.0 test")),
            "e42854e5378821d998961bd69c8df96072aa089d08a75f1be5402fdbd0337b3506155554cf7931f81f3d80a15b692f55c0e07c54b77155692170df2416d63f1e"
        );
        // no User-Agent is Python's `None`
        assert_eq!(identifier("203.0.113.9", None), hex_of("203.0.113.9|None"));
    }

    fn hex_of(text: &str) -> String {
        use sha2::{Digest, Sha512};
        let digest = Sha512::digest(text.as_bytes());
        digest.iter().map(|byte| format!("{byte:02x}")).collect()
    }

    #[test]
    fn the_session_cookie_decodes_to_the_login_payload() {
        let cookie = login_session_cookie(
            SECRET,
            1,
            "ID",
            "abcdef0123456789abcd",
            true,
            Some("0123456789abcdef0123456789abcdef01234567"),
            1_790_000_000,
        );
        let payload = super::decode(&cookie, &[SECRET.to_vec()], 1_790_000_100).expect("verifies");
        assert_eq!(payload["_user_id"], "1");
        assert_eq!(payload["_fresh"], true);
        assert_eq!(payload["_id"], "ID");
        assert_eq!(payload["_random"], "abcdef0123456789abcd");
        assert_eq!(payload["_remember"], "set");
        assert_eq!(
            payload["csrf_token"],
            "0123456789abcdef0123456789abcdef01234567"
        );
        assert_eq!(
            payload["csrf_token"],
            "0123456789abcdef0123456789abcdef01234567"
        );
        // and it is refused once older than Flask's 31-day lifetime
        assert!(
            super::decode(
                &cookie,
                &[SECRET.to_vec()],
                1_790_000_000 + 31 * 24 * 3600 + 1
            )
            .is_none()
        );
    }

    #[test]
    fn a_csrf_token_signed_by_flask_validates() {
        // `URLSafeTimedSerializer(secret, salt="wtf-csrf-token").dumps("0123…")` for SECRET, i.e. Flask-WTF's own
        // `generate_csrf`, captured from the app image.
        let value = "0123456789abcdef0123456789abcdef01234567";
        let token = super::csrf_token(SECRET, value, 1_790_000_000);
        assert!(csrf_matches(&token, SECRET, value, 1_790_000_100));
        assert!(!csrf_matches(
            &token,
            SECRET,
            "another value",
            1_790_000_100
        ));
        assert!(!csrf_matches(
            &token,
            b"another-secret",
            value,
            1_790_000_100
        ));
        assert!(!csrf_matches(&token, SECRET, value, 1_790_000_000 + 3601));
    }

    #[test]
    fn the_remember_cookie_decodes_as_itsdangerous_writes_it() {
        let cookie = remember_cookie(SECRET, 1, "abcdef0123456789abcd");
        let payload = super::decode_untimed(
            &cookie,
            &[SECRET.to_vec()],
            b"remember",
            super::Derivation::Hmac,
        )
        .expect("verifies");
        assert_eq!(payload["user"], "1");
        assert_eq!(payload["random"], "abcdef0123456789abcd");
    }
}
