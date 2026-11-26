//! Shared ONNX Runtime classifier: an int8 ONNX file, its tokenizer, batching by length, softmax-free logits.
//!
//! Used by the sentence-tone model (`classifier.rs`) and the two emotion models (`emotions.rs`). Replaced candle after
//! measuring: the same ModernBERT sentence model ran at 3.9-6.0 sentences/s on candle fp32 and 23.4/s on ONNX Runtime
//! int8 (4 threads), with 99.0% label agreement on 96 book sentences; the emotion models run 2.3-2.6x faster for a
//! 0.3-1.0 macro-F1 loss (Indonesian EmoT 72.1 -> 71.8, English GoEmotions 75.4 -> 74.4).
//!
//! ONNX Runtime itself is loaded at run time from `ORT_DYLIB_PATH` (the `ort` crate's `load-dynamic` mode), so the
//! crate builds without downloading a binary; the Docker image ships the library from the `onnxruntime` wheel.

use std::path::Path;
use std::sync::LazyLock;

use ort::environment::Environment;
use ort::session::{Session, builder::GraphOptimizationLevel};
use ort::value::Tensor;
use tokenizers::{PaddingParams, Tokenizer, TruncationParams};

/// Sentences per forward pass. Sorted by length first, so a batch is padded to a similar length.
const BATCH: usize = 16;

/// The process-wide ONNX Runtime environment, created on first use from `ORT_DYLIB_PATH` (the path of
/// `libonnxruntime.so`). A failure is kept and reported by every caller instead of being retried.
static ENVIRONMENT: LazyLock<Result<Environment, String>> = LazyLock::new(|| {
    let library = std::env::var("ORT_DYLIB_PATH")
        .map_err(|_| "ORT_DYLIB_PATH is not set (path of libonnxruntime.so)".to_string())?;
    ort::init_from(&library)
        .map_err(|error| format!("{library}: {error}"))?
        .build()
        .map_err(|error| error.to_string())
});

/// Intra-op threads: `SENTIMENT_THREADS` (default 4). The web loop shares the machine, so this stays well under the
/// core count.
fn threads() -> usize {
    std::env::var("SENTIMENT_THREADS")
        .ok()
        .and_then(|value| value.parse().ok())
        .filter(|&value| value > 0)
        .unwrap_or(4)
}

fn environment() -> Result<&'static Environment, String> {
    ENVIRONMENT.as_ref().map_err(Clone::clone)
}

pub struct OnnxClassifier {
    session: Session,
    tokenizer: Tokenizer,
}

impl OnnxClassifier {
    /// Load `<directory>/<model_file>` and `<directory>/tokenizer.json`; `pad_id` and `max_tokens` shape the batches.
    /// `model_file` may name a subdirectory (`onnx/model_quantized.onnx`); the tokenizer stays beside `config.json`.
    pub fn load(
        directory: &Path,
        model_file: &str,
        pad_id: u32,
        max_tokens: usize,
    ) -> Result<Self, String> {
        let environment = environment()?;
        let session = Session::builder(environment)
            .map_err(|error| error.to_string())?
            .with_optimization_level(GraphOptimizationLevel::Level3)
            .map_err(|error| error.to_string())?
            .with_intra_threads(threads())
            .map_err(|error| error.to_string())?
            .commit_from_file(directory.join(model_file))
            .map_err(|error| format!("{model_file}: {error}"))?;
        let mut tokenizer = Tokenizer::from_file(directory.join("tokenizer.json"))
            .map_err(|error| error.to_string())?;
        tokenizer
            .with_truncation(Some(TruncationParams {
                max_length: max_tokens,
                ..Default::default()
            }))
            .map_err(|error| error.to_string())?;
        tokenizer.with_padding(Some(PaddingParams {
            pad_id,
            ..Default::default()
        }));
        Ok(Self { session, tokenizer })
    }

    /// Raw logits per text, in the caller's order. The model's classes are the columns.
    ///
    /// Texts are sorted by length before batching: a padded batch costs its longest member for every row, so mixing
    /// 20-character and 300-character sentences made most rows pay for padding.
    pub fn logits(&mut self, texts: &[String]) -> Result<Vec<Vec<f32>>, String> {
        let mut order: Vec<usize> = (0..texts.len()).collect();
        order.sort_by_key(|&index| texts[index].len());
        let mut out: Vec<Vec<f32>> = vec![Vec::new(); texts.len()];
        for chunk in order.chunks(BATCH) {
            let batch: Vec<String> = chunk.iter().map(|&index| texts[index].clone()).collect();
            let encoded = self
                .tokenizer
                .encode_batch(batch, true)
                .map_err(|error| error.to_string())?;
            let (rows, len) = (encoded.len(), encoded[0].get_ids().len());
            let ids: Vec<i64> = encoded
                .iter()
                .flat_map(|e| e.get_ids().iter().map(|&value| i64::from(value)))
                .collect();
            let mask: Vec<i64> = encoded
                .iter()
                .flat_map(|e| e.get_attention_mask().iter().map(|&value| i64::from(value)))
                .collect();
            let outputs = self
                .session
                .run(ort::inputs![
                    "input_ids" => Tensor::from_array(([rows, len], ids)).map_err(|error| error.to_string())?,
                    "attention_mask" => Tensor::from_array(([rows, len], mask)).map_err(|error| error.to_string())?,
                ])
                .map_err(|error| error.to_string())?;
            let (shape, values) = outputs[0]
                .try_extract_tensor::<f32>()
                .map_err(|error| error.to_string())?;
            let classes = shape.last().copied().unwrap_or(0).max(0) as usize;
            if classes == 0 || values.len() != rows * classes {
                return Err(format!("unexpected logits shape {shape:?} for {rows} rows"));
            }
            for (row, &slot) in chunk.iter().enumerate() {
                out[slot] = values[row * classes..(row + 1) * classes].to_vec();
            }
        }
        Ok(out)
    }
}

/// Softmax of one logits row.
pub fn softmax(logits: &[f32]) -> Vec<f32> {
    let max = logits.iter().cloned().fold(f32::MIN, f32::max);
    let exp: Vec<f32> = logits.iter().map(|value| (value - max).exp()).collect();
    let sum: f32 = exp.iter().sum();
    exp.iter().map(|value| value / sum).collect()
}

#[cfg(test)]
mod tests {
    use super::softmax;

    #[test]
    fn softmax_sums_to_one_and_keeps_order() {
        let probs = softmax(&[1.0, 3.0, 2.0]);
        assert!((probs.iter().sum::<f32>() - 1.0).abs() < 1e-6);
        assert!(probs[1] > probs[2] && probs[2] > probs[0]);
    }

    #[test]
    fn softmax_survives_large_logits() {
        let probs = softmax(&[1000.0, 1000.0]);
        assert!((probs[0] - 0.5).abs() < 1e-6);
    }
}
