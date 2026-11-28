//! Random bytes from the operating system, for secrets Rust generates itself (TOTP secrets, recovery codes,
//! password salts, pending-2FA cookies). One place, so every call site is an audited CSPRNG.

/// `os.urandom(n)`.
pub fn bytes<const N: usize>() -> [u8; N] {
    let mut out = [0u8; N];
    getrandom::fill(&mut out).expect("the operating system provides random bytes");
    out
}

/// `secrets.token_hex(n)`: `2n` lower-case hex characters.
pub fn hex(count: usize) -> String {
    let mut out = String::with_capacity(count * 2);
    for _ in 0..count {
        out.push_str(&format!("{:02x}", bytes::<1>()[0]));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{bytes, hex};

    #[test]
    fn returns_different_values_and_the_right_shapes() {
        assert_ne!(bytes::<16>(), bytes::<16>());
        let token = hex(10);
        assert_eq!(token.len(), 20);
        assert!(
            token
                .bytes()
                .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
        );
    }
}
