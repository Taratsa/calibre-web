//! Recovery codes: the way back in when the authenticator app is gone.
//!
//! Ten codes of ten characters from an unambiguous alphabet (no `0/o`, `1/l/i`), shown once at enrolment and stored
//! only as SHA-256 digests. A code is high-entropy (32^10 ≈ 2^50), so a hash — not a password hash — is the right
//! primitive here; the login rate limit bounds guessing. Each code works once: the used digest is removed.

use sha2::{Digest, Sha256};

/// The alphabet, minus characters that are misread when copied by hand.
const ALPHABET: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH: usize = 10;
pub const CODE_COUNT: usize = 10;

/// `ABCDE-FGHJK` style codes, `CODE_COUNT` of them.
pub fn generate() -> Vec<String> {
    (0..CODE_COUNT)
        .map(|_| {
            let bytes = crate::random::bytes::<CODE_LENGTH>();
            let plain: String = bytes
                .iter()
                .map(|byte| ALPHABET[usize::from(*byte) % ALPHABET.len()] as char)
                .collect();
            format!("{}-{}", &plain[..5], &plain[5..])
        })
        .collect()
}

/// What is stored: the SHA-256 hex of the code with dashes and spaces removed, upper-cased.
pub fn digest(code: &str) -> String {
    let normalized: String = code
        .chars()
        .filter(|ch| !matches!(ch, '-' | ' '))
        .flat_map(char::to_uppercase)
        .collect();
    hex::encode(Sha256::digest(normalized.as_bytes()))
}

/// The JSON array `["<digest>", …]` stored in `user.twofa_recovery`.
pub fn store(codes: &[String]) -> String {
    serde_json::to_string(&codes.iter().map(|code| digest(code)).collect::<Vec<_>>())
        .expect("a list of strings serializes")
}

/// The digests still unused, or an empty list when the column is missing or malformed.
pub fn load(json: Option<&str>) -> Vec<String> {
    json.and_then(|text| serde_json::from_str::<Vec<String>>(text).ok())
        .unwrap_or_default()
}

/// `Some(index)` when `code` matches a stored digest (constant time per comparison).
pub fn position(stored: &[String], code: &str) -> Option<usize> {
    let wanted = digest(code);
    stored.iter().position(|candidate| {
        candidate.len() == wanted.len()
            && candidate
                .bytes()
                .zip(wanted.bytes())
                .fold(0u8, |difference, (a, b)| difference | (a ^ b))
                == 0
    })
}

#[cfg(test)]
mod tests {
    use super::{CODE_COUNT, digest, generate, load, position, store};

    #[test]
    fn generates_distinct_readable_codes() {
        let codes = generate();
        assert_eq!(codes.len(), CODE_COUNT);
        for code in &codes {
            assert_eq!(code.len(), 11, "{code}");
            assert_eq!(code.as_bytes()[5], b'-');
            assert!(
                code.bytes()
                    .all(|b| b == b'-' || b"ABCDEFGHJKMNPQRSTUVWXYZ23456789".contains(&b)),
                "{code}"
            );
        }
        let mut unique = codes.clone();
        unique.sort();
        unique.dedup();
        assert_eq!(unique.len(), CODE_COUNT);
    }

    #[test]
    fn digests_ignore_case_dashes_and_spaces() {
        let code = "ABCDE-FGHJK";
        assert_eq!(digest(code), digest("abcde fghjk"));
        assert_eq!(digest(code), digest("ABCDEFGHJK"));
        assert_ne!(digest(code), digest("ABCDE-FGHJL"));
    }

    #[test]
    fn a_code_is_found_once_and_the_list_can_be_reduced() {
        let codes = generate();
        let stored = load(Some(&store(&codes)));
        assert_eq!(stored.len(), CODE_COUNT);
        let index =
            position(&stored, &codes[3].to_lowercase()).expect("matches case-insensitively");
        assert_eq!(index, 3);
        assert!(position(&stored, "ZZZZZ-ZZZZZ").is_none());
        let mut left = stored.clone();
        left.remove(index);
        assert_eq!(left.len(), CODE_COUNT - 1);
        assert!(position(&left, &codes[3]).is_none());
    }

    #[test]
    fn a_missing_or_broken_column_reads_as_no_codes() {
        assert!(load(None).is_empty());
        assert!(load(Some("not json")).is_empty());
        assert!(load(Some("[]")).is_empty());
    }
}
