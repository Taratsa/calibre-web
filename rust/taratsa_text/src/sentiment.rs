//! Word-valence scoring with VADER's rule design (negation scope, boosters, contrastive conjunctions).
//!
//! VADER itself is English-only (its lexicon would need to be applied to Indonesian prose, which is invalid), so only
//! the rules are reproduced here; the polarity words come from `cps/sentiment_lexicon.json`. The result is a coarse
//! ratio of positive to negative *words*, not an opinion about the book.

/// One vocabulary entry's role in the scorer, filled in when the word is interned.
#[derive(Clone, Copy, Default)]
pub struct Word {
    pub sign: i8,
    pub negator: bool,
    pub booster: bool,
    pub contrast: bool,
    /// First word of a "one of" phrase ("salah" in "salah satu"): not a polarity word when a tail follows.
    pub partitive_head: bool,
    /// Second word of a "one of" phrase ("satu", "seorang").
    pub partitive_tail: bool,
    /// Bit per emotion (see `EMOTIONS`), so one word can carry several.
    pub emotions: u8,
}

/// The discrete emotions, in display order; `emotions` in the lexicon is keyed by these names.
pub const EMOTIONS: [&str; 8] = [
    "anger",
    "fear",
    "sadness",
    "joy",
    "trust",
    "surprise",
    "disgust",
    "anticipation",
];

/// A negator this many words before a polarity word flips its sign (VADER's 3-word negation scope).
const NEGATION_WINDOW: usize = 3;
/// A booster this many words before a polarity word counts it twice.
const BOOSTER_WINDOW: usize = 2;

/// (positive, negative) weighted hits of one sentence. A negator in scope flips the sign, a booster doubles it, and
/// a contrastive conjunction ("tetapi", "but") ends the negation scope so an earlier negator cannot reach across it.
/// `record(index, sign, weight, negated)` sees every hit with its position in the sentence (the per-section trend)
/// and whether a negator flipped it (a negated emotion word says the emotion is absent, so it is not counted).
pub fn score<F, S>(tokens: &[u32], word: F, mut record: S) -> (u64, u64)
where
    F: Fn(u32) -> Word,
    S: FnMut(usize, i8, u64, bool),
{
    let mut positive = 0;
    let mut negative = 0;
    for (index, &token) in tokens.iter().enumerate() {
        let entry = word(token);
        // "salah satu" means "one of", not "wrong": the phrase is neutral.
        if entry.partitive_head
            && tokens
                .get(index + 1)
                .is_some_and(|&next| word(next).partitive_tail)
        {
            continue;
        }
        // Emotion-only words ("mencintai") carry no polarity sign but still need to be recorded.
        if entry.sign == 0 && entry.emotions == 0 {
            continue;
        }
        let mut sign = entry.sign;
        let mut negated = false;
        for &previous in tokens[index.saturating_sub(NEGATION_WINDOW)..index]
            .iter()
            .rev()
        {
            let other = word(previous);
            if other.contrast {
                break;
            }
            if other.negator {
                sign = -sign;
                negated = true;
                break;
            }
        }
        let boosted = tokens[index.saturating_sub(BOOSTER_WINDOW)..index]
            .iter()
            .any(|&previous| word(previous).booster);
        let weight = if boosted { 2 } else { 1 };
        record(index, sign, weight, negated);
        if sign > 0 {
            positive += weight;
        } else if sign < 0 {
            negative += weight;
        }
    }
    (positive, negative)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn polarity() -> Word {
        Word {
            sign: 1,
            ..Word::default()
        }
    }

    fn word_with(sign: i8, negator: bool, booster: bool, contrast: bool) -> Word {
        Word {
            sign,
            negator,
            booster,
            contrast,
            emotions: 0,
            ..Word::default()
        }
    }

    #[test]
    fn plain_hits_are_counted_once() {
        let words = [polarity(), polarity(), Word::default()];
        assert_eq!(
            score(&[0, 1, 2], |id| words[id as usize], |_, _, _, _| {}),
            (2, 0)
        );
    }

    #[test]
    fn a_negator_within_three_words_flips_the_sign() {
        let words = [
            word_with(0, true, false, false),
            Word::default(),
            Word::default(),
            Word::default(),
            polarity(),
        ];
        assert_eq!(
            score(&[0, 1, 2, 4], |id| words[id as usize], |_, _, _, _| {}),
            (0, 1)
        );
        // Four words back is out of scope.
        let words = [
            word_with(0, true, false, false),
            Word::default(),
            Word::default(),
            Word::default(),
            Word::default(),
            polarity(),
        ];
        assert_eq!(
            score(&[0, 1, 2, 3, 5], |id| words[id as usize], |_, _, _, _| {}),
            (1, 0)
        );
    }

    #[test]
    fn a_booster_doubles_and_a_contrast_ends_negation_scope() {
        let words = [word_with(0, false, true, false), polarity()];
        assert_eq!(
            score(&[0, 1], |id| words[id as usize], |_, _, _, _| {}),
            (2, 0)
        );
        let words = [
            word_with(0, true, false, false),
            word_with(0, false, false, true),
            polarity(),
        ];
        assert_eq!(
            score(&[0, 1, 2], |id| words[id as usize], |_, _, _, _| {}),
            (1, 0)
        );
    }

    #[test]
    fn emotion_only_words_are_recorded_without_moving_polarity() {
        let words = [Word {
            emotions: 0b1,
            ..Word::default()
        }];
        let mut hits = Vec::new();
        let (positive, negative) = score(
            &[0],
            |id| words[id as usize],
            |index, sign, weight, negated| {
                hits.push((index, sign, weight, negated));
            },
        );
        assert_eq!((positive, negative), (0, 0));
        assert_eq!(hits, vec![(0, 0, 1, false)]);
    }

    #[test]
    fn a_negated_hit_is_flagged_for_the_emotion_tally() {
        let words = [
            word_with(0, true, false, false),
            word_with(-1, false, false, false),
        ];
        let mut flags = Vec::new();
        score(
            &[0, 1],
            |id| words[id as usize],
            |_, _, _, negated| flags.push(negated),
        );
        assert_eq!(flags, vec![true]);
    }

    #[test]
    fn negated_negative_becomes_positive() {
        let words = [
            word_with(0, true, false, false),
            word_with(-1, false, false, false),
        ];
        assert_eq!(
            score(&[0, 1], |id| words[id as usize], |_, _, _, _| {}),
            (1, 0)
        );
    }

    #[test]
    fn a_one_of_phrase_is_not_a_polarity_hit() {
        let words = [
            Word {
                sign: -1,
                partitive_head: true,
                ..Word::default()
            },
            Word {
                partitive_tail: true,
                ..Word::default()
            },
        ];
        // "salah satu": neutral.
        assert_eq!(
            score(&[0, 1], |id| words[id as usize], |_, _, _, _| {}),
            (0, 0)
        );
        // "salah" without a tail ("adalah salah") still counts, also when another "salah" follows.
        assert_eq!(
            score(&[0], |id| words[id as usize], |_, _, _, _| {}),
            (0, 1)
        );
        assert_eq!(
            score(&[0, 0], |id| words[id as usize], |_, _, _, _| {}),
            (0, 2)
        );
    }
}
