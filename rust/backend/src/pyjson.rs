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

/// A JSON value that keeps its keys in insertion order, which is what Python's `dict` + `json.dumps` emits: Readium's
/// manifest is compared byte for byte with Flask's, so key order AND separators (`", "` / `": "`) must match.
#[derive(Debug, Clone, PartialEq)]
pub enum Py {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    List(Vec<Py>),
    Object(Vec<(String, Py)>),
}

impl Py {
    pub fn str(value: impl Into<String>) -> Self {
        Py::Str(value.into())
    }

    pub fn obj(pairs: impl IntoIterator<Item = (&'static str, Py)>) -> Self {
        Py::Object(pairs.into_iter().map(|(k, v)| (k.to_owned(), v)).collect())
    }
}

/// `json.dumps(value)` with Python's defaults: `ensure_ascii=True`, `separators=(", ", ": ")`.
pub fn dumps(value: &Py) -> String {
    let mut out = String::new();
    write_value(&mut out, value);
    out
}

fn write_value(out: &mut String, value: &Py) {
    match value {
        Py::Null => out.push_str("null"),
        Py::Bool(true) => out.push_str("true"),
        Py::Bool(false) => out.push_str("false"),
        Py::Int(number) => {
            let _ = write!(out, "{number}");
        }
        Py::Float(number) => out.push_str(&float(*number)),
        Py::Str(text) => out.push_str(&dumps_string(text)),
        Py::List(items) => {
            out.push('[');
            for (index, item) in items.iter().enumerate() {
                if index > 0 {
                    out.push_str(", ");
                }
                write_value(out, item);
            }
            out.push(']');
        }
        Py::Object(pairs) => {
            out.push('{');
            for (index, (key, item)) in pairs.iter().enumerate() {
                if index > 0 {
                    out.push_str(", ");
                }
                out.push_str(&dumps_string(key));
                out.push_str(": ");
                write_value(out, item);
            }
            out.push('}');
        }
    }
}

/// `repr(float)`: shortest round-trip digits, fixed notation for a decimal exponent in -4..16 and
/// `<mantissa>e±NN` outside it (`repr(9.999e-05) == "9.999e-05"`, `repr(1e16) == "1e+16"`), and a `.0` on an
/// integral value in fixed notation (`repr(1.0) == "1.0"`, where Rust's `Display` prints `1`).
fn float(number: f64) -> String {
    if !number.is_finite() {
        return if number.is_nan() {
            "NaN".to_owned()
        } else if number > 0.0 {
            "Infinity".to_owned()
        } else {
            "-Infinity".to_owned()
        };
    }
    if number == 0.0 {
        return if number.is_sign_negative() {
            "-0.0".to_owned()
        } else {
            "0.0".to_owned()
        };
    }
    // Rust's `{:e}` uses the same shortest round-trip digits as Python; only the notation rule differs.
    let scientific = format!("{number:e}");
    let (mantissa, exponent) = scientific.split_once('e').expect("{:e} writes an exponent");
    let exponent: i32 = exponent.parse().expect("{:e} writes an integer exponent");
    if (-4..16).contains(&exponent) {
        let fixed = format!("{number}");
        return if fixed.contains('.') {
            fixed
        } else {
            format!("{fixed}.0")
        };
    }
    format!(
        "{mantissa}e{}{:02}",
        if exponent < 0 { '-' } else { '+' },
        exponent.unsigned_abs()
    )
}

#[cfg(test)]
mod float_tests {
    use super::float;

    // Expected values are CPython's `repr`.
    #[test]
    fn matches_python_repr() {
        for (value, expected) in [
            (0.0001, "0.0001"),
            (9.999e-05, "9.999e-05"),
            (1e16, "1e+16"),
            (1.5e16, "1.5e+16"),
            (1234567890123456.0, "1234567890123456.0"),
            (1e-5, "1e-05"),
            (-0.0, "-0.0"),
            (0.0, "0.0"),
            (1.0 / 3.0, "0.3333333333333333"),
            (2.5e17, "2.5e+17"),
            (1e-300, "1e-300"),
            (0.5, "0.5"),
            (1.0, "1.0"),
        ] {
            assert_eq!(float(value), expected, "{value}");
        }
    }
}

#[cfg(test)]
mod dumps_tests {
    use super::{Py, dumps};

    #[test]
    fn matches_python_json_dumps() {
        let value = Py::obj([
            ("a", Py::Int(1)),
            (
                "b",
                Py::List(vec![Py::str("x\ny"), Py::Null, Py::Bool(true)]),
            ),
            ("c", Py::Object(vec![("title".into(), Py::str("Café"))])),
            ("d", Py::Float(0.5)),
            ("e", Py::Float(1.0)),
        ]);
        assert_eq!(
            dumps(&value),
            "{\"a\": 1, \"b\": [\"x\\ny\", null, true], \"c\": {\"title\": \"Caf\\u00e9\"}, \"d\": 0.5, \"e\": 1.0}"
        );
        assert_eq!(dumps(&Py::Float(1.0 / 3.0)), "0.3333333333333333");
    }
}
