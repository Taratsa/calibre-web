//! Reader HTML -> whitespace-normalised blocks -> sentences -> lower-cased word tokens, plus MTLD.
//!
//! Follows the regex pipeline of the original Python implementation (diffed against it over the whole cached corpus,
//! byte-identical `corpus.json`, `book_text.json`, `author_text.json`), plus one later fix: hyphenation breaks are
//! joined in `html_to_blocks` (`mengu- mumkan` -> `mengumumkan`). `cargo test` covers the pipeline.

use std::sync::LazyLock;

use regex::Regex;
use rustc_hash::FxHashSet;

use crate::constants::{MTLD_MIN_TOKENS, MTLD_THRESHOLD};

/// Opening `<script>`/`<style>` tags; the matching closer is found per tag (see `drop_active_content`).
static OPEN_TAG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)<(script|style)\b").expect("script/style open pattern"));
static CLOSE_SCRIPT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)</script>").expect("script close"));
static CLOSE_STYLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)</style>").expect("style close"));

/// Ends of the blocks a reader HTML document is split into; a table row stays one block.
static BLOCK_END: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)</(?:p|h[1-6]|li|tr|blockquote|figcaption|caption|dt|dd|pre)\s*>|<br\s*/?>\s*<br\s*/?>|<hr\s*/?>")
        .expect("block pattern")
});
static LINE_BREAK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)<br\s*/?>").expect("line break"));
static TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").expect("tag pattern"));
static SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").expect("space pattern"));

/// Hyphenation breaks: a hyphen attached to the word it breaks, then a line end or (as TurboOCR emits it) a space and a
/// lowercase continuation (`mengu- mumkan`). Joined without the hyphen; a repeat (`kata- kata`) stays reduplication, and
/// a spaced dash (`sekunder - pertanian`) is not a break because the hyphen is unattached.
static HYPHEN_BREAK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(\p{L}+)-[ \t\r\n]+(\p{Ll}\p{L}*)").expect("hyphen break pattern")
});

/// A terminator that is followed by whitespace ends a sentence, unless the next character starts a new one.
static SENTENCE_END: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"[.!?…]+["”’')\]]*\s+"#).expect("sentence pattern"));
static LAST_WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"([\p{L}\p{Nl}\p{No}]+)\.$").expect("last word pattern"));

/// Letters and other non-decimal numbers (Python's `[^\W\d_]`); hyphenated compounds stay one token.
pub static TOKEN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[\p{L}\p{Nl}\p{No}]+(?:-[\p{L}\p{Nl}\p{No}]+)*").expect("token pattern")
});

/// Indonesian titles and abbreviations after which a full stop does not end the sentence.
pub static ABBREVIATIONS: LazyLock<FxHashSet<&'static str>> = LazyLock::new(|| {
    [
        "dr", "prof", "ir", "drs", "hj", "h", "no", "nr", "hlm", "dll", "dsb", "dst", "yg", "dgn",
        "tgl", "jl", "jln", "st", "mr", "mrs", "sdr", "kol", "jend", "mayjen", "letjen", "brigjen",
        "vs", "cf", "ed", "vol", "ibid", "op", "cit", "bpk", "ibu", "tn", "ny", "mgr", "kh", "ps",
        "pdt", "rev", "sen", "gen", "kapt", "lt", "mm", "cm", "km", "kg", "rp",
    ]
    .into_iter()
    .collect()
});

/// A document split into sentences of lower-cased word tokens, plus the block and character counts.
pub struct Tokenized {
    pub sentences: Vec<Vec<String>>,
    pub paragraphs: u64,
    pub characters: u64,
}

/// Remove `<script>`/`<style>` elements with their content, replacing each with one space.
///
/// Equivalent to the Python ``<(script|style)\b.*?</\1>`` substitution without backtracking: the first opening tag
/// is matched with the first closer of the same name (a stray ``</style>`` never closes a ``<script>``).
fn drop_active_content(markup: &str) -> std::borrow::Cow<'_, str> {
    let mut output = String::new();
    let mut copied_to = 0;
    let mut search_from = 0;
    while let Some(open) = OPEN_TAG.captures_at(markup, search_from) {
        let tag = open.get(0).expect("whole match");
        let name = open.get(1).expect("tag name").as_str();
        let closer = if name.eq_ignore_ascii_case("script") {
            &*CLOSE_SCRIPT
        } else {
            &*CLOSE_STYLE
        };
        match closer.find_at(markup, tag.end()) {
            Some(close) => {
                output.push_str(&markup[copied_to..tag.start()]);
                output.push(' ');
                copied_to = close.end();
                search_from = close.end();
            }
            None => search_from = tag.end(),
        }
    }
    if copied_to == 0 {
        return std::borrow::Cow::Borrowed(markup);
    }
    output.push_str(&markup[copied_to..]);
    std::borrow::Cow::Owned(output)
}

/// Split reader HTML into whitespace-normalised text blocks (paragraphs, headings, list items, rows).
pub fn html_to_blocks(markup: &str) -> Vec<String> {
    let dropped = drop_active_content(markup);
    let mut blocks = Vec::new();
    for piece in BLOCK_END.split(&dropped) {
        let line = LINE_BREAK.replace_all(piece, " ");
        let stripped = TAG.replace_all(&line, " ");
        let decoded = html_escape::decode_html_entities(&stripped);
        let joined = HYPHEN_BREAK.replace_all(&decoded, |caps: &regex::Captures<'_>| {
            let (left, right) = (&caps[1], &caps[2]);
            if left.eq_ignore_ascii_case(right) {
                caps[0].to_string()
            } else {
                format!("{left}{right}")
            }
        });
        let collapsed = SPACE.replace_all(&joined, " ");
        let text = collapsed.trim();
        if !text.is_empty() {
            blocks.push(text.to_string());
        }
    }
    blocks
}

/// Python's `str.isdigit`: a decimal digit, or a numeric character that counts as a digit (superscripts, circled).
fn is_sentence_digit(c: char) -> bool {
    c.is_numeric()
}

/// Heuristic sentence splitter: a terminator followed by a capital, digit or opening quote ends a sentence.
pub fn split_sentences(block: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut start = 0;
    for found in SENTENCE_END.find_iter(block) {
        let end = found.end();
        let following = block[end..].chars().next();
        let starts_new = match following {
            None => true,
            Some(c) => c.is_uppercase() || is_sentence_digit(c) || "\"“‘'([".contains(c),
        };
        if !starts_new {
            continue;
        }
        if found.as_str().starts_with('.')
            && let Some(captures) = LAST_WORD.captures(&block[start..found.start() + 1])
            && let Some(word) = captures.get(1)
        {
            let text = word.as_str();
            if text.chars().count() == 1 || ABBREVIATIONS.contains(text.to_lowercase().as_str()) {
                continue;
            }
        }
        sentences.push(block[start..end].trim().to_string());
        start = end;
    }
    let tail = block[start..].trim();
    if !tail.is_empty() {
        sentences.push(tail.to_string());
    }
    sentences
}

/// The words of `text` that `TOKEN` finds, lower-cased; used for an author's own name.
pub fn lower_tokens(text: &str) -> Vec<String> {
    TOKEN
        .find_iter(&text.to_lowercase())
        .map(|found| found.as_str().to_string())
        .collect()
}

pub fn tokenize(markup: &str) -> Tokenized {
    let mut sentences = Vec::new();
    let mut paragraphs = 0;
    let mut characters = 0;
    for block in html_to_blocks(markup) {
        let mut block_has_words = false;
        characters += block.chars().count() as u64;
        for sentence in split_sentences(&block) {
            let tokens: Vec<String> = TOKEN
                .find_iter(&sentence)
                .map(|found| caseless::default_case_fold_str(found.as_str()))
                .collect();
            if !tokens.is_empty() {
                sentences.push(tokens);
                block_has_words = true;
            }
        }
        paragraphs += u64::from(block_has_words);
    }
    Tokenized {
        sentences,
        paragraphs,
        characters,
    }
}

fn mtld_pass(tokens: &[u32]) -> f64 {
    let mut factors = 0.0;
    let mut types: FxHashSet<u32> = FxHashSet::default();
    let mut count = 0;
    for &token in tokens {
        count += 1;
        types.insert(token);
        if types.len() as f64 / count as f64 <= MTLD_THRESHOLD {
            factors += 1.0;
            types.clear();
            count = 0;
        }
    }
    if count > 0 {
        factors += (1.0 - types.len() as f64 / count as f64) / (1.0 - MTLD_THRESHOLD);
    }
    if factors > 0.0 {
        tokens.len() as f64 / factors
    } else {
        0.0
    }
}

/// Measure of Textual Lexical Diversity: mean of the forward and backward pass, None when undefined.
pub fn mtld(tokens: &[u32]) -> Option<f64> {
    if tokens.len() < MTLD_MIN_TOKENS {
        return None;
    }
    let forward = mtld_pass(tokens);
    let backward = mtld_pass(&tokens.iter().rev().copied().collect::<Vec<_>>());
    if forward == 0.0 || backward == 0.0 {
        return None;
    }
    Some((forward + backward) / 2.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_split_on_paragraphs_and_keep_table_rows() {
        let blocks = html_to_blocks(
            "<p>Satu.</p><table><tr><td>a</td><td>b</td></tr></table><p>Dua &amp; tiga.</p>",
        );
        assert_eq!(blocks, vec!["Satu.", "a b", "Dua & tiga."]);
    }

    #[test]
    fn hyphenation_breaks_are_joined_and_reduplication_kept() {
        // Joining without the hyphen scored best on HistoriKorpus (WER 34.51% vs 36.54% keeping it); the cost is that a
        // real compound split at a line end (`sosial-` + `ekonomi`) loses its hyphen.
        let blocks = html_to_blocks(
            "<p>Nasio-\nnal dan mengu- mumkan, sosial-\nekonomi, kata- kata, sekunder - pertanian, 1945- 1950.</p>",
        );
        assert_eq!(
            blocks,
            vec![
                "Nasional dan mengumumkan, sosialekonomi, kata- kata, sekunder - pertanian, 1945- 1950."
            ]
        );
    }

    #[test]
    fn script_and_style_content_is_dropped() {
        assert_eq!(
            html_to_blocks("<style>p{}</style><p>ok</p><script>x</script>"),
            vec!["ok"]
        );
    }

    #[test]
    fn sentences_do_not_break_on_abbreviations_or_digits() {
        assert_eq!(
            split_sentences("Lihat hlm. 12 di sana. Lalu pergi."),
            vec!["Lihat hlm. 12 di sana.", "Lalu pergi."]
        );
    }

    #[test]
    fn tokens_keep_hyphenated_compounds_and_case_fold() {
        let document = tokenize("<p>Sosio-Ekonomi dan SUMBER.</p>");
        assert_eq!(
            document.sentences,
            vec![vec!["sosio-ekonomi", "dan", "sumber"]]
        );
    }

    #[test]
    fn python_round_half_to_even_is_kept() {
        assert_eq!(crate::corpus::round2(0.125), 0.12);
        assert_eq!(crate::corpus::round2(0.375), 0.38);
    }
}
