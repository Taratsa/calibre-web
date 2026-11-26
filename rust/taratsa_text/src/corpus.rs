//! Corpus statistics over the reader HTML of many books: word and document frequencies, n-gram tables, per-book
//! profiles (top and distinctive words, key phrases, similar books), per-author clouds, and the corpus overview.

use std::cmp::Ordering;
use std::sync::LazyLock;

use pyo3::IntoPyObjectExt;
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};
use rayon::prelude::*;
use rustc_hash::{FxHashMap, FxHashSet};

use crate::constants::*;
use crate::sentiment;
use crate::text::{Tokenized, lower_tokens, mtld, tokenize};

/// One document of an `add_many` batch.
pub struct BatchDocument {
    pub markup: String,
    pub book_format: String,
    pub book_id: Option<i64>,
    pub authors: Vec<(i64, String)>,
    pub languages: Vec<String>,
}

struct Word {
    text: Box<str>,
    chars: u32,
    is_stop: bool,
    sentiment: sentiment::Word,
}

/// An n-gram of interned word ids: bigrams keep `len == 2`, trigrams `len == 3`.
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
struct Gram {
    ids: [u32; 3],
    len: u8,
}

impl Gram {
    fn bi(a: u32, b: u32) -> Self {
        Self {
            ids: [a, b, 0],
            len: 2,
        }
    }

    fn tri(a: u32, b: u32, c: u32) -> Self {
        Self {
            ids: [a, b, c],
            len: 3,
        }
    }

    fn slice(&self) -> &[u32] {
        &self.ids[..self.len as usize]
    }
}

/// Counts keyed by gram, keeping each gram's first-seen sequence number for `Counter.most_common` tie order.
struct GramTable {
    counts: FxHashMap<Gram, (u32, u64)>,
    next_sequence: u64,
    limit: usize,
}

impl GramTable {
    fn new() -> Self {
        Self {
            counts: FxHashMap::default(),
            next_sequence: 0,
            limit: MAX_NGRAM_ENTRIES,
        }
    }

    fn bump(&mut self, gram: Gram) {
        let sequence = &mut self.next_sequence;
        let entry = self.counts.entry(gram).or_insert_with(|| {
            let assigned = *sequence;
            *sequence += 1;
            (0, assigned)
        });
        entry.0 += 1;
    }

    fn len(&self) -> usize {
        self.counts.len()
    }

    fn drop_singletons(&mut self) {
        self.counts.retain(|_, (count, _)| *count > 1);
        self.limit = MAX_NGRAM_ENTRIES.max(2 * self.counts.len());
    }

    /// The most common grams, ties by first appearance (Python's `Counter.most_common`).
    fn most_common(&self, take: usize) -> Vec<(Gram, u32)> {
        let mut entries: Vec<(Gram, u32, u64)> = self
            .counts
            .iter()
            .map(|(&gram, &(count, sequence))| (gram, count, sequence))
            .collect();
        entries.sort_by(|a, b| b.1.cmp(&a.1).then(a.2.cmp(&b.2)));
        entries.truncate(take);
        entries
            .into_iter()
            .map(|(gram, count, _)| (gram, count))
            .collect()
    }
}

struct BookCounts {
    words: u64,
    candidates: Vec<(u32, u32)>,
    phrases: Vec<(Gram, u32)>,
    authors: Vec<i64>,
    /// (positive, negative) weighted hits, None when the book is not in a scored language or has too few hits.
    sentiment: Option<SentimentScore>,
}

/// An aggregate tone score plus one value per book section (None when the section had too few hits).
struct SentimentScore {
    positive: u64,
    negative: u64,
    trend: Vec<Option<f64>>,
    /// Emotion counts, most frequent first; empty when the book has too few emotion words.
    emotions: Vec<(&'static str, u64)>,
}

/// Polarity configuration parsed from `cps/sentiment_lexicon.json` (passed in by the Python seam).
#[derive(pyo3::FromPyObject)]
#[pyo3(from_item_all)]
pub struct SentimentConfig {
    positive: Vec<String>,
    negative: Vec<String>,
    negators: Vec<String>,
    boosters: Vec<String>,
    contrasts: Vec<String>,
    /// Words that open a neutral "one of" phrase ("salah" in "salah satu").
    partitive_heads: Vec<String>,
    /// Words that complete it ("satu", "seorang").
    partitive_tails: Vec<String>,
    /// Emotion name -> words; names outside `sentiment::EMOTIONS` are ignored.
    emotions: std::collections::HashMap<String, Vec<String>>,
}

/// Per-language function words, used to guess the language of an untagged book (Calibre often has no `ind` tag).
#[derive(pyo3::FromPyObject)]
#[pyo3(from_item_all)]
pub struct LanguageWords {
    ind: Vec<String>,
    eng: Vec<String>,
}

struct SentimentSets {
    positive: FxHashSet<Box<str>>,
    negative: FxHashSet<Box<str>>,
    negators: FxHashSet<Box<str>>,
    boosters: FxHashSet<Box<str>>,
    contrasts: FxHashSet<Box<str>>,
    partitive_heads: FxHashSet<Box<str>>,
    partitive_tails: FxHashSet<Box<str>>,
    indonesian: FxHashSet<Box<str>>,
    english: FxHashSet<Box<str>>,
    /// In `sentiment::EMOTIONS` order; bit `i` of a word's mask means it belongs to set `i`.
    emotions: Vec<FxHashSet<Box<str>>>,
}

impl SentimentSets {
    fn new(config: SentimentConfig, language: LanguageWords) -> Self {
        fn set(words: Vec<String>) -> FxHashSet<Box<str>> {
            words
                .into_iter()
                .map(|word| Box::<str>::from(word.to_lowercase()))
                .collect()
        }
        let mut emotions = std::collections::HashMap::new();
        for (name, words) in config.emotions {
            emotions.insert(name, set(words));
        }
        let emotions = sentiment::EMOTIONS
            .iter()
            .map(|name| emotions.remove(*name).unwrap_or_default())
            .collect();
        Self {
            positive: set(config.positive),
            negative: set(config.negative),
            negators: set(config.negators),
            boosters: set(config.boosters),
            contrasts: set(config.contrasts),
            partitive_heads: set(config.partitive_heads),
            partitive_tails: set(config.partitive_tails),
            indonesian: set(language.ind),
            english: set(language.eng),
            emotions,
        }
    }

    /// Whether a book should be scored: a Calibre tag decides when present; an untagged book counts as Indonesian when
    /// its function words are Indonesian (an English book with an Indonesian appendix must not get a tone score).
    fn score_language(&self, languages: &[String], tokens: &[u32], words: &[Word]) -> bool {
        let tagged = languages.iter().any(|code| code == "ind" || code == "msa");
        if !languages.is_empty() {
            return tagged;
        }
        let mut indonesian = 0u64;
        let mut english = 0u64;
        for &token in tokens {
            let text = &*words[token as usize].text;
            indonesian += u64::from(self.indonesian.contains(text));
            english += u64::from(self.english.contains(text));
        }
        indonesian > 0 && indonesian >= english
    }

    fn word(&self, word: &str) -> sentiment::Word {
        // A reduplicated plural ("kesulitan-kesulitan") is one occurrence of its base word.
        let base = reduplicated_base(word).unwrap_or(word);
        let sign = if self.positive.contains(base) {
            1
        } else if self.negative.contains(base) {
            -1
        } else {
            0
        };
        let mut emotions = 0u8;
        for (index, set) in self.emotions.iter().enumerate() {
            if set.contains(base) {
                emotions |= 1 << index;
            }
        }
        sentiment::Word {
            sign,
            negator: self.negators.contains(word),
            booster: self.boosters.contains(word),
            contrast: self.contrasts.contains(word),
            partitive_head: self.partitive_heads.contains(word),
            partitive_tail: self.partitive_tails.contains(word),
            emotions,
        }
    }
}

/// "kata-kata" -> "kata": the base of a token made of one word repeated across a hyphen.
fn reduplicated_base(word: &str) -> Option<&str> {
    let (left, right) = word.split_once('-')?;
    (!left.is_empty() && left == right).then_some(left)
}

enum Median {
    Int(u64),
    Float(f64),
}

fn median(lengths: &[u64]) -> Median {
    let middle = lengths.len() / 2;
    if lengths.len() % 2 == 1 {
        Median::Int(lengths[middle])
    } else {
        Median::Float((lengths[middle - 1] + lengths[middle]) as f64 / 2.0)
    }
}

fn median_of_floats(mut values: Vec<f64>) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    let middle = values.len() / 2;
    Some(if values.len() % 2 == 1 {
        values[middle]
    } else {
        (values[middle - 1] + values[middle]) / 2.0
    })
}

/// Per-section tone values, None where a section had too few hits; empty when the trend is too sparse to draw.
fn trend(
    positive: &[u64; SENTIMENT_TREND_BUCKETS],
    negative: &[u64; SENTIMENT_TREND_BUCKETS],
) -> Vec<Option<f64>> {
    let values: Vec<Option<f64>> = (0..SENTIMENT_TREND_BUCKETS)
        .map(|index| {
            let hits = positive[index] + negative[index];
            (hits >= SENTIMENT_TREND_MIN_HITS)
                .then(|| round2((positive[index] as f64 - negative[index] as f64) / hits as f64))
        })
        .collect();
    if values.iter().filter(|value| value.is_some()).count() >= SENTIMENT_TREND_MIN_SHOWN {
        values
    } else {
        Vec::new()
    }
}

/// Emotion counts, most frequent first; empty when the book has fewer than `SENTIMENT_EMOTION_MIN_HITS` emotion words.
fn emotions(counts: &[u64; sentiment::EMOTIONS.len()]) -> Vec<(&'static str, u64)> {
    if counts.iter().sum::<u64>() < SENTIMENT_EMOTION_MIN_HITS {
        return Vec::new();
    }
    let mut ranked: Vec<(usize, u64)> = counts
        .iter()
        .copied()
        .enumerate()
        .filter(|(_, count)| *count > 0)
        .collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    ranked
        .into_iter()
        .map(|(bit, count)| (sentiment::EMOTIONS[bit], count))
        .collect()
}

/// Python's `round(value, 2)`: the exact binary value rounded to two decimals, ties to even.
pub(crate) fn round2(value: f64) -> f64 {
    format!("{value:.2}").parse().unwrap_or(value)
}

pub static AUTHOR_PLACEHOLDERS: LazyLock<FxHashSet<&'static str>> = LazyLock::new(|| {
    [
        "tidak diketahui",
        "unknown",
        "anonim",
        "anonymous",
        "none",
        "external links",
        "dkk",
        "dkk.",
        "dll.",
        "team",
        "-",
        "- -",
    ]
    .into_iter()
    .collect()
});

pub struct Builder {
    stop: FxHashSet<Box<str>>,
    vocab: Vec<Word>,
    ids: FxHashMap<Box<str>, u32>,
    word_counts: Vec<u64>,
    document_frequency: Vec<u32>,
    bigrams: GramTable,
    trigrams: GramTable,
    approximate: bool,
    lengths: Vec<u64>,
    mtlds: Vec<f64>,
    sentences: u64,
    paragraphs: u64,
    characters: u64,
    by_format: Vec<(String, u64, u64)>,
    by_format_index: FxHashMap<String, usize>,
    author_names: FxHashMap<i64, String>,
    books: Vec<(i64, BookCounts)>,
    book_index: FxHashMap<i64, usize>,
    sentiment: SentimentSets,
    /// Tokenizing workers. Kept below the core count so the gevent web loop (one core) keeps being served.
    pool: rayon::ThreadPool,
}

impl Builder {
    pub fn new(
        stopwords: FxHashSet<Box<str>>,
        sentiment: SentimentConfig,
        language: LanguageWords,
    ) -> Self {
        Self {
            stop: stopwords,
            vocab: Vec::new(),
            ids: FxHashMap::default(),
            word_counts: Vec::new(),
            document_frequency: Vec::new(),
            bigrams: GramTable::new(),
            trigrams: GramTable::new(),
            approximate: false,
            lengths: Vec::new(),
            mtlds: Vec::new(),
            sentences: 0,
            paragraphs: 0,
            characters: 0,
            by_format: Vec::new(),
            by_format_index: FxHashMap::default(),
            author_names: FxHashMap::default(),
            books: Vec::new(),
            book_index: FxHashMap::default(),
            sentiment: SentimentSets::new(sentiment, language),
            pool: rayon::ThreadPoolBuilder::new()
                .num_threads(
                    TOKENIZE_THREADS.min(
                        std::thread::available_parallelism()
                            .map_or(1, std::num::NonZero::get)
                            .saturating_sub(1)
                            .max(1),
                    ),
                )
                .thread_name(|index| format!("taratsa-tokenize-{index}"))
                .build()
                .expect("tokenizer pool"),
        }
    }

    fn intern(&mut self, word: &str) -> u32 {
        if let Some(&id) = self.ids.get(word) {
            return id;
        }
        let id = self.vocab.len() as u32;
        let is_stop = self.stop.contains(word);
        let chars = word.chars().count() as u32;
        self.vocab.push(Word {
            text: Box::from(word),
            chars,
            is_stop,
            sentiment: self.sentiment.word(word),
        });
        self.ids.insert(Box::from(word), id);
        self.word_counts.push(0);
        self.document_frequency.push(0);
        id
    }

    fn word(&self, id: u32) -> &str {
        &self.vocab[id as usize].text
    }

    fn gram_text(&self, gram: &Gram) -> String {
        gram.slice()
            .iter()
            .map(|&id| self.word(id))
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn gram_edges_ok(&self, gram: &Gram) -> bool {
        let first = &self.vocab[gram.ids[0] as usize];
        let last = &self.vocab[gram.ids[gram.len as usize - 1] as usize];
        !first.is_stop
            && !last.is_stop
            && first.chars >= CLOUD_MIN_LENGTH
            && last.chars >= CLOUD_MIN_LENGTH
    }

    fn cmp_gram(&self, a: &Gram, b: &Gram) -> Ordering {
        let (left, right) = (a.slice(), b.slice());
        for (&one, &other) in left.iter().zip(right) {
            let order = self.word(one).cmp(self.word(other));
            if order != Ordering::Equal {
                return order;
            }
        }
        left.len().cmp(&right.len())
    }

    fn contains_gram(&self, outer: &Gram, inner: &Gram) -> bool {
        let (outer, inner) = (outer.slice(), inner.slice());
        inner.len() <= outer.len() && outer.windows(inner.len()).any(|window| window == inner)
    }

    fn rank_phrases(
        &self,
        bigrams: &FxHashMap<Gram, u32>,
        trigrams: &FxHashMap<Gram, u32>,
    ) -> Vec<(Gram, u32)> {
        let mut ranked: Vec<(f64, Gram, u32)> = Vec::new();
        for (&gram, &count) in bigrams {
            if count >= BOOK_PHRASE_MIN_COUNT {
                ranked.push((count as f64, gram, count));
            }
        }
        for (&gram, &count) in trigrams {
            if count >= BOOK_PHRASE_MIN_COUNT {
                ranked.push((count as f64 * 1.5, gram, count));
            }
        }
        ranked.sort_by(|a, b| {
            a.0.partial_cmp(&b.0)
                .unwrap_or(Ordering::Equal)
                .then_with(|| self.cmp_gram(&a.1, &b.1))
                .then_with(|| a.2.cmp(&b.2))
        });
        ranked.reverse();
        let mut phrases: Vec<(Gram, u32)> = Vec::new();
        for (_, gram, count) in ranked {
            if phrases.len() == BOOK_PHRASES {
                break;
            }
            if !phrases
                .iter()
                .any(|(kept, _)| self.contains_gram(&gram, kept) || self.contains_gram(kept, &gram))
            {
                phrases.push((gram, count));
            }
        }
        if phrases.len() >= BOOK_PHRASES_MIN_SHOWN {
            phrases
        } else {
            Vec::new()
        }
    }

    /// Add one document; False when it holds no words.
    pub fn add(
        &mut self,
        markup: &str,
        book_format: &str,
        book_id: Option<i64>,
        authors: &[(i64, String)],
        languages: &[String],
    ) -> bool {
        self.add_tokenized(tokenize(markup), book_format, book_id, authors, languages)
    }

    /// Add a batch. Tokenizing is pure, so it runs on the pool; the counting stays serial and in input order, because
    /// the n-gram tables drop singletons depending on insertion order. The result is identical to calling `add` in a
    /// loop.
    pub fn add_many(&mut self, documents: &[BatchDocument]) -> Vec<bool> {
        let tokenized: Vec<Tokenized> = self
            .pool
            .install(|| documents.par_iter().map(|d| tokenize(&d.markup)).collect());
        documents
            .iter()
            .zip(tokenized)
            .map(|(d, document)| {
                self.add_tokenized(
                    document,
                    &d.book_format,
                    d.book_id,
                    &d.authors,
                    &d.languages,
                )
            })
            .collect()
    }

    fn add_tokenized(
        &mut self,
        document: Tokenized,
        book_format: &str,
        book_id: Option<i64>,
        authors: &[(i64, String)],
        languages: &[String],
    ) -> bool {
        let mut sentences: Vec<Vec<u32>> = Vec::with_capacity(document.sentences.len());
        let mut flat: Vec<u32> = Vec::new();
        for sentence in &document.sentences {
            let mut ids = Vec::with_capacity(sentence.len());
            for token in sentence {
                let id = self.intern(token);
                ids.push(id);
                flat.push(id);
            }
            sentences.push(ids);
        }
        if flat.is_empty() {
            return false;
        }
        let mut counts: FxHashMap<u32, u32> = FxHashMap::default();
        for &id in &flat {
            *counts.entry(id).or_insert(0) += 1;
        }
        for (&id, &count) in &counts {
            self.word_counts[id as usize] += u64::from(count);
            self.document_frequency[id as usize] += 1;
        }

        // Word-valence tone: only for Indonesian (or Malay) books; an English book scored by an Indonesian lexicon is
        // noise. Untagged books are decided from their function words. Hits are also bucketed by position in the book
        // so the page can draw a trend.
        let score_language = self.sentiment.score_language(languages, &flat, &self.vocab);
        let (mut positive, mut negative) = (0u64, 0u64);
        let mut trend_positive = [0u64; SENTIMENT_TREND_BUCKETS];
        let mut trend_negative = [0u64; SENTIMENT_TREND_BUCKETS];
        let mut emotion_counts = [0u64; sentiment::EMOTIONS.len()];
        if score_language {
            let total = flat.len();
            let mut offset = 0;
            for sentence in &sentences {
                let (one, other) = sentiment::score(
                    sentence,
                    |id| self.vocab[id as usize].sentiment,
                    |index, sign, weight, negated| {
                        if sign != 0 {
                            let bucket = ((offset + index) * SENTIMENT_TREND_BUCKETS / total)
                                .min(SENTIMENT_TREND_BUCKETS - 1);
                            if sign > 0 {
                                trend_positive[bucket] += weight;
                            } else {
                                trend_negative[bucket] += weight;
                            }
                        }
                        // A negated emotion word ("tidak takut") says the emotion is absent, so it is not counted.
                        let mask = self.vocab[sentence[index] as usize].sentiment.emotions;
                        if mask != 0 && !negated {
                            for (bit, count) in emotion_counts.iter_mut().enumerate() {
                                if mask & (1 << bit) != 0 {
                                    *count += weight;
                                }
                            }
                        }
                    },
                );
                positive += one;
                negative += other;
                offset += sentence.len();
            }
        }

        let mut document_bigrams: FxHashMap<Gram, u32> = FxHashMap::default();
        for sentence in &sentences {
            for window in sentence.windows(2) {
                let gram = Gram::bi(window[0], window[1]);
                if self.gram_edges_ok(&gram) {
                    self.bigrams.bump(gram);
                    *document_bigrams.entry(gram).or_insert(0) += 1;
                }
            }
        }
        if self.bigrams.len() > self.bigrams.limit {
            self.bigrams.drop_singletons();
            self.approximate = true;
        }
        let mut document_trigrams: FxHashMap<Gram, u32> = FxHashMap::default();
        for sentence in &sentences {
            for window in sentence.windows(3) {
                let gram = Gram::tri(window[0], window[1], window[2]);
                if self.gram_edges_ok(&gram) {
                    self.trigrams.bump(gram);
                    *document_trigrams.entry(gram).or_insert(0) += 1;
                }
            }
        }
        if self.trigrams.len() > self.trigrams.limit {
            self.trigrams.drop_singletons();
            self.approximate = true;
        }

        if let Some(book_id) = book_id {
            let mut candidates: Vec<(u32, u32)> = counts
                .iter()
                .filter(|&(&id, &count)| {
                    let word = &self.vocab[id as usize];
                    count >= BOOK_WORD_MIN_COUNT && word.chars >= CLOUD_MIN_LENGTH && !word.is_stop
                })
                .map(|(&id, &count)| (id, count))
                .collect();
            candidates.sort_by(|a, b| {
                b.1.cmp(&a.1).then_with(|| {
                    self.vocab[a.0 as usize]
                        .text
                        .cmp(&self.vocab[b.0 as usize].text)
                })
            });
            candidates.truncate(BOOK_CANDIDATES);
            let phrases = self.rank_phrases(&document_bigrams, &document_trigrams);
            for (author_id, name) in authors {
                self.author_names.insert(*author_id, name.clone());
            }
            let book = BookCounts {
                words: flat.len() as u64,
                candidates,
                phrases,
                authors: authors.iter().map(|(id, _)| *id).collect(),
                sentiment: (positive + negative >= SENTIMENT_MIN_HITS).then(|| SentimentScore {
                    positive,
                    negative,
                    trend: trend(&trend_positive, &trend_negative),
                    emotions: emotions(&emotion_counts),
                }),
            };
            match self.book_index.get(&book_id) {
                Some(&index) => self.books[index].1 = book,
                None => {
                    self.book_index.insert(book_id, self.books.len());
                    self.books.push((book_id, book));
                }
            }
        }

        self.lengths.push(flat.len() as u64);
        if let Some(value) = mtld(&flat) {
            self.mtlds.push(value);
        }
        self.sentences += document.sentences.len() as u64;
        self.paragraphs += document.paragraphs;
        self.characters += document.characters;
        let name = book_format.to_lowercase();
        match self.by_format_index.get(&name) {
            Some(&index) => {
                self.by_format[index].1 += 1;
                self.by_format[index].2 += flat.len() as u64;
            }
            None => {
                self.by_format_index
                    .insert(name.clone(), self.by_format.len());
                self.by_format.push((name, 1, flat.len() as u64));
            }
        }
        true
    }

    pub(crate) fn similar_books(&self) -> FxHashMap<i64, Vec<(i64, f64)>> {
        let documents = self.books.len();
        let mut similar: FxHashMap<i64, Vec<(i64, f64)>> = FxHashMap::default();
        if documents == 0 {
            return similar;
        }
        let mut frequency: FxHashMap<u32, u32> = FxHashMap::default();
        for (_, book) in &self.books {
            for (word, _) in &book.candidates {
                *frequency.entry(*word).or_insert(0) += 1;
            }
        }
        let ceiling = documents as f64 * SIMILAR_MAX_DOCUMENT_SHARE;
        let mut vectors: Vec<(i64, Vec<(u32, f64)>)> = Vec::new();
        let mut postings: FxHashMap<u32, Vec<(i64, f64)>> = FxHashMap::default();
        for (book_id, book) in &self.books {
            let weights: Vec<(u32, f64)> = book
                .candidates
                .iter()
                .filter_map(|&(word, count)| {
                    let used = f64::from(frequency[&word]);
                    (used >= 2.0 && used <= ceiling).then(|| {
                        (
                            word,
                            (1.0 + f64::from(count).ln()) * (documents as f64 / used).ln(),
                        )
                    })
                })
                .collect();
            let norm = weights
                .iter()
                .map(|(_, weight)| weight * weight)
                .sum::<f64>()
                .sqrt();
            if norm == 0.0 {
                continue;
            }
            let vector: Vec<(u32, f64)> = weights
                .iter()
                .map(|&(word, weight)| (word, weight / norm))
                .collect();
            for &(word, weight) in &vector {
                postings.entry(word).or_default().push((*book_id, weight));
            }
            vectors.push((*book_id, vector));
        }

        for (book_id, vector) in &vectors {
            let mut scores: FxHashMap<i64, f64> = FxHashMap::default();
            for &(word, weight) in vector {
                if let Some(other_weights) = postings.get(&word) {
                    for &(other, other_weight) in other_weights {
                        *scores.entry(other).or_insert(0.0) += weight * other_weight;
                    }
                }
            }
            let mut ranked: Vec<(f64, i64)> = scores
                .into_iter()
                .filter_map(|(other, score)| {
                    (other != *book_id && (SIMILAR_MIN_SCORE..SIMILAR_MAX_SCORE).contains(&score))
                        .then_some((score, other))
                })
                .collect();
            ranked.sort_by(|a, b| {
                b.0.partial_cmp(&a.0)
                    .unwrap_or(Ordering::Equal)
                    .then_with(|| b.1.cmp(&a.1))
            });
            ranked.truncate(SIMILAR_BOOKS);
            if ranked.len() >= SIMILAR_BOOKS_MIN_SHOWN {
                similar.insert(
                    *book_id,
                    ranked
                        .into_iter()
                        .map(|(score, other)| (other, round2(score)))
                        .collect(),
                );
            }
        }
        similar
    }

    fn word_counts_json<'py>(
        &self,
        py: Python<'py>,
        counts: &[(u32, u32)],
    ) -> PyResult<Vec<Py<PyAny>>> {
        counts
            .iter()
            .map(|&(word, count)| {
                PyList::new(
                    py,
                    [self.word(word).into_py_any(py)?, count.into_py_any(py)?],
                )
                .map(|list| list.into_any().unbind())
            })
            .collect()
    }

    pub fn book_text(
        &self,
        py: Python<'_>,
        similar: FxHashMap<i64, Vec<(i64, f64)>>,
    ) -> PyResult<Py<PyDict>> {
        let documents = self.lengths.len();
        let mut sorted_lengths = self.lengths.clone();
        sorted_lengths.sort_unstable();
        let profiles = PyDict::new(py);
        for (book_id, book) in &self.books {
            let enough = book.candidates.len() >= BOOK_WORDS_MIN_SHOWN;
            let mut distinct: Vec<(f64, u32, u32)> = book
                .candidates
                .iter()
                .filter(|&&(word, _)| self.document_frequency[word as usize] >= 2)
                .map(|&(word, count)| {
                    let used = f64::from(self.document_frequency[word as usize]);
                    (
                        f64::from(count) * (documents as f64 / used).ln(),
                        word,
                        count,
                    )
                })
                .collect();
            distinct.sort_by(|a, b| {
                b.0.partial_cmp(&a.0)
                    .unwrap_or(Ordering::Equal)
                    .then_with(|| self.word(b.1).cmp(self.word(a.1)))
                    .then_with(|| b.2.cmp(&a.2))
            });
            distinct.truncate(BOOK_WORDS);

            let profile = PyDict::new(py);
            profile.set_item("words", book.words)?;
            let lower = sorted_lengths.partition_point(|&length| length < book.words);
            profile.set_item("longer_than", 100 * lower as u64 / documents as u64)?;
            let top = if enough {
                PyList::new(
                    py,
                    self.word_counts_json(
                        py,
                        &book.candidates[..BOOK_WORDS.min(book.candidates.len())],
                    )?,
                )?
            } else {
                PyList::empty(py)
            };
            profile.set_item("top", top)?;
            let words = if distinct.len() >= BOOK_WORDS_MIN_SHOWN {
                let rows: Vec<(u32, u32)> = distinct
                    .iter()
                    .map(|&(_, word, count)| (word, count))
                    .collect();
                PyList::new(py, self.word_counts_json(py, &rows)?)?
            } else {
                PyList::empty(py)
            };
            profile.set_item("distinct", words)?;
            let phrases: Vec<Py<PyAny>> = book
                .phrases
                .iter()
                .map(|&(gram, count)| {
                    PyList::new(
                        py,
                        [
                            self.gram_text(&gram).into_py_any(py)?,
                            count.into_py_any(py)?,
                        ],
                    )
                    .map(|list| list.into_any().unbind())
                })
                .collect::<PyResult<_>>()?;
            profile.set_item("phrases", PyList::new(py, phrases)?)?;
            let matches: Vec<Py<PyAny>> = similar
                .get(book_id)
                .map(|items| {
                    items
                        .iter()
                        .map(|&(other, score)| {
                            PyList::new(py, [other.into_py_any(py)?, score.into_py_any(py)?])
                                .map(|list| list.into_any().unbind())
                        })
                        .collect::<PyResult<Vec<_>>>()
                })
                .transpose()?
                .unwrap_or_default();
            profile.set_item("similar", PyList::new(py, matches)?)?;
            match &book.sentiment {
                Some(score) => {
                    let hits = (score.positive + score.negative) as f64;
                    let entry = PyDict::new(py);
                    entry.set_item(
                        "score",
                        round2((score.positive as f64 - score.negative as f64) / hits),
                    )?;
                    entry.set_item("positive", score.positive)?;
                    entry.set_item("negative", score.negative)?;
                    let trend: Vec<Py<PyAny>> = score
                        .trend
                        .iter()
                        .map(|value| match value {
                            Some(number) => (*number).into_py_any(py),
                            None => Ok(py.None()),
                        })
                        .collect::<PyResult<_>>()?;
                    entry.set_item("trend", PyList::new(py, trend)?)?;
                    let emotions: Vec<Py<PyAny>> = score
                        .emotions
                        .iter()
                        .map(|&(name, count)| {
                            PyList::new(py, [name.into_py_any(py)?, count.into_py_any(py)?])
                                .map(|list| list.into_any().unbind())
                        })
                        .collect::<PyResult<_>>()?;
                    entry.set_item("emotions", PyList::new(py, emotions)?)?;
                    profile.set_item("sentiment", entry)?;
                }
                None => profile.set_item("sentiment", py.None())?,
            }
            profiles.set_item(*book_id, profile)?;
        }
        Ok(profiles.unbind())
    }

    pub fn author_text(&self, py: Python<'_>) -> PyResult<Py<PyDict>> {
        let documents = self.lengths.len();
        let mut members: FxHashMap<i64, Vec<&BookCounts>> = FxHashMap::default();
        let mut order: Vec<i64> = Vec::new();
        for (_, book) in &self.books {
            for author_id in &book.authors {
                members
                    .entry(*author_id)
                    .or_insert_with(|| {
                        order.push(*author_id);
                        Vec::new()
                    })
                    .push(book);
            }
        }
        let profiles = PyDict::new(py);
        for author_id in order {
            let books = &members[&author_id];
            let name = self
                .author_names
                .get(&author_id)
                .map(String::as_str)
                .unwrap_or("");
            if books.len() < AUTHOR_MIN_BOOKS
                || AUTHOR_PLACEHOLDERS.contains(name.trim().to_lowercase().as_str())
            {
                continue;
            }
            let mut counts: FxHashMap<u32, u64> = FxHashMap::default();
            let mut used: FxHashMap<u32, u32> = FxHashMap::default();
            for book in books {
                for &(word, count) in &book.candidates {
                    *counts.entry(word).or_insert(0) += u64::from(count);
                    *used.entry(word).or_insert(0) += 1;
                }
            }
            let own_name: FxHashSet<String> = lower_tokens(name).into_iter().collect();
            let minimum =
                f64::from(AUTHOR_WORD_MIN_BOOKS).max(AUTHOR_WORD_MIN_SHARE * books.len() as f64);
            let mut ranked: Vec<(f64, u32)> = counts
                .iter()
                .filter(|(word, _)| {
                    f64::from(used[word]) >= minimum && !own_name.contains(self.word(**word))
                })
                .map(|(&word, &count)| {
                    let frequency = f64::from(self.document_frequency[word as usize]);
                    (count as f64 * (documents as f64 / frequency).ln(), word)
                })
                .collect();
            ranked.sort_by(|a, b| {
                b.0.partial_cmp(&a.0)
                    .unwrap_or(Ordering::Equal)
                    .then_with(|| self.word(b.1).cmp(self.word(a.1)))
            });
            ranked.truncate(AUTHOR_WORDS);
            if ranked.len() < AUTHOR_WORDS_MIN_SHOWN {
                continue;
            }
            let cloud: Vec<Py<PyAny>> = ranked
                .iter()
                .map(|&(_, word)| {
                    PyList::new(
                        py,
                        [
                            self.word(word).into_py_any(py)?,
                            counts[&word].into_py_any(py)?,
                            used[&word].into_py_any(py)?,
                        ],
                    )
                    .map(|list| list.into_any().unbind())
                })
                .collect::<PyResult<_>>()?;
            let profile = PyDict::new(py);
            profile.set_item("books", books.len())?;
            profile.set_item("cloud", PyList::new(py, cloud)?)?;
            profiles.set_item(author_id, profile)?;
        }
        Ok(profiles.unbind())
    }

    /// Documents successfully added; what `rebuild_corpus` reports back to the task.
    pub fn document_count(&self) -> usize {
        self.lengths.len()
    }

    pub fn result(&self, py: Python<'_>) -> PyResult<Option<Py<PyDict>>> {
        if self.lengths.is_empty() {
            return Ok(None);
        }
        let total: u64 = self.lengths.iter().sum();
        let vocabulary = self.vocab.len() as u64;
        let hapax = self.word_counts.iter().filter(|&&count| count == 1).count() as u64;
        let mut sorted_lengths = self.lengths.clone();
        sorted_lengths.sort_unstable();

        let mut bin_rows: Vec<Py<PyAny>> = Vec::new();
        let mut bounds: Vec<u64> = vec![0];
        bounds.extend(LENGTH_BIN_EDGES);
        for (index, &lower) in bounds.iter().enumerate() {
            let upper = LENGTH_BIN_EDGES.get(index).copied();
            let count = self
                .lengths
                .iter()
                .filter(|&&length| length >= lower && upper.is_none_or(|limit| length < limit))
                .count();
            let upper = match upper {
                Some(limit) => limit.into_py_any(py)?,
                None => py.None(),
            };
            bin_rows.push(
                PyList::new(py, [lower.into_py_any(py)?, upper, count.into_py_any(py)?])?
                    .into_any()
                    .unbind(),
            );
        }

        let mut cloud: Vec<(u64, u32)> = self
            .vocab
            .iter()
            .enumerate()
            .filter(|(_, word)| word.chars >= CLOUD_MIN_LENGTH && !word.is_stop)
            .map(|(id, _)| (self.word_counts[id], id as u32))
            .collect();
        cloud.sort_by(|a, b| {
            b.0.cmp(&a.0)
                .then_with(|| self.word(b.1).cmp(self.word(a.1)))
        });
        cloud.truncate(CLOUD_WORDS);

        let mut frequent: Vec<u32> = (0..self.vocab.len() as u32).collect();
        frequent.sort_by(|&a, &b| {
            self.word_counts[b as usize]
                .cmp(&self.word_counts[a as usize])
                .then(a.cmp(&b))
        });
        frequent.truncate(CORPUS_WORDS);

        let result = PyDict::new(py);
        result.set_item("books", self.lengths.len())?;
        result.set_item("approximate_ngrams", self.approximate)?;

        let basic = PyDict::new(py);
        basic.set_item("tokens", total)?;
        basic.set_item("unique_tokens", vocabulary)?;
        basic.set_item("sentences", self.sentences)?;
        basic.set_item("paragraphs", self.paragraphs)?;
        basic.set_item("characters", self.characters)?;
        result.set_item("basic", basic)?;

        let by_format = PyDict::new(py);
        for (name, books, tokens) in &self.by_format {
            let entry = PyDict::new(py);
            entry.set_item("books", *books)?;
            entry.set_item("tokens", *tokens)?;
            by_format.set_item(name, entry)?;
        }
        result.set_item("by_format", by_format)?;

        let lengths = PyDict::new(py);
        lengths.set_item("min", sorted_lengths[0])?;
        match median(&sorted_lengths) {
            Median::Int(value) => lengths.set_item("median", value)?,
            Median::Float(value) => lengths.set_item("median", value)?,
        }
        lengths.set_item("mean", total as f64 / self.lengths.len() as f64)?;
        lengths.set_item("max", sorted_lengths[sorted_lengths.len() - 1])?;
        lengths.set_item("bins", PyList::new(py, bin_rows)?)?;
        result.set_item("lengths", lengths)?;

        let lexical = PyDict::new(py);
        lexical.set_item("hapax", hapax)?;
        lexical.set_item("hapax_ratio", hapax as f64 / vocabulary as f64)?;
        match median_of_floats(self.mtlds.clone()) {
            Some(value) => lexical.set_item("mtld_median", value)?,
            None => lexical.set_item("mtld_median", py.None())?,
        }
        lexical.set_item("mtld_books", self.mtlds.len())?;
        result.set_item("lexical", lexical)?;

        let ngram_rows = |table: &GramTable| -> PyResult<Py<PyList>> {
            let rows: Vec<Py<PyAny>> = table
                .most_common(CORPUS_NGRAMS * 4)
                .into_iter()
                .filter(|(_, count)| *count >= MIN_NGRAM_COUNT)
                .take(CORPUS_NGRAMS)
                .map(|(gram, count)| {
                    PyList::new(
                        py,
                        [
                            self.gram_text(&gram).into_py_any(py)?,
                            count.into_py_any(py)?,
                        ],
                    )
                    .map(|list| list.into_any().unbind())
                })
                .collect::<PyResult<_>>()?;
            Ok(PyList::new(py, rows)?.unbind())
        };
        let ngrams = PyDict::new(py);
        ngrams.set_item("bigrams", ngram_rows(&self.bigrams)?)?;
        ngrams.set_item("trigrams", ngram_rows(&self.trigrams)?)?;
        result.set_item("ngrams", ngrams)?;

        let cloud_rows: Vec<Py<PyAny>> = cloud
            .iter()
            .map(|&(count, word)| {
                PyList::new(
                    py,
                    [
                        self.word(word).into_py_any(py)?,
                        count.into_py_any(py)?,
                        self.document_frequency[word as usize].into_py_any(py)?,
                    ],
                )
                .map(|list| list.into_any().unbind())
            })
            .collect::<PyResult<_>>()?;
        result.set_item("cloud", PyList::new(py, cloud_rows)?)?;

        let frequency_rows: Vec<Py<PyAny>> = frequent
            .iter()
            .map(|&word| {
                let count = self.word_counts[word as usize];
                PyList::new(
                    py,
                    [
                        self.word(word).into_py_any(py)?,
                        count.into_py_any(py)?,
                        (count as f64 / total as f64).into_py_any(py)?,
                        self.document_frequency[word as usize].into_py_any(py)?,
                    ],
                )
                .map(|list| list.into_any().unbind())
            })
            .collect::<PyResult<_>>()?;
        result.set_item("frequency", PyList::new(py, frequency_rows)?)?;
        Ok(Some(result.unbind()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn builder() -> Builder {
        Builder::new(
            ["dan", "yang"].into_iter().map(Box::from).collect(),
            SentimentConfig {
                positive: vec!["baik".into()],
                negative: vec!["buruk".into()],
                negators: vec!["tidak".into()],
                boosters: vec!["sangat".into()],
                contrasts: vec!["tetapi".into()],
                partitive_heads: vec!["salah".into()],
                partitive_tails: vec!["satu".into()],
                emotions: Default::default(),
            },
            LanguageWords {
                ind: vec!["dan".into(), "yang".into()],
                eng: vec!["the".into()],
            },
        )
    }

    fn documents() -> Vec<BatchDocument> {
        let texts = [
            "<p>Pembangunan nasional yang baik dan sangat baik.</p><p>Tetapi hasilnya tidak baik, buruk sekali.</p>",
            "<p>Nasio-\nnal dan mengu- mumkan hasil pembangunan nasional dan sosial.</p>",
            "<p>The quick brown fox jumps over the lazy dog.</p>",
            "<p></p>",
            "<p>Pembangunan nasional yang baik dan hasil pembangunan nasional.</p>",
        ];
        texts
            .iter()
            .enumerate()
            .map(|(index, text)| BatchDocument {
                markup: (*text).to_string(),
                book_format: if index % 2 == 0 { "EPUB" } else { "PDF" }.to_string(),
                book_id: Some(index as i64 + 1),
                authors: vec![(7, "Penulis".to_string())],
                languages: vec!["ind".to_string()],
            })
            .collect()
    }

    /// `add_many` tokenizes on several threads but must leave the builder exactly as a serial `add` loop would: the
    /// vocabulary order, every counter and the n-gram tables depend on documents being counted in input order.
    #[test]
    fn add_many_equals_a_serial_add_loop() {
        let documents = documents();
        let mut serial = builder();
        let serial_flags: Vec<bool> = documents
            .iter()
            .map(|d| {
                serial.add(
                    &d.markup,
                    &d.book_format,
                    d.book_id,
                    &d.authors,
                    &d.languages,
                )
            })
            .collect();
        let mut batched = builder();
        let batched_flags = batched.add_many(&documents);

        assert_eq!(serial_flags, batched_flags);
        assert_eq!(serial_flags, vec![true, true, true, false, true]);
        let words =
            |b: &Builder| -> Vec<String> { b.vocab.iter().map(|w| w.text.to_string()).collect() };
        assert_eq!(words(&serial), words(&batched));
        assert_eq!(serial.word_counts, batched.word_counts);
        assert_eq!(serial.document_frequency, batched.document_frequency);
        assert_eq!(serial.lengths, batched.lengths);
        assert_eq!(serial.sentences, batched.sentences);
        assert_eq!(serial.paragraphs, batched.paragraphs);
        assert_eq!(serial.characters, batched.characters);
        assert_eq!(serial.bigrams.len(), batched.bigrams.len());
        assert_eq!(serial.trigrams.len(), batched.trigrams.len());
        assert_eq!(serial.books.len(), batched.books.len());
        assert_eq!(serial.document_count(), 4);
        assert_eq!(batched.document_count(), 4);
    }

    #[test]
    fn a_reduplicated_word_scores_as_its_base() {
        let sets = SentimentSets::new(
            SentimentConfig {
                positive: vec!["baik".into()],
                negative: vec!["buruk".into()],
                negators: Vec::new(),
                boosters: Vec::new(),
                contrasts: Vec::new(),
                partitive_heads: Vec::new(),
                partitive_tails: Vec::new(),
                emotions: Default::default(),
            },
            LanguageWords {
                ind: Vec::new(),
                eng: Vec::new(),
            },
        );
        assert_eq!(sets.word("buruk-buruk").sign, -1);
        assert_eq!(sets.word("baik-baik").sign, 1);
        // Two different words are not a reduplication.
        assert_eq!(sets.word("baik-buruk").sign, 0);
    }
}
