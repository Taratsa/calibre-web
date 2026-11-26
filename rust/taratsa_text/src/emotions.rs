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
//! candle has no `roberta` model, but RoBERTa and XLM-R are the same architecture (same `roberta.*` weight names, same
//! classification head), so these load through `models::xlm_roberta`. Checked against PyTorch on 96 EmoT sentences:
//! 100% label agreement.

use std::cell::RefCell;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};

use candle_core::{DType, Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::xlm_roberta::{Config, XLMRobertaForSequenceClassification};
use tokenizers::{PaddingParams, Tokenizer, TruncationParams};

/// Sentences per forward pass.
const BATCH: usize = 16;
/// Tokenizer cap per sentence: the emotion datasets are short texts and 128 tokens covers them.
const MAX_TOKENS: usize = 128;

static PATHS: LazyLock<Mutex<HashMap<String, PathBuf>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Language key ("id", "en") -> model directory holding `model.safetensors`, `tokenizer.json`, `config.json`.
pub fn configure(language: &str, directory: &str) {
    PATHS
        .lock()
        .expect("emotion path lock")
        .insert(language.to_string(), PathBuf::from(directory));
}

struct Loaded {
    model: XLMRobertaForSequenceClassification,
    tokenizer: Tokenizer,
    device: Device,
    labels: Vec<String>,
    pad_id: u32,
}

thread_local! {
    /// One copy per language and thread: a model load costs seconds and the weights are 480 MB.
    static MODELS: RefCell<HashMap<String, Loaded>> = RefCell::new(HashMap::new());
}

fn load(language: &str) -> Result<Loaded, String> {
    let directory = PATHS
        .lock()
        .expect("emotion path lock")
        .get(language)
        .cloned()
        .ok_or_else(|| format!("emotion model for '{language}' not configured"))?;
    let read = |name: &str| {
        std::fs::read_to_string(directory.join(name)).map_err(|error| format!("{name}: {error}"))
    };
    let mut json: serde_json::Value =
        serde_json::from_str(&read("config.json")?).map_err(|error| error.to_string())?;
    // RoBERTa configs do not spell out the position embedding type; the XLM-R config requires it.
    json["position_embedding_type"] = serde_json::Value::String("absolute".to_string());
    let labels: Vec<String> = json
        .get("id2label")
        .and_then(|value| value.as_object())
        .map(|map| {
            let mut pairs: Vec<(i64, String)> = map
                .iter()
                .map(|(index, label)| {
                    (
                        index.parse().unwrap_or_default(),
                        label.as_str().unwrap_or_default().to_string(),
                    )
                })
                .collect();
            pairs.sort_by_key(|pair| pair.0);
            pairs.into_iter().map(|pair| pair.1).collect()
        })
        .unwrap_or_default();
    let config: Config =
        serde_json::from_value(json).map_err(|error| format!("config.json: {error}"))?;
    let device = Device::Cpu;
    let weights = directory.join("model.safetensors");
    // SAFETY: the weights file is not modified while the process runs.
    let vb = unsafe {
        VarBuilder::from_mmaped_safetensors(std::slice::from_ref(&weights), DType::F32, &device)
    }
    .map_err(|error| format!("model.safetensors: {error}"))?;
    let model = XLMRobertaForSequenceClassification::new(labels.len(), &config, vb)
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
        pad_id: config.pad_token_id,
        ..Default::default()
    }));
    Ok(Loaded {
        model,
        tokenizer,
        device,
        labels,
        pad_id: config.pad_token_id,
    })
}

/// The most likely emotion label of each text, in order, for a configured language ("id" or "en").
pub fn labels(texts: &[String], language: &str) -> Result<Vec<String>, String> {
    MODELS.with(|cell| {
        let mut models = cell.borrow_mut();
        if !models.contains_key(language) {
            models.insert(language.to_string(), load(language)?);
        }
        let loaded = models.get(language).expect("model loaded");
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
            let types: Vec<u32> = vec![0; ids.len()];
            let tensor = |values: Vec<u32>| {
                Tensor::from_vec(values, (rows, len), &loaded.device)
                    .map_err(|error| error.to_string())
            };
            let logits = loaded
                .model
                .forward(&tensor(ids)?, &tensor(mask)?, &tensor(types)?)
                .map_err(|error| error.to_string())?;
            let rows = logits.to_vec2::<f32>().map_err(|error| error.to_string())?;
            for row in rows {
                let best = row
                    .iter()
                    .enumerate()
                    .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
                    .map(|(index, _)| index)
                    .unwrap_or_default();
                out.push(
                    loaded
                        .labels
                        .get(best)
                        .cloned()
                        .unwrap_or_default()
                        .to_lowercase(),
                );
            }
        }
        let _ = loaded.pad_id;
        Ok(out)
    })
}
