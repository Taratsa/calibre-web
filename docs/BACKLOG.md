# Backlog

Open work that is decided but not done. Permanent behaviour lives in `AGENTS.md`; this file is for what is pending,
why, and how to finish it. Remove an item when it ships (and move what is permanent into `AGENTS.md`).

## 7-class Indonesian emotion model (waiting on GPU training)

**Status (2026-11-26):** the training prompt is written and handed to a GPU machine; nothing is running here.
Prompt: [`docs/backlog/indonesian-emotion-7class-training-prompt.md`](backlog/indonesian-emotion-7class-training-prompt.md).

**Why:** the shipped Indonesian emotion model (`StevenLimcorn/indonesian-roberta-base-emotion-classifier`, EmoT, 5
classes: sadness, anger, love, fear, happy) cannot answer *surprise* or *disgust*. On BRIGHTER's 851 human-labelled
Indonesian texts those two labels cover 269 and 167 texts and can never be predicted. Measured against BRIGHTER
(`ind` test, int8 model): AUC joy 0.82, anger 0.78, sadness 0.77, fear 0.71; top-label precision 59%; 405 of 851 texts
carry more than one human label, so single-label precision understates it.

**Data decided on**
- Train: `mahalisyarifuddin/emotweetid-ekman7` (CC BY 4.0), config `anger_split_balanced`, 2,243 tweets, 8:1:1.
  Human labels by three psychology students (EmoTweetID, *Data in Brief* 68:113119), except that the `anger` pool
  (475) was split into anger (289) and contempt (186) by an automatic classifier, so *contempt* is machine-labelled.
- Test: `brighter-dataset/BRIGHTER-emotion-categories`, config `ind` (CC BY 4.0), 851 test + 156 dev, multi-label.
- Rejected: `talithaolga/Indonesian-Emotion-Classification` (no licence, likely LLM-generated),
  `LorthGyu/indonesian-emotion` (267 rows, partly synthetic). MALEO (`maleo-ai/maleo-emotion`,
  `dikal/maleo-emotion-annotated`) is gated and unseen: request access, judge later.
- The shipped model was picked on EmoT test, then confirmed on EmoT validation (73.4 vs 56.0 and 44.6 for the
  alternatives), so the choice stands; the 72.1 in `AGENTS.md` is test-set optimistic by about one point.

**Acceptance** (from the prompt): higher top-label precision than 59% AND at least the baseline AUC on the four shared
labels AND disgust/surprise ranked above chance on BRIGHTER. Otherwise keep the current model.

**To integrate the result** (`emotion_id_v7/`: `model_quantized.onnx`, `tokenizer.json`, `config.json`, `SHA256SUMS`)
1. Verify the SHA-256 and the report; check class order is anger, contempt, disgust, enjoyment, fear, sadness, surprise.
2. Dockerfile `models` stage: replace the `emotion_id` download+export with a pinned copy of the delivered files
   (or host them as a release asset) and update the six SHA-256 lines. Remove the `emotion_id` export call.
3. `rust/taratsa_text/src/emotions.rs`: PAD_ID depends on the base model (RoBERTa 1, BERT 0): read `pad_token_id` from
   `config.json` instead of the constant.
4. Page labels (`frontend/src/pages/book/[id]/index.astro`, `emotionNames`): add `enjoyment` -> "Senang" (`contempt`,
   `disgust`, `surprise` already map to Meremehkan, Jijik, Terkejut).
5. Bump `SENTENCE_TONE_VERSION` in `cps/sentiment.py`, rebuild the image, recreate Flask, restart the pass
   (about 22 hours), then `./build-frontend.sh`.
6. Update `AGENTS.md` (model, numbers, attribution for EmoTweetID and BRIGHTER) and re-check the dominant-label rule
   in `dominant_emotions` (more classes make a >50% top label rarer).

**Time:** GPU fine-tune is minutes to an hour; on this CPU box it would have been about 4-7 hours, which is why it
moved to the GPU machine. Integration here is about 40 minutes plus the pass restart.

## Related open items

- **Sentence-tone pass is running** (started 2026-11-26 17:3x, about 22 hours at ~970 books/hour, tone version 5).
  Nothing is published beyond the pages already deployed: when it finishes, run `./build-frontend.sh`, then commit
  `frontend/src/data` separately and push.
- **Unpushed commits** on `taratsa`: tone version 4 and 5 (`ecc57bf94`, `3e5bd2f15`) and two video commits from
  another session.
- **Pin model files to a commit hash** instead of `main` in the Dockerfile `models` stage (SHA-256 already makes a
  moved file fail the build, but a hash makes the failure reproducible).
- **`ort` is `2.0.0-rc.15`** (release candidate): re-check for a stable 2.0 before the next dependency review.
- **Label bands** ("cenderung positif/negatif" at +-0.25) and the lexicon emotion skew (sadness leads) need
  re-checking once the whole library is scored; today 185 of the first 224 books read "berimbang".
- **Book-level accuracy is unmeasured:** all numbers come from tweets and reviews. A hand-labelled sample of about 100
  sentences from this library would settle it.
- **Methods note** on the book page linking Kim and Klinger (2018), Reagan et al. (2016) and Bizzoni and Feldkamp
  (2023): offered, not done.
