//! Download file names, ported from `get_valid_filename` (`cps/helper.py`) and the header built in
//! `get_download_link`, for the case `replace_whitespace=False` that every download uses.

const MAX_BYTES: usize = 128;

/// A name safe for a `Content-Disposition` header, or `None` when nothing is left of it.
///
/// `unicode` is `config_unicode_filename || force_unidecode`: transliterate to ASCII.
pub fn valid_filename(value: &str, unicode: bool) -> Option<String> {
    let mut value = value.to_owned();
    if value.ends_with('.') {
        value.pop();
        value.push('_');
    }
    // `/` and `:` become `_`; a run of control characters becomes one space.
    let mut cleaned = String::with_capacity(value.len());
    let mut in_control_run = false;
    for ch in value.chars() {
        if ch.is_ascii_control() {
            if !in_control_run {
                cleaned.push(' ');
            }
            in_control_run = true;
            continue;
        }
        in_control_run = false;
        cleaned.push(if ch == '/' || ch == ':' { '_' } else { ch });
    }
    let transliterated;
    let text = if unicode {
        transliterated = deunicode::deunicode(&cleaned);
        transliterated.as_str()
    } else {
        cleaned.as_str()
    };
    let text = strip_whitespaces(truncate_bytes(text, MAX_BYTES));
    (!text.is_empty()).then(|| text.to_owned())
}

/// `value.encode("utf-8")[:n].decode("utf-8", errors="ignore")`.
fn truncate_bytes(text: &str, limit: usize) -> &str {
    if text.len() <= limit {
        return text;
    }
    let mut end = limit;
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    &text[..end]
}

/// `strip_whitespaces` in `cps/string_helper.py`: whitespace plus the zero-width characters U+200B-U+200D, U+FEFF.
fn strip_whitespaces(text: &str) -> &str {
    text.trim_matches(|c: char| {
        c.is_whitespace() || matches!(c, '\u{200B}'..='\u{200D}' | '\u{FEFF}')
    })
}

/// `urllib.parse.quote(text)` (safe `/`): UTF-8 percent-encoding, upper-case hex.
pub fn quote(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for byte in text.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'.' | b'-' | b'~' | b'/') {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

/// The `Content-Disposition` value of a download, or `None` when the title leaves no usable name.
///
/// The name is "title - first author"; the ASCII `filename=` is always transliterated, while the UTF-8
/// `filename*=` keeps the original characters unless `config_unicode_filename` is set.
pub fn content_disposition(
    title: Option<&str>,
    first_author: Option<&str>,
    book_format: &str,
    unicode_filename: bool,
) -> Option<String> {
    let mut name = title.unwrap_or("").replace('\0', "");
    if let Some(author) = first_author {
        name.push_str(" - ");
        name.push_str(&author.replace('\0', ""));
    }
    let ascii = valid_filename(&name, true)?;
    let native = quote(&valid_filename(&name, unicode_filename)?);
    Some(format!(
        "attachment; filename=\"{ascii}.{book_format}\"; filename*=UTF-8''{native}.{book_format}"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_separators_and_control_runs() {
        assert_eq!(valid_filename("a/b:c", false).unwrap(), "a_b_c");
        assert_eq!(valid_filename("a\n\r\tb", false).unwrap(), "a b");
        assert_eq!(valid_filename("name.", false).unwrap(), "name_");
    }

    #[test]
    fn strips_zero_width_and_edges() {
        assert_eq!(
            valid_filename("\u{200B} title \u{FEFF}", false).unwrap(),
            "title"
        );
        assert_eq!(valid_filename("   ", false), None);
        assert_eq!(valid_filename("", false), None);
    }

    #[test]
    fn truncates_on_a_character_boundary() {
        let long = "é".repeat(100); // 200 bytes
        let out = valid_filename(&long, false).unwrap();
        assert_eq!(out.len(), 128);
        assert_eq!(out.chars().count(), 64);
        assert_eq!(valid_filename(&"a".repeat(300), false).unwrap().len(), 128);
    }

    #[test]
    fn transliterates_when_asked() {
        assert_eq!(valid_filename("Café Müller", true).unwrap(), "Cafe Muller");
        assert_eq!(valid_filename("Café", false).unwrap(), "Café");
    }

    #[test]
    fn quote_matches_python() {
        assert_eq!(
            quote("Submisi Zine S03_06 - Submisi Zine"),
            "Submisi%20Zine%20S03_06%20-%20Submisi%20Zine"
        );
        assert_eq!(quote("Café ~x"), "Caf%C3%A9%20~x");
        assert_eq!(quote("a&b'c(d)"), "a%26b%27c%28d%29");
    }

    // Header copied from the live /files response for book 2.
    #[test]
    fn disposition_matches_live_response() {
        let header = content_disposition(
            Some("Submisi Zine S03_06 - Submisi Zine"),
            None,
            "pdf",
            false,
        )
        .unwrap();
        assert_eq!(
            header,
            "attachment; filename=\"Submisi Zine S03_06 - Submisi Zine.pdf\"; \
             filename*=UTF-8''Submisi%20Zine%20S03_06%20-%20Submisi%20Zine.pdf"
        );
    }

    #[test]
    fn disposition_adds_first_author_and_keeps_utf8_native() {
        let header =
            content_disposition(Some("Cinta"), Some("Pramoedya Ananta Toer"), "epub", false)
                .unwrap();
        assert!(header.starts_with("attachment; filename=\"Cinta - Pramoedya Ananta Toer.epub\""));
        let header = content_disposition(Some("Éclair"), None, "epub", false).unwrap();
        assert!(header.contains("filename=\"Eclair.epub\""));
        assert!(header.contains("filename*=UTF-8''%C3%89clair.epub"));
    }
}
