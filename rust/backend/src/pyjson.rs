//! Python's `json.dumps` string escaping (the default `ensure_ascii=True`), which two things here must reproduce byte
//! for byte: the OCR cache file name (a SHA-256 of `json.dumps(request, sort_keys=True, separators=(",", ":"))`) and
//! Jinja's `tojson` in the reader page.
//!
//! Python's `ESCAPE_ASCII` escapes everything outside space..`~`: control characters, DEL (0x7f) and every non-ASCII
//! character (as `\uXXXX`, an astral one as a surrogate pair). `"` and `\` get a backslash, and `\n \r \t \b \f` their
//! short forms. Hex digits are lower case.

use std::fmt::Write;

fn push_escaped(out: &mut String, value: &str, html_safe: bool) {
    out.push('"');
    for ch in value.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            // Jinja's `htmlsafe_json_dumps` additionally writes these four as `\uXXXX`.
            '<' | '>' | '&' | '\'' if html_safe => {
                let _ = write!(out, "\\u{:04x}", ch as u32);
            }
            ' '..='~' => out.push(ch),
            other => {
                let mut units = [0u16; 2];
                for unit in other.encode_utf16(&mut units) {
                    let _ = write!(out, "\\u{unit:04x}");
                }
            }
        }
    }
    out.push('"');
}

/// `json.dumps(value)`.
pub fn dumps_string(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    push_escaped(&mut out, value, false);
    out
}

/// Jinja's `{{ value|tojson }}` for a string: `json.dumps` plus `< > & '` as `\u003c \u003e \u0026 \u0027`, so the
/// text cannot close a `<script>` tag.
pub fn tojson(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    push_escaped(&mut out, value, true);
    out
}

#[cfg(test)]
mod tests {
    use super::{dumps_string, tojson};

    // Expected values come from CPython (the app image's `json.dumps` and Flask's `tojson` filter).
    #[test]
    fn matches_json_dumps() {
        assert_eq!(dumps_string("a\u{7f}b"), "\"a\\u007fb\"");
        assert_eq!(dumps_string("é–😀"), "\"\\u00e9\\u2013\\ud83d\\ude00\"");
        assert_eq!(dumps_string("a<b>&'c"), "\"a<b>&'c\"");
        assert_eq!(dumps_string("tab\t\u{1f}"), "\"tab\\t\\u001f\"");
        assert_eq!(dumps_string("q\"\\"), "\"q\\\"\\\\\"");
        assert_eq!(dumps_string("\u{8}\u{c}\r\n"), "\"\\b\\f\\r\\n\"");
        assert_eq!(dumps_string("x\u{fffd}"), "\"x\\ufffd\"");
    }

    #[test]
    fn tojson_cannot_close_a_script_tag() {
        assert_eq!(
            tojson("a</script>&'b"),
            "\"a\\u003c/script\\u003e\\u0026\\u0027b\""
        );
        assert_eq!(tojson("a\u{7f}"), "\"a\\u007f\"");
    }
}
