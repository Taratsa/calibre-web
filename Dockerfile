# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.15
# The export tools in the `models` stage need wheels for torch/onnxruntime, which the runtime Python does not have yet;
# that stage runs only at build time and copies plain files out, so its interpreter need not match the app's.
ARG MODELS_PYTHON_VERSION=3.12

FROM ghcr.io/linuxserver/unrar:latest AS unrar
FROM python:${PYTHON_VERSION}-slim-bookworm AS builder

ARG BUILD_DATE
ARG VERSION
ARG CALIBREWEB_RELEASE
ARG KEPUBIFY_RELEASE=v5.0.0
ARG CALIBRE_RELEASE=9.19.0
LABEL maintainer="notdriz"

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    libldap2-dev \
    libsasl2-dev \
    python3-dev \
    libxml2-dev \
    libxslt1-dev \
    libmagickwand-dev \
    pkg-config \
    cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/calibre-web
COPY requirements.txt optional-requirements.txt ./
RUN python3 -m venv /lsiopy && \
    /lsiopy/bin/pip install --no-cache-dir -U pip wheel && \
    /lsiopy/bin/pip install --no-cache-dir \
      --find-links https://wheel-index.linuxserver.io/ubuntu/ \
      -r requirements.txt -r optional-requirements.txt

# Corpus text analysis (`cps/text_analysis.py`) is a PyO3 extension; building it in the same stage as the venv keeps
# the wheel on the venv's interpreter ABI. The runtime stage only copies /lsiopy.
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable --no-modify-path
ENV PATH=/usr/local/cargo/bin:${PATH}
COPY rust/ /app/rust/
# `rust/backend/src/reader.rs` and `epub_page.rs` embed these templates with include_str!, and from `src/` they sit at
# `/app/cps/templates`. A template added to a Rust `include_str!("../../../cps/templates/…")` MUST be copied here too.
# `rust/backend/build.rs` reads the OCR cache version constants out of `cps/ocr_service.py` (`/app/cps` from `build.rs`).
COPY cps/templates/readpdf.html cps/templates/read.html /app/cps/templates/
COPY cps/ocr_service.py /app/cps/ocr_service.py
RUN /lsiopy/bin/pip install --no-cache-dir maturin && \
    cd /app/rust/taratsa_text && \
    /lsiopy/bin/maturin build --release --locked --out /tmp/wheels && \
    /lsiopy/bin/pip install --no-cache-dir /tmp/wheels/*.whl && \
    cargo build --release --locked --manifest-path /app/rust/backend/Cargo.toml && \
    rm -rf /tmp/wheels

# Model stage: downloads the pinned checkpoints, exports the two emotion RoBERTas to int8 ONNX and verifies every
# result against a SHA-256. torch and transformers live only here; the runtime stage copies the finished files.
#   sentiment/  Horizon-Labs/multilingual-sentiment-small  Apache-2.0  ModernBERT, 3-way sentiment, ships int8 ONNX
#   emotion_id/ StevenLimcorn/indonesian-roberta-base-emotion-classifier  MIT  RoBERTa, EmoT 5 emotions
#   emotion_en/ SamLowe/roberta-base-go_emotions  MIT  RoBERTa, GoEmotions 28 emotions
FROM python:${MODELS_PYTHON_VERSION}-slim-bookworm AS models
ARG SENTIMENT_MODEL_REPO=Horizon-Labs/multilingual-sentiment-small
ARG EMOTION_ID_MODEL_REPO=StevenLimcorn/indonesian-roberta-base-emotion-classifier
ARG EMOTION_EN_MODEL_REPO=SamLowe/roberta-base-go_emotions
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
# Versions as measured: the exported int8 files are pinned by SHA-256 below, so a tool upgrade that changes them
# fails the build instead of moving every book's emotions.
RUN python3 -m venv /export && /export/bin/pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.15.0 && \
    /export/bin/pip install --no-cache-dir transformers==4.57.1 onnx==1.23.2 onnxscript==0.7.2 onnxruntime==1.32.0
RUN set -e; mkdir -p /models/sentiment/onnx /models/emotion_id /models/emotion_en /raw/emotion_id /raw/emotion_en; \
    get() { curl -fsSL -o "$3" "https://huggingface.co/$1/resolve/main/$2"; }; \
    get "$SENTIMENT_MODEL_REPO" onnx/model_quantized.onnx /models/sentiment/onnx/model_quantized.onnx; \
    get "$SENTIMENT_MODEL_REPO" tokenizer.json /models/sentiment/tokenizer.json; \
    get "$SENTIMENT_MODEL_REPO" config.json /models/sentiment/config.json; \
    for pair in "emotion_id $EMOTION_ID_MODEL_REPO" "emotion_en $EMOTION_EN_MODEL_REPO"; do \
      set -- $pair; \
      for f in model.safetensors tokenizer.json config.json vocab.json merges.txt tokenizer_config.json special_tokens_map.json; do \
        curl -fsSL -o "/raw/$1/$f" "https://huggingface.co/$2/resolve/main/$f" || true; done; \
      cp /raw/$1/tokenizer.json /raw/$1/config.json /models/$1/; \
    done
COPY docker/export_emotion_onnx.py /export_emotion_onnx.py
RUN set -e; /export/bin/python /export_emotion_onnx.py /raw/emotion_id /models/emotion_id; \
    /export/bin/python /export_emotion_onnx.py /raw/emotion_en /models/emotion_en; \
    cd /models && printf '%s\n' \
      'a2b63c00af1dbb19ddbfdf7376fefb9b4abab6f54819de226f9649d367a9b2d9  sentiment/onnx/model_quantized.onnx' \
      'f34b44a6dc8a0eef651bfa10e8325057530152606a69d9c3b6ae02efb1558f0a  sentiment/tokenizer.json' \
      '6ec7630763facc42817d19f5ffcf826feb6d1b2692143227cd388c79806aade4  emotion_id/model_quantized.onnx' \
      '4cae32a9b97d0215cbbf409b1996e541729405dfc13becf37fd3bd08b8ba8991  emotion_id/tokenizer.json' \
      '4cbb063047d0b314c6d8c592c697b5aaa4e1859174055f1be725b98b724b2178  emotion_en/model_quantized.onnx' \
      '90e2336a1cdacffe5d4328ab323aa9e5c33889026e4e4881323bebdeeb0e179d  emotion_en/tokenizer.json' | sha256sum -c -
# ONNX Runtime, taken from the wheel that matches the `ort` crate's expectations (the crate loads it at run time).
RUN mkdir -p /ort && cp "$(/export/bin/python -c 'import onnxruntime,os;d=os.path.join(os.path.dirname(onnxruntime.__file__),"capi");print([os.path.join(d,f) for f in os.listdir(d) if f.startswith("libonnxruntime.so.")][0])')" /ort/libonnxruntime.so

FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ARG BUILD_DATE
ARG VERSION
ARG CALIBREWEB_RELEASE
ARG KEPUBIFY_RELEASE=v5.0.0
ARG CALIBRE_RELEASE=9.19.0
LABEL build_version="Linuxserver.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
LABEL maintainer="notdriz"

ENV \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox" \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    ca-certificates \
    curl \
    libstdc++6 \
    xz-utils \
    libldap-2.5-0 \
    libmagic1 \
    libsasl2-2 \
    libxi6 \
    libxslt1.1 \
    libxml2 \
    libmagickwand-6.q16-6 \
    imagemagick \
    ghostscript \
    libgl1 \
    libglx-mesa0 \
    libxdamage1 \
    libegl1 \
    libxkbcommon0 \
    libnss3 \
    libopengl0 \
    libxcomposite1 \
    libxkbfile1 \
    libxrandr2 \
    libxtst6 \
    libasound2 \
    libxfixes3 \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

RUN echo "Installing Calibre ${CALIBRE_RELEASE}" && \
    curl -fsSL -o /tmp/calibre.txz \
      "https://download.calibre-ebook.com/${CALIBRE_RELEASE}/calibre-${CALIBRE_RELEASE}-x86_64.txz" && \
    mkdir -p /app/calibre && \
    tar -xJf /tmp/calibre.txz -C /app/calibre && \
    ln -sf /app/calibre/calibre /usr/bin/calibre && \
    ln -sf /app/calibre/ebook-convert /usr/bin/ebook-convert && \
    ln -sf /app/calibre/calibre-smtp /usr/bin/calibre-smtp && \
    ln -sf /app/calibre/calibredb /usr/bin/calibredb && \
    rm -rf /tmp/calibre.txz

COPY --from=unrar /usr/bin/unrar-ubuntu /usr/bin/unrar

RUN curl -fsSL -o /usr/bin/kepubify \
    https://github.com/pgaskin/kepubify/releases/download/${KEPUBIFY_RELEASE}/kepubify-linux-64bit && \
    chmod +x /usr/bin/kepubify

COPY --from=builder /lsiopy /lsiopy
ENV PATH="/lsiopy/bin:${PATH}"

# Sentence tone and emotion models (cps/sentiment_store.py -> taratsa_text::classifier / ::emotions), copied from the
# `models` stage below: int8 ONNX files only, no torch in the runtime image.
COPY --from=models /models /app/calibre-web/cps/sentiment_model
COPY --from=models /ort/libonnxruntime.so /usr/local/lib/libonnxruntime.so
ENV ORT_DYLIB_PATH=/usr/local/lib/libonnxruntime.so
COPY cps/ /app/calibre-web/cps/

# Rust backend (rust/backend/README.md); Flask keeps serving every route, Caddy can send ported ones here.
COPY --from=builder /app/rust/backend/target/release/taratsa_backend /usr/local/bin/taratsa_backend
ENV APP_DB_PATH=/config/app.db LISTEN=127.0.0.1:8084

COPY cps.py /app/calibre-web/
COPY pyproject.toml /app/calibre-web/
COPY messages.pot /app/calibre-web/
COPY babel.cfg /app/calibre-web/
COPY MANIFEST.in /app/calibre-web/
COPY frontend/src/data/book-slugs.json /app/calibre-web/book-slugs.json

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8083
VOLUME ["/config"]

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
