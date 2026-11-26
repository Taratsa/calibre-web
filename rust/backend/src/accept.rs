//! The only Accept check used by Flask's cover routes is
//! `"image/webp" in request.accept_mimetypes` (`cps/web.py`). Werkzeug's `MIMEAccept.__contains__`
//! ignores quality factors (even `q=0`), honors `image/*` and `*/*`, and ignores malformed q-values.

/// Match Werkzeug 3.x `MIMEAccept` containment for the target `image/webp`.
pub fn accepts_webp(value: Option<&str>) -> bool {
    let Some(value) = value.filter(|v| !v.is_empty()) else {
        return false;
    };
    for item in split_quoted(value, ',') {
        let (media_type, params) = split_first_quoted(item, ';').unwrap_or((item, ""));
        let media_type = media_type.trim();
        if media_type.is_empty() || !media_type.contains('/') {
            continue;
        }
        let mut valid = true;
        let mut other_params = Vec::new();
        for param in split_quoted(params, ';')
            .into_iter()
            .filter(|p| !p.trim().is_empty())
        {
            let Some((name, value)) = split_first_quoted(param, '=') else {
                other_params.push(param.trim());
                continue;
            };
            let name = name.trim();
            let value = unquote(value.trim());
            if name.eq_ignore_ascii_case("q") {
                match q_value(value) {
                    Some(q) if (0.0..=1.0).contains(&q) => {}
                    _ => valid = false,
                }
            } else {
                other_params.push(param.trim());
            }
        }
        if !valid {
            continue;
        }
        if !other_params.is_empty() && media_type.eq_ignore_ascii_case("image/webp") {
            // MIMEAccept compares media parameters as well; the application target has none.
            continue;
        }
        if media_type.eq_ignore_ascii_case("*/*")
            || media_type.eq_ignore_ascii_case("image/*")
            || media_type.eq_ignore_ascii_case("image/webp")
        {
            return true;
        }
    }
    false
}

fn split_quoted(value: &str, separator: char) -> Vec<&str> {
    let mut parts = Vec::new();
    let (mut start, mut quoted, mut escaped) = (0, false, false);
    for (index, ch) in value.char_indices() {
        if escaped {
            escaped = false;
        } else if ch == '\\' && quoted {
            escaped = true;
        } else if ch == '"' {
            quoted = !quoted;
        } else if ch == separator && !quoted {
            parts.push(&value[start..index]);
            start = index + ch.len_utf8();
        }
    }
    parts.push(&value[start..]);
    parts
}

fn split_first_quoted(value: &str, separator: char) -> Option<(&str, &str)> {
    let mut quoted = false;
    let mut escaped = false;
    for (index, ch) in value.char_indices() {
        if escaped {
            escaped = false;
        } else if ch == '\\' && quoted {
            escaped = true;
        } else if ch == '"' {
            quoted = !quoted;
        } else if ch == separator && !quoted {
            return Some((&value[..index], &value[index + ch.len_utf8()..]));
        }
    }
    None
}

fn unquote(value: &str) -> &str {
    value
        .strip_prefix('"')
        .and_then(|v| v.strip_suffix('"'))
        .unwrap_or(value)
}

/// Werkzeug's `_q_value_re`: `-?\d+(\.\d+)?`; parsed values outside `[0, 1]` are skipped.
fn q_value(value: &str) -> Option<f64> {
    let digits = value.strip_prefix('-').unwrap_or(value);
    let mut pieces = digits.split('.');
    let whole = pieces.next()?;
    if whole.is_empty() || !whole.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    if let Some(fraction) = pieces.next()
        && (fraction.is_empty()
            || !fraction.bytes().all(|b| b.is_ascii_digit())
            || pieces.next().is_some())
    {
        return None;
    }
    value.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::accepts_webp;

    #[test]
    fn matches_werkzeug_mimeaccept_containment() {
        for (header, expected) in [
            (None, false),
            (Some(""), false),
            (Some("*/*"), true),
            (Some("image/*"), true),
            (Some("image/webp"), true),
            (Some("IMAGE/WEBP"), true),
            (Some("image/jpeg"), false),
            (Some("text/html"), false),
            (Some("image/webp;q=0"), true),
            (Some("image/webp;q=0.000"), true),
            (Some("image/webp;q=0.5"), true),
            (Some("image/webp;q=2"), false),
            (Some("image/webp;q=.5"), false),
            (Some("image/webp;q=1."), false),
            (Some("image/webp;q=garbage"), false),
            (Some("image/webp;profile=foo"), false),
            (Some("image/*;profile=foo"), true),
            (Some("application/*;q=0.8, image/webp;q=0"), true),
            (Some("garbage, ,image/webp"), true),
            (Some("image/webp;note=\"x,y\""), false),
            (Some("image/webp;q=0.4;note=x"), false),
            (Some("*/webp"), false),
        ] {
            assert_eq!(accepts_webp(header), expected, "{header:?}");
        }
    }
}
