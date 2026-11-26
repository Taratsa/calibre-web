//! Per-sentence emotion labels, the model counterpart of the lexicon's "Emosi dominan".
//!
//! Two RoBERTa checkpoints, both MIT, chosen by measuring them on human-labelled data (coarse 5-way mapping):
//! - Indonesian: `StevenLimcorn/indonesian-roberta-base-emotion-classifier` (EmoT, 5 labels), 72.1 macro-F1 on the
//!   EmoT test set. The alternatives scored 59.4 (XLM-R `tabularisai/multilingual-emotion-classification`) and 46.3
//!   (`Aardiiiiy/EmoSense-ID`).
//! - English: `SamLowe/roberta-base-go_emotions` (GoEmotions, 28 labels), 79.1 macro-F1 on the single-label GoEmotions
//!   test set; the multilingual model scored 43.6 there.
//!
//! One multilingual model was tried first and lost 13-36 F1 points, so each language gets its own checkpoint.
//!
//! Each checkpoint was exported to ONNX and dynamically quantized to int8 (125 MB instead of 480 MB), then measured
//! again: Indonesian 72.1 -> 71.8 macro-F1, English 75.4 -> 74.4 (800 sentences), at 2.3-2.6x the speed. They run on
//! ONNX Runtime through `onnx.rs`, like the sentiment model.

use std::cell::RefCell;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};

use crate::onnx::OnnxClassifier;

/// Tokenizer cap per sentence: the emotion datasets are short texts and 128 tokens covers them.
const MAX_TOKENS: usize = 128;
/// RoBERTa's `<pad>` token id.
const PAD_ID: u32 = 1;

static PATHS: LazyLock<Mutex<HashMap<String, PathBuf>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Language key ("id", "en") -> model directory holding `model_quantized.onnx`, `tokenizer.json`, `config.json`.
pub fn configure(language: &str, directory: &str) {
    PATHS
        .lock()
        .expect("emotion path lock")
        .insert(language.to_string(), PathBuf::from(directory));
}

struct Loaded {
    classifier: OnnxClassifier,
    labels: Vec<String>,
}

thread_local! {
    /// One session per language and thread: a load costs a second and the int8 weights are 125 MB.
    static MODELS: RefCell<HashMap<String, Loaded>> = RefCell::new(HashMap::new());
}

fn load(language: &str) -> Result<Loaded, String> {
    let directory = PATHS
        .lock()
        .expect("emotion path lock")
        .get(language)
        .cloned()
        .ok_or_else(|| format!("emotion model for '{language}' not configured"))?;
    let config = std::fs::read_to_string(directory.join("config.json"))
        .map_err(|error| format!("config.json: {error}"))?;
    let json: serde_json::Value =
        serde_json::from_str(&config).map_err(|error| error.to_string())?;
    let mut pairs: Vec<(i64, String)> = json
        .get("id2label")
        .and_then(|value| value.as_object())
        .map(|map| {
            map.iter()
                .map(|(index, label)| {
                    (
                        index.parse().unwrap_or_default(),
                        label.as_str().unwrap_or_default().to_lowercase(),
                    )
                })
                .collect()
        })
        .unwrap_or_default();
    pairs.sort_by_key(|pair| pair.0);
    let labels: Vec<String> = pairs.into_iter().map(|pair| pair.1).collect();
    let classifier = OnnxClassifier::load(&directory, "model_quantized.onnx", PAD_ID, MAX_TOKENS)?;
    Ok(Loaded { classifier, labels })
}

/// The most likely emotion label of each text, in order, for a configured language ("id" or "en").
pub fn labels(texts: &[String], language: &str) -> Result<Vec<String>, String> {
    MODELS.with(|cell| {
        let mut models = cell.borrow_mut();
        if !models.contains_key(language) {
            models.insert(language.to_string(), load(language)?);
        }
        let loaded = models.get_mut(language).expect("model loaded");
        let rows = loaded.classifier.logits(texts)?;
        Ok(rows
            .iter()
            .map(|logits| {
                let best = logits
                    .iter()
                    .enumerate()
                    .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
                    .map(|(index, _)| index)
                    .unwrap_or_default();
                loaded.labels.get(best).cloned().unwrap_or_default()
            })
            .collect())
    })
}
