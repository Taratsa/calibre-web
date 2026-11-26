# Prompt: train the 7-class Indonesian emotion model (for the GPU machine)

Paste the block below into an agent on a machine with a CUDA GPU. Context and the integration steps for the result
are in `docs/BACKLOG.md` (item "7-class Indonesian emotion model").

```text
# Task: fine-tune a 7-class Indonesian emotion classifier and hand back an int8 ONNX model

## Goal
Produce an Indonesian sentence-level emotion model with 7 classes, exported to int8 ONNX, that
beats the AUCs of the model we ship today when tested on an independent human-annotated set.
Nothing else. Do not touch any production system; build everything in a scratch directory.

## Environment
Python 3.11-3.12, a CUDA GPU, torch (CUDA build), transformers, onnx, onnxscript, onnxruntime,
pyarrow, scikit-learn, numpy. Pin and report exact versions. Suggested:
  pip install torch --index-url https://download.pytorch.org/whl/cu129
  pip install transformers==4.57.1 onnx==1.23.2 onnxscript==0.7.2 onnxruntime==1.32.0 \
              pyarrow scikit-learn==1.5.2 numpy==2.2.6
Record GPU model, driver and wall-clock time for every step.

## Training data (use exactly this)
Dataset: mahalisyarifuddin/emotweetid-ekman7  (Hugging Face, CC BY 4.0)
  2,243 human-annotated Indonesian tweets by three psychology students (majority vote, Fleiss'
  kappa reported upstream); the `anger` pool of 475 was split into anger (289) and contempt (186)
  by an automatic classifier (laya), everything else is verbatim EmoTweetID.
Use config `anger_split_balanced` (exact 8:1:1 train/valid/test, seed 0, no duplicate leakage):
  train.parquet / valid.parquet / test.parquet under anger_split_balanced/
Classes (keep this order everywhere): anger, contempt, disgust, enjoyment, fear, sadness, surprise.
Do NOT use talithaolga/Indonesian-Emotion-Classification (no licence, likely LLM-generated) nor
LorthGyu/indonesian-emotion (267 rows, partly synthetic).

## Base model
Start from `indobenchmark/indobert-base-p1`. If that fails to export or train, fall back to
`flax-community/indonesian-roberta-base` and say why you switched.

## Training recipe
- max_length 128, batch 32, lr 2e-5, 4 epochs, weight decay 0.01, warmup 10%, fp16 on GPU.
- Model selection on validation macro-F1; keep the best checkpoint.
- Seed 42 everywhere; report class balance of each split.
- Report: validation and test macro-F1, accuracy, per-class F1, and a confusion matrix.

## Independent test set (do not train on it)
Dataset: brighter-dataset/BRIGHTER-emotion-categories, config `ind`
  File: ind/test-00000-of-00001.parquet (851 texts, human, MULTI-LABEL over
  anger, disgust, fear, joy, sadness, surprise; 405 texts carry more than one label).
  Also run ind/dev-00000-of-00001.parquet (156 texts) and report both.
Mapping for evaluation: enjoyment -> joy. contempt has no BRIGHTER label; report it separately and
do not count it as a hit or a miss for top-label precision.

Metrics to report on BRIGHTER ind test:
1. Per-label AUC using the summed probability of the mapped classes:
   sadness, anger, fear, joy (= enjoyment), disgust, surprise.
2. Top-label precision: share of texts whose predicted label appears among the human labels
   (enjoyment counts as joy; contempt is excluded from both numerator and denominator).
3. Count of texts where the prediction is contempt (report the number; it is unscoreable there).

Baseline to beat (our current 5-class model, EmoT tweet model int8, same protocol):
   AUC: joy 0.82, anger 0.78, sadness 0.77, fear 0.71
   disgust and surprise: not predictable at all (no class)
   top-label precision on BRIGHTER ind test: 59% of 851
Success = higher top-label precision AND at least as good AUC on the four overlapping labels,
AND the model now ranks disgust and surprise above chance (report their AUC).

## Export (must match our runtime contract exactly)
Deliver a directory `emotion_id_v7/` containing:
  model_quantized.onnx   int8 dynamic quantization (QuantType.QInt8), opset 17,
                         inputs `input_ids` and `attention_mask` (int64), output `logits`,
                         dynamic axes: batch and sequence on both inputs, batch on logits
  tokenizer.json         Hugging Face fast tokenizer (loadable by the Rust `tokenizers` crate)
  config.json            must include id2label as string keys "0".."6" in the class order above
                         and pad_token_id
  SHA256SUMS             sha256 of the three files above
Verification you must run and report:
  - ONNX fp32 (before quantization) vs torch on 200 BRIGHTER texts: label agreement and mean |p diff|
  - int8 vs fp32 ONNX on the same 200: label agreement, mean |p diff|, and the AUC table again,
    so we can see what quantization costs
  - inference speed: sentences/second for int8 ONNX with 4 intra-op threads on CPU only
Deterministic export: run the export twice and confirm identical SHA-256.

## Also produce
- `metrics.json`: every number above, plus dataset sizes, versions, seeds, GPU, wall-clock times.
- `report.md`, at most one page: what you trained, the two test tables, quantization cost, speed,
  limitations (tweets vs book prose; contempt label is machine-split; multi-label scoring).
- `predictions_sample.csv`: 30 BRIGHTER test rows with text, human labels, predicted label,
  and the 7 probabilities.

## Constraints
- Do not upload anything to the Hub or any public endpoint; keep the weights local.
- Keep licence attribution: EmoTweetID (CC BY 4.0, Data in Brief 68:113119), BRIGHTER (CC BY 4.0).
- If training diverges or the model cannot beat the baseline, stop and report the numbers rather
  than tweaking the test set.

## Hand back
A tarball with emotion_id_v7/, metrics.json, report.md, predictions_sample.csv, and the training
script(s) plus exact command lines. Lead the reply with the two-line verdict:
"top-label precision X% vs 59% baseline; AUC joy/anger/sadness/fear = ...; disgust/surprise = ...".
```
