//! Sentence-level sentiment with a multilingual transformer (ModernBERT, `Horizon-Labs/multilingual-sentiment-small`,
//! Apache-2.0; the int8 ONNX file ships in `onnx/model_quantized.onnx`, SHA-256 pinned in the Dockerfile).
//!
//! Kept beside the lexicon score, not instead of it. The lexicon is a bag of words with VADER's rules and cannot see
//! context ("salah satu", `perang` in a history book); the transformer reads whole sentences, works for any of the
//! library's languages (English included, which the Indonesian lexicon cannot) and degrades only a little on old
//! spelling. Measured on 400 human-labelled NusaX sentences: 81.8 macro-F1 Indonesian and 82.6 English for the
//! transformer, against 57.6 and 14.1 for the lexicon; on Indonesian rewritten to Van Ophuijsen spelling 76.2 vs 43.7.
//! It calls 60-80% of book sentences neutral, so a book's tone is the mean polarity of a sentence SAMPLE (uniform over
//! sentences, chosen deterministically per book so a rerun keeps the same sample), not a count of opinionated words.
//! Calibration across the corpus and the per-book JSON live in `cps/sentiment.py`. Inference runs on ONNX Runtime
//! (`onnx.rs`), which is ~4x faster than candle's fp32 ModernBERT on the same sentences at 99.0% label agreement.

use std::cell::RefCell;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};

use crate::onnx::{OnnxClassifier, softmax};
use crate::orthography::{self, Spelling};

/// Tokenizer cap per sentence (the model card's recommendation).
const MAX_TOKENS: usize = 256;
/// The model's `<pad>` token id.
const PAD_ID: u32 = 0;
/// Index of the model's `positive` label in its `label2id`; negative is 0 and neutral 1.
const POSITIVE: usize = 2;

static MODEL_PATH: LazyLock<Mutex<Option<PathBuf>>> = LazyLock::new(|| Mutex::new(None));

/// Point the classifier at a model directory (holding `onnx/model_quantized.onnx` and `tokenizer.json`).
pub fn configure(directory: &str) {
    *MODEL_PATH.lock().expect("model path lock") = Some(PathBuf::from(directory));
}

thread_local! {
    /// One session per worker thread: loading costs a second or two and the session keeps its own thread pool.
    static MODEL: RefCell<Option<OnnxClassifier>> = const { RefCell::new(None) };
}

/// Probabilities `[negative, neutral, positive]` for each text, in order. Starts the model on first use.
pub fn probabilities(texts: &[String]) -> Result<Vec<[f32; 3]>, String> {
    MODEL.with(|cell| {
        let mut slot = cell.borrow_mut();
        if slot.is_none() {
            let directory = MODEL_PATH
                .lock()
                .expect("model path lock")
                .clone()
                .ok_or_else(|| "sentiment model directory not configured".to_string())?;
            *slot = Some(OnnxClassifier::load(
                &directory,
                "onnx/model_quantized.onnx",
                PAD_ID,
                MAX_TOKENS,
            )?);
        }
        let classifier = slot.as_mut().expect("model loaded");
        let rows = classifier.logits(texts)?;
        rows.iter()
            .map(|logits| {
                let probs = softmax(logits);
                (probs.len() == 3)
                    .then(|| [probs[0], probs[1], probs[POSITIVE]])
                    .ok_or_else(|| format!("expected 3 classes, got {}", probs.len()))
            })
            .collect()
    })
}

/// `[negative, neutral, positive]` probabilities for many texts at once.
pub fn probabilities_parallel(texts: &[String]) -> Result<Vec<[f32; 3]>, String> {
    probabilities(texts)
}

/// The mean polarity (-1..1) of a book's sampled sentences and the share of them that are not neutral.
pub fn summarize(probs: &[[f32; 3]]) -> Option<(f64, f64)> {
    if probs.is_empty() {
        return None;
    }
    let mut sum = 0.0;
    let mut decisions = 0usize;
    let mut positives = 0usize;
    for row in probs {
        sum += f64::from(row[POSITIVE] - row[0]);
        if row[POSITIVE].max(row[0]) >= row[1] {
            decisions += 1;
            positives += usize::from(row[POSITIVE] > row[0]);
        }
    }
    let mean = sum / probs.len() as f64;
    let share = if decisions == 0 {
        0.0
    } else {
        positives as f64 / decisions as f64
    };
    Some((mean, share))
}

/// Uniform random sample of a book's sentences (`limit` of them), in their normalised (modern-spelling) form.
///
/// Keeps the `limit` sentences with the smallest hash of `(book id, sentence index)`: a reservoir whose choice does
/// not depend on sentence order and is identical on every run, so a resumed or repeated job scores the same sample.
pub fn sample_sentences(markup: &str, book_id: i64, limit: usize) -> Vec<String> {
    let blocks = crate::text::html_to_blocks(markup);
    let text = blocks.join("\n");
    let spelling = orthography::detect(&text);
    let mut kept: Vec<(u64, String)> = Vec::with_capacity(limit + 1);
    for (index, sentence) in blocks
        .iter()
        .flat_map(|block| crate::text::split_sentences(block))
        .enumerate()
    {
        let length = sentence.chars().count();
        if !(40..=600).contains(&length) {
            continue;
        }
        let mut hasher = DefaultHasher::new();
        book_id.hash(&mut hasher);
        index.hash(&mut hasher);
        let key = hasher.finish();
        let at = kept.partition_point(|entry| entry.0 < key);
        kept.insert(at, (key, orthography::normalize(&sentence, spelling)));
        if kept.len() > limit {
            kept.pop();
        }
    }
    kept.into_iter().map(|entry| entry.1).collect()
}

/// The spelling system detected for a text, as a word (`modern`, `soewandi`, `van_ophuijsen`).
pub fn spelling_name(text: &str) -> &'static str {
    match orthography::detect(text) {
        Spelling::Modern => "modern",
        Spelling::Soewandi => "soewandi",
        Spelling::VanOphuijsen => "van_ophuijsen",
    }
}
