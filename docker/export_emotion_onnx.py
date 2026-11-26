"""Export a RoBERTa sequence classifier to int8 ONNX for ONNX Runtime (used by the Docker `models` stage only).

Usage: export_emotion_onnx.py <model dir with config.json + model.safetensors> <output dir>

The export is deterministic (two runs gave the same SHA-256), so the Dockerfile pins the result. Dynamic int8
quantization costs 0.3-1.0 macro-F1 on the labelled sets (Indonesian EmoT 72.1 -> 71.8, English GoEmotions 75.4 ->
74.4) for a 4x smaller file and 2.3-2.6x the speed; see AGENTS.md.
"""

import sys
from pathlib import Path

import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoModelForSequenceClassification, AutoTokenizer

source, target = Path(sys.argv[1]), Path(sys.argv[2])
target.mkdir(parents=True, exist_ok=True)
torch.set_grad_enabled(False)
tokenizer = AutoTokenizer.from_pretrained(source)
model = AutoModelForSequenceClassification.from_pretrained(source).eval()
sample = tokenizer(["contoh kalimat", "another example sentence for tracing"], padding=True, return_tensors="pt")
torch.onnx.export(
    model,
    (sample["input_ids"], sample["attention_mask"]),
    str(target / "model.onnx"),
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={"input_ids": {0: "b", 1: "s"}, "attention_mask": {0: "b", 1: "s"}, "logits": {0: "b"}},
    opset_version=17,
    dynamo=False,
)
quantize_dynamic(str(target / "model.onnx"), str(target / "model_quantized.onnx"), weight_type=QuantType.QInt8)
(target / "model.onnx").unlink()
