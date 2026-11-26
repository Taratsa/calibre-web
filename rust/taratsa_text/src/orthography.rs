//! Old-spelling Indonesian normalisation (Van Ophuijsen 1901-1947, Soewandi 1947-1972) to modern spelling.
//!
//! The rules were derived on the DOIL corpus (`doi:10.5334/johd.564`, CC BY 4.0): half of its 44 pre-1972 works were
//! used to pick the rules, the other half to test them. Measured exact match against DOIL's human `standardized_eyd`
//! column: held-out works 72.1% -> 98.0%, all 58 works with the per-document detector 78.7% -> 98.0% (modern works
//! stay at 98.7%). Remaining errors are almost all `j` -> `y` on words where `j` is right (`saja`, `menjadi`, `wajan`).
//!
//! Rule order matters: `dj` must be replaced before a bare `j` becomes `y`. `oe` -> `u` is the signal that separates
//! Soewandi from modern text, so a document is only rewritten when it shows old spelling at all.

use crate::text::TOKEN;

/// Tokens per document under which the spelling detector is not applied (a leaflet cannot decide the question).
const DETECT_MIN_TOKENS: usize = 300;
/// `dj`/`tj` (Van Ophuijsen) in at least this share of the tokens: the full rule set, bare `j` included.
const VAN_SHARE: f64 = 0.004;
/// `oe` (Soewandi or Van Ophuijsen) in at least this share of the tokens: `oe` -> `u` only.
const OE_SHARE: f64 = 0.002;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Spelling {
    Modern,
    /// `oe` -> `u` only: a Soewandi text whose `dj`/`tj` are already gone.
    Soewandi,
    /// `dj tj nj sj ch oe j`: the full Van Ophuijsen rule set.
    VanOphuijsen,
}

/// The spelling system a document is written in, from its share of `dj`/`tj` and `oe` tokens.
pub fn detect(text: &str) -> Spelling {
    let tokens: Vec<&str> = TOKEN.find_iter(text).map(|found| found.as_str()).collect();
    if tokens.len() < DETECT_MIN_TOKENS {
        return Spelling::Modern;
    }
    let count = |pattern: &str| {
        tokens
            .iter()
            .filter(|token| token.contains(pattern))
            .count() as f64
    };
    let share = |hits: f64| hits / tokens.len() as f64;
    if share(count("dj") + count("tj")) >= VAN_SHARE {
        Spelling::VanOphuijsen
    } else if share(count("oe")) >= OE_SHARE {
        Spelling::Soewandi
    } else {
        Spelling::Modern
    }
}

/// Rewrite one token to modern spelling. Tokens without old-spelling letters come back unchanged.
pub fn normalize(word: &str, spelling: Spelling) -> String {
    if spelling == Spelling::Modern {
        return word.to_string();
    }
    if spelling == Spelling::Soewandi {
        return word.replace("oe", "u");
    }
    let mut out = String::with_capacity(word.len() + 1);
    let mut rest = word;
    while let Some(c) = rest.chars().next() {
        let lower: String = rest.chars().take(2).collect::<String>().to_lowercase();
        let upper = c.is_uppercase();
        let push = |text: &str, out: &mut String| {
            for (index, ch) in text.chars().enumerate() {
                if index == 0 && upper {
                    out.extend(ch.to_uppercase());
                } else {
                    out.push(ch);
                }
            }
        };
        let matched = match lower.as_str() {
            "dj" => Some(("j", 2)),
            "tj" => Some(("c", 2)),
            "nj" => Some(("ny", 2)),
            "sj" => Some(("sy", 2)),
            "ch" => Some(("kh", 2)),
            "oe" => Some(("u", 2)),
            _ => None,
        };
        match matched {
            Some((replacement, skip)) => {
                push(replacement, &mut out);
                rest = &rest[skip..];
            }
            None => {
                let text = if c == 'j' || c == 'J' {
                    "y"
                } else {
                    &rest[..c.len_utf8()]
                };
                push(text, &mut out);
                rest = &rest[c.len_utf8()..];
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn van_ophuijsen_tokens_are_rewritten() {
        let cases = [
            ("djalan", "jalan"),
            ("tjerita", "cerita"),
            ("njanji", "nyanyi"),
            ("sjarat", "syarat"),
            ("chabar", "khabar"),
            ("oentoek", "untuk"),
            ("jang", "yang"),
            ("Djakarta", "Jakarta"),
            ("pertjaja", "percaya"),
        ];
        for (old, modern) in cases {
            assert_eq!(normalize(old, Spelling::VanOphuijsen), modern, "{old}");
        }
    }

    #[test]
    fn soewandi_only_rewrites_oe() {
        assert_eq!(normalize("oentoek", Spelling::Soewandi), "untuk");
        assert_eq!(normalize("djalan", Spelling::Soewandi), "djalan");
    }

    #[test]
    fn modern_text_is_left_alone() {
        for word in ["jalan", "cerita", "yang", "saja", "menjadi"] {
            assert_eq!(normalize(word, Spelling::Modern), word);
        }
    }

    #[test]
    fn a_document_is_only_rewritten_when_it_looks_old() {
        let modern = "yang dan di dengan untuk dari pada ".repeat(80);
        assert_eq!(detect(&modern), Spelling::Modern);
        let van = format!("{} djalan tjerita oentoek jang ", "kata ".repeat(300));
        assert_eq!(detect(&van), Spelling::VanOphuijsen);
        let oe = format!("{} oentoek ", "kata ".repeat(400));
        assert_eq!(detect(&oe), Spelling::Soewandi);
    }
}
