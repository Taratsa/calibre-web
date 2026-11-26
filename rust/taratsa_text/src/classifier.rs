//! Sentence-level sentiment with a multilingual transformer (ModernBERT, `Horizon-Labs/multilingual-sentiment-small`,
//! Apache-2.0; weights SHA-256 `f0d0b6d2958f2f0a017ec060bb4768bfa720ef67625486ef02710c6484d02dd1`).
//!
//! Kept beside the lexicon score, not instead of it. The lexicon is a bag of words with VADER's rules and cannot see
//! context ("salah satu", `perang` in a history book); the transformer reads whole sentences, works for any of the
//! library's languages (English included, which the Indonesian lexicon cannot) and degrades only a little on old
//! spelling. Measured on 400 human-labelled NusaX sentences: 81.8 macro-F1 Indonesian and 82.6 English for the
//! transformer, against 57.6 and 14.1 for the lexicon; on Indonesian rewritten to Van Ophuijsen spelling 76.2 vs 43.7.
//! It calls 60-80% of book sentences neutral, so a book's tone is the mean polarity of a sentence SAMPLE (uniform over
//! sentences, chosen deterministically per book so a rerun keeps the same sample), not a count of opinionated words.
//! Calibration across the corpus and the per-book JSON live in `cps/sentiment.py`.

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};

use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::modernbert::{Config, ModernBertForSequenceClassification};
use tokenizers::{PaddingParams, Tokenizer, TruncationParams};

use crate::orthography::{self, Spelling};

/// Sentences per forward pass: short enough to keep a padded batch cheap.
const BATCH: usize = 16;
/// Tokenizer cap per sentence (the model card's recommendation).
const MAX_TOKENS: usize = 256;
/// Index of the model's `positive` label in its `label2id`; negative is 0 and neutral 1.
const POSITIVE: usize = 2;

static MODEL_PATH: LazyLock<Mutex<Option<PathBuf>>> = LazyLock::new(|| Mutex::new(None));

/// Point the classifier at a model directory (holding `model.safetensors`, `tokenizer.json`, `config.json`).
pub fn configure(directory: &str) {
    *MODEL_PATH.lock().expect("model path lock") = Some(PathBuf::from(directory));
}

struct Loaded {
    model: ModernBertForSequenceClassification,
    tokenizer: Tokenizer,
    device: Device,
}

thread_local! {
    /// One model per rayon worker: loading costs seconds and each worker keeps its copy for its lifetime.
    static MODEL: std::cell::RefCell<Option<Loaded>> = const { std::cell::RefCell::new(None) };
}

fn load() -> Result<Loaded, String> {
    let directory = MODEL_PATH
        .lock()
        .expect("model path lock")
        .clone()
        .ok_or_else(|| "sentiment model directory not configured".to_string())?;
    let read = |name: &str| {
        std::fs::read_to_string(directory.join(name)).map_err(|error| format!("{}: {error}", name))
    };
    let mut config_json: serde_json::Value =
        serde_json::from_str(&read("config.json")?).map_err(|error| error.to_string())?;
    // candle reads the rope thetas as flat fields; Hugging Face nests them per attention type.
    if let Some(rope) = config_json.get("rope_parameters").cloned() {
        config_json["global_rope_theta"] = rope["full_attention"]["rope_theta"].clone();
        config_json["local_rope_theta"] = rope["sliding_attention"]["rope_theta"].clone();
    }
    // Hugging Face writes `label2id` values as numbers; candle's classifier config wants strings.
    if let Some(labels) = config_json
        .get("label2id")
        .and_then(|value| value.as_object())
        .cloned()
    {
        let labels = labels
            .into_iter()
            .map(|(label, index)| (label, serde_json::Value::String(index.to_string())))
            .collect();
        config_json["label2id"] = serde_json::Value::Object(labels);
    }
    let config: Config =
        serde_json::from_value(config_json).map_err(|error| format!("config.json: {error}"))?;
    let device = Device::Cpu;
    let weights = directory.join("model.safetensors");
    // SAFETY: the weights file is not modified while the process runs.
    let vb = unsafe {
        VarBuilder::from_mmaped_safetensors(std::slice::from_ref(&weights), DType::F32, &device)
    }
    .map_err(|error| format!("model.safetensors: {error}"))?;
    let model = ModernBertForSequenceClassification::load(vb, &config)
        .map_err(|error| error.to_string())?;
    let mut tokenizer = Tokenizer::from_file(directory.join("tokenizer.json"))
        .map_err(|error| error.to_string())?;
    tokenizer
        .with_truncation(Some(TruncationParams {
            max_length: MAX_TOKENS,
            ..Default::default()
        }))
        .map_err(|error| error.to_string())?;
    tokenizer.with_padding(Some(PaddingParams {
        pad_id: 0,
        ..Default::default()
    }));
    Ok(Loaded {
        model,
        tokenizer,
        device,
    })
}

/// Probabilities `[negative, neutral, positive]` for each text, in order. Starts the model on first use.
pub fn probabilities(texts: &[String]) -> Result<Vec<[f32; 3]>, String> {
    MODEL.with(|cell| {
        let mut slot = cell.borrow_mut();
        if slot.is_none() {
            *slot = Some(load()?);
        }
        let loaded = slot.as_mut().expect("model loaded");
        let mut out = Vec::with_capacity(texts.len());
        for chunk in texts.chunks(BATCH) {
            let encoded = loaded
                .tokenizer
                .encode_batch(chunk.to_vec(), true)
                .map_err(|error| error.to_string())?;
            let (rows, len) = (encoded.len(), encoded[0].get_ids().len());
            let ids: Vec<u32> = encoded.iter().flat_map(|e| e.get_ids().to_vec()).collect();
            let mask: Vec<u32> = encoded
                .iter()
                .flat_map(|e| e.get_attention_mask().to_vec())
                .collect();
            let ids = Tensor::from_vec(ids, (rows, len), &loaded.device)
                .map_err(|error| error.to_string())?;
            let mask = Tensor::from_vec(mask, (rows, len), &loaded.device)
                .map_err(|error| error.to_string())?;
            // The classifier returns softmax probabilities, not logits.
            let probs = loaded
                .model
                .forward(&ids, &mask)
                .map_err(|error| error.to_string())?
                .to_vec2::<f32>()
                .map_err(|error| error.to_string())?;
            for row in probs {
                out.push([row[0], row[1], row[POSITIVE]]);
            }
        }
        Ok(out)
    })
}

/// `[negative, neutral, positive]` probabilities for many texts at once.
///
/// Sequential on purpose: throughput is flat from 1 to 4 threads (measured ~6 sentences/s), because each rayon worker
/// keeps its own copy of the model, and 562 MB per worker would not fit in the container's memory anyway. One model,
/// one thread, no contention.
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
