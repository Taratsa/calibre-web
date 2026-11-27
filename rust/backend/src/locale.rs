//! `cw_babel.get_locale()` for an anonymous visitor: which translation of the viewer's title the guest gets.
//!
//! Flask parses `Accept-Language` with Werkzeug (`LanguageAccept`: sorted by quality, ties keep header order),
//! turns each tag into a Babel locale, skips the ones Babel does not know, and calls
//! `negotiate_locale(preferred or ["en"], available)`. Babel's CLDR data is not reproduced here. Instead
//! `tools/gen_locale_table.py` asks the real Babel, inside the app image, what every tag shape maps to and writes it to
//! `locale_table.txt`; this module only parses the header and looks tags up. Regenerate the table when
//! `cps/translations` or Babel changes.
//!
//! A header this module cannot answer exactly (`None` from [`select`]) is handed to Flask rather than guessed.

use std::collections::HashMap;
use std::sync::LazyLock;

const TABLE: &str = include_str!("locale_table.txt");

struct Table {
    /// `lang`, `lang_Script`, `lang_REGION`, `lang_Script_REGION` (Babel spelling) to the available locale.
    tags: HashMap<&'static str, &'static str>,
    /// Available locale to the translated "PDF Reader".
    labels: HashMap<&'static str, &'static str>,
}

static TABLE_DATA: LazyLock<Table> = LazyLock::new(|| {
    let mut tags = HashMap::new();
    let mut labels = HashMap::new();
    for line in TABLE.lines() {
        if let Some(rest) = line.strip_prefix("= ") {
            if let Some((locale, label)) = rest.split_once(' ') {
                labels.insert(locale, label);
            }
        } else if let Some((tag, locale)) = line.split_once(' ') {
            tags.insert(tag, locale);
        }
    }
    Table { tags, labels }
});

fn table() -> &'static Table {
    &TABLE_DATA
}

/// The translated "PDF Reader" for an `Accept-Language` header, or `None` when this module cannot say what Flask
/// would pick (the caller then proxies the request to Flask).
pub fn pdf_reader_label(accept_language: Option<&str>) -> Option<&'static str> {
    let table = table();
    let locale = select(accept_language)?;
    table.labels.get(locale).copied()
}

/// The available locale Flask picks, `Some("en")` when it falls back to English.
///
/// `Some(locale)` is returned only when the answer is certain. Flask can also end up with `None` (a valid tag that
/// matches no catalog, e.g. `nb-NO`), in which case flask-babel falls back to its default locale, English as well.
pub fn select(accept_language: Option<&str>) -> Option<&'static str> {
    let table = table();
    let mut preferred: Vec<&'static str> = Vec::new();
    let mut matched_any_valid = false;
    for tag in ordered_tags(accept_language.unwrap_or(""))? {
        match lookup(table, &tag) {
            Lookup::Unknown => return None,
            Lookup::Invalid => continue,
            Lookup::Valid(hit) => {
                matched_any_valid = true;
                if let Some(locale) = hit {
                    preferred.push(locale);
                    break;
                }
            }
        }
    }
    let _ = matched_any_valid;
    Some(preferred.first().copied().unwrap_or("en"))
}

enum Lookup {
    /// Babel rejects the tag, so Flask skips it.
    Invalid,
    /// Babel accepts it; `Some(locale)` when the negotiation lands on an available locale.
    Valid(Option<&'static str>),
    /// A shape the table cannot answer.
    Unknown,
}

fn lookup(table: &Table, tag: &str) -> Lookup {
    let parts: Vec<&str> = tag.split(['-', '_']).collect();
    let language = parts[0];
    if !(2..=3).contains(&language.len()) || !language.bytes().all(|b| b.is_ascii_alphabetic()) {
        // `*`, `q`, 4-8 letter registered languages: Babel's parse answers depend on data outside the table.
        return if tag == "*" {
            Lookup::Invalid
        } else {
            Lookup::Unknown
        };
    }
    let language = language.to_ascii_lowercase();
    let mut script = None;
    let mut region = None;
    for part in &parts[1..] {
        match part.len() {
            4 if part.bytes().all(|b| b.is_ascii_alphabetic())
                && script.is_none()
                && region.is_none() =>
            {
                script = Some(title_case(part));
            }
            2 if part.bytes().all(|b| b.is_ascii_alphabetic()) && region.is_none() => {
                region = Some(part.to_ascii_uppercase());
            }
            _ => return Lookup::Unknown,
        }
    }
    let mut key = language;
    if let Some(script) = &script {
        key.push('_');
        key.push_str(script);
    }
    if let Some(region) = &region {
        key.push('_');
        key.push_str(region);
    }
    match table.tags.get(key.as_str()) {
        Some(locale) => Lookup::Valid(Some(locale)),
        // Absent: Babel rejects it, or it parses but matches no catalog. The table cannot tell the two apart for
        // a tag whose language Babel knows but no catalog covers, and both are "skip this tag" for Flask except
        // the one case where Flask returns `None`. Both end at the English fallback below, so they agree.
        None => Lookup::Invalid,
    }
}

fn title_case(part: &str) -> String {
    let mut chars = part.chars();
    match chars.next() {
        Some(first) => {
            first.to_ascii_uppercase().to_string() + &chars.as_str().to_ascii_lowercase()
        }
        None => String::new(),
    }
}

/// Werkzeug's `parse_accept_header(value, LanguageAccept)` values, in its iteration order: `*` last, then by quality
/// (descending), ties keeping header order. `None` for a header it would parse differently (quoted or parameterised
/// items), which the caller treats as "ask Flask".
fn ordered_tags(header: &str) -> Option<Vec<String>> {
    let mut items: Vec<(bool, f64, usize, String)> = Vec::new();
    for (index, raw) in header.split(',').enumerate() {
        let raw = raw.trim_matches([' ', '\t']);
        if raw.is_empty() {
            continue;
        }
        if raw.contains('"') || raw.contains('\\') {
            return None;
        }
        let mut pieces = raw.split(';');
        let tag = pieces.next()?.trim_matches([' ', '\t']);
        let mut quality = 1.0;
        for option in pieces {
            let option = option.trim_matches([' ', '\t']);
            let (name, value) = option.split_once('=')?;
            if name.trim().eq_ignore_ascii_case("q") {
                let value = value.trim_matches([' ', '\t']);
                // `de;q=` is kept at full quality by Werkzeug's options parser (not dropped like `q=x`), so an empty
                // value is a shape this module does not model: ask Flask.
                if value.is_empty() {
                    return None;
                }
                // Werkzeug's `_q_value_re` is `-?\d+(\.\d+)?`: `.9` is not a number and the item is dropped.
                if !is_q_syntax(value) {
                    quality = f64::NAN;
                } else {
                    quality = value.parse().ok()?;
                }
            } else {
                return None;
            }
        }
        if quality.is_nan() || !(0.0..=1.0).contains(&quality) {
            continue;
        }
        items.push((tag != "*", quality, index, tag.to_owned()));
    }
    // sorted(key=(specificity, q), reverse=True) is stable and, with reverse, keeps equal keys in input order.
    items.sort_by(|a, b| {
        b.0.cmp(&a.0)
            .then(b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal))
            .then(a.2.cmp(&b.2))
    });
    Some(items.into_iter().map(|item| item.3).collect())
}

fn is_q_syntax(value: &str) -> bool {
    let value = value.strip_prefix('-').unwrap_or(value);
    let (whole, fraction) = match value.split_once('.') {
        Some((whole, fraction)) => (whole, Some(fraction)),
        None => (value, None),
    };
    !whole.is_empty()
        && whole.bytes().all(|b| b.is_ascii_digit())
        && fraction.is_none_or(|f| !f.is_empty() && f.bytes().all(|b| b.is_ascii_digit()))
}

#[cfg(test)]
mod tests {
    use super::{pdf_reader_label, select};

    fn pick(header: &str) -> Option<&'static str> {
        select(Some(header))
    }

    // Each value was produced by the production app (Babel 2.19, Werkzeug 3.1.9, the translations in the image).
    #[test]
    fn production_headers() {
        assert_eq!(pick("id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"), Some("id"));
        assert_eq!(pick("en-US,en;q=0.9"), Some("en"));
        assert_eq!(pick("en-GB,en-US;q=0.9,en;q=0.8"), Some("en"));
        assert_eq!(pick("de"), Some("de"));
        assert_eq!(pick("de-AT"), Some("de"));
        assert_eq!(pick("zh-TW"), Some("zh_Hant_TW"));
        assert_eq!(pick("zh-CN"), Some("zh_Hans_CN"));
        assert_eq!(pick("pt-BR"), Some("pt_BR"));
        assert_eq!(pick("pt-PT"), Some("pt"));
        assert_eq!(pick("fr-CA"), Some("fr"));
        assert_eq!(pick("no"), Some("no"));
        assert_eq!(pick("id"), Some("id"));
    }

    #[test]
    fn unknown_or_empty_tags_fall_back_to_english() {
        assert_eq!(pick("xx-YY"), Some("en"));
        assert_eq!(pick("de-XX"), Some("en"));
        assert_eq!(pick("en;q=0"), Some("en"));
        assert_eq!(pick("*"), Some("en"));
        assert_eq!(pick(""), Some("en"));
        assert_eq!(select(None), Some("en"));
    }

    #[test]
    fn quality_orders_and_bad_quality_is_ignored() {
        assert_eq!(pick("en;q=0.1,id;q=0.9"), Some("id"));
        assert_eq!(pick("de;q=0.5,fr;q=0.5"), Some("de"));
        // `.9` is not a q value for Werkzeug, so the item is dropped and the next one decides.
        assert_eq!(pick("id;q=.9,de"), Some("de"));
        assert_eq!(pick("id;q=1.5,de"), Some("de"));
    }

    #[test]
    fn labels_come_from_the_catalogs() {
        assert_eq!(
            pdf_reader_label(Some("id-ID,id;q=0.9")),
            Some("Pembaca PDF")
        );
        assert_eq!(pdf_reader_label(Some("de")), Some("PDF-Reader"));
        assert_eq!(pdf_reader_label(Some("zh-TW")), Some("PDF閱讀器"));
        assert_eq!(pdf_reader_label(Some("en-US")), Some("PDF Reader"));
    }
}
