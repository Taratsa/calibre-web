//! Signed `/files` URLs. Must stay byte-identical to `_file_version` / `_file_signature` in
//! `cps/helper.py` and to the Node copy in `frontend/scripts/seed.mjs`: the sitemap lists these URLs and the
//! `Link: rel="canonical"` header names them.

use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;
use subtle::ConstantTimeEq;

/// First 32 hex digits of HMAC-SHA256(secret, "<id>:<format>:<version>").
pub fn signature(secret: &[u8], book_id: i64, book_format: &str, version: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret).expect("HMAC accepts any key length");
    mac.update(format!("{book_id}:{book_format}:{version}").as_bytes());
    let mut digest = hex::encode(mac.finalize().into_bytes());
    digest.truncate(32);
    digest
}

/// Constant-time comparison; a different length is a mismatch.
pub fn signature_matches(
    secret: &[u8],
    book_id: i64,
    book_format: &str,
    version: &str,
    given: &str,
) -> bool {
    let expected = signature(secret, book_id, book_format, version);
    expected.as_bytes().ct_eq(given.as_bytes()).into()
}

/// `<last_modified epoch>-<uncompressed size>`; changes whenever the metadata or the file does.
/// A missing timestamp is 0 and a missing size prints as `None`, as the Python f-string does.
pub fn version(last_modified: Option<&str>, size: Option<i64>) -> Result<String, BadTimestamp> {
    let modified = match last_modified {
        Some(text) => epoch(text)?,
        None => 0,
    };
    Ok(match size {
        Some(size) => format!("{modified}-{size}"),
        None => format!("{modified}-None"),
    })
}

#[derive(Debug, PartialEq, Eq)]
pub struct BadTimestamp;

/// Seconds since the Unix epoch of a Calibre `YYYY-MM-DD[ HH:MM:SS[.ffffff]]` timestamp.
///
/// SQLAlchemy's SQLite `TIMESTAMP` reads exactly that prefix and ignores anything after it (the two
/// `...+00:00` rows in the library included), producing a naive datetime that Python then reads in the
/// process's local zone. The app container runs with `TZ=UTC`, so this is UTC.
pub fn epoch(text: &str) -> Result<i64, BadTimestamp> {
    let mut rest = text;
    let year = number(&mut rest, None)?;
    let month = number(&mut rest, Some('-'))?;
    let day = number(&mut rest, Some('-'))?;
    let time = if rest.starts_with(' ') {
        Some((
            number(&mut rest, Some(' '))?,
            number(&mut rest, Some(':'))?,
            number(&mut rest, Some(':'))?,
        ))
    } else {
        None
    };
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return Err(BadTimestamp);
    }
    let (hour, minute, second) = time.unwrap_or((0, 0, 0));
    if hour > 23 || minute > 59 || second > 59 {
        return Err(BadTimestamp);
    }
    Ok(days_from_civil(year, month, day) * 86_400 + hour * 3_600 + minute * 60 + second)
}

/// Reads `[separator]` then a run of digits off the front of `rest`.
fn number(rest: &mut &str, separator: Option<char>) -> Result<i64, BadTimestamp> {
    if let Some(separator) = separator {
        *rest = rest.strip_prefix(separator).ok_or(BadTimestamp)?;
    }
    let digits = rest.bytes().take_while(u8::is_ascii_digit).count();
    if digits == 0 {
        return Err(BadTimestamp);
    }
    let (head, tail) = rest.split_at(digits);
    *rest = tail;
    head.parse().map_err(|_| BadTimestamp)
}

/// Days from 1970-01-01 to a proleptic Gregorian date (Howard Hinnant's algorithm).
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = if month <= 2 { year - 1 } else { year };
    let era = year.div_euclid(400);
    let year_of_era = year - era * 400;
    let day_of_year = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

#[cfg(test)]
mod tests {
    use super::*;

    // Vectors produced by cps/helper.py's algorithm (hmac.new(key, msg, sha256).hexdigest()[:32]).
    #[test]
    fn signature_matches_python() {
        let key = b"test-key";
        assert_eq!(
            signature(key, 2, "pdf", "1698389813-18738748"),
            "f6fbe9a6f7a3fa4355bf4ba5f3370aa6"
        );
        assert_eq!(
            signature(key, 1338, "epub", "1774785832-1234"),
            "ed1852331696e0c7466d5a4bab35e809"
        );
        assert_eq!(
            signature(key, 7, "pdf", "0-0"),
            "39b11671814980f871fb33460b9a2d09"
        );
    }

    #[test]
    fn rejects_wrong_or_short_signatures() {
        let key = b"test-key";
        let good = signature(key, 7, "pdf", "0-0");
        assert!(signature_matches(key, 7, "pdf", "0-0", &good));
        assert!(!signature_matches(key, 7, "pdf", "0-0", &good[..31]));
        assert!(!signature_matches(key, 8, "pdf", "0-0", &good));
        assert!(!signature_matches(key, 7, "PDF", "0-0", &good));
        assert!(!signature_matches(key, 7, "pdf", "0-0", ""));
    }

    // Epochs from Python: datetime.fromisoformat(...).replace(tzinfo=UTC).timestamp()
    #[test]
    fn epoch_matches_python() {
        assert_eq!(epoch("2026-11-26 14:39:24.968816"), Ok(1_795_703_964));
        assert_eq!(epoch("2026-03-29 12:03:52.925692+00:00"), Ok(1_774_785_832));
        assert_eq!(epoch("2023-10-27 07:56:53"), Ok(1_698_393_413));
        assert_eq!(epoch("1970-01-01 00:00:00"), Ok(0));
        assert_eq!(epoch("2024-02-29"), Ok(1_709_164_800));
    }

    #[test]
    fn epoch_rejects_garbage() {
        assert_eq!(epoch(""), Err(BadTimestamp));
        assert_eq!(epoch("yesterday"), Err(BadTimestamp));
        assert_eq!(epoch("2026-13-01 00:00:00"), Err(BadTimestamp));
    }

    #[test]
    fn version_keeps_python_quirks() {
        assert_eq!(
            version(Some("2023-10-27 07:56:53"), Some(18)).unwrap(),
            "1698393413-18"
        );
        assert_eq!(version(None, Some(5)).unwrap(), "0-5");
        assert_eq!(
            version(Some("1970-01-01 00:00:00"), None).unwrap(),
            "0-None"
        );
    }
}
