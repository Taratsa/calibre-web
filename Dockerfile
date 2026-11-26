# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.15

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
RUN /lsiopy/bin/pip install --no-cache-dir maturin && \
    cd /app/rust/taratsa_text && \
    /lsiopy/bin/maturin build --release --locked --out /tmp/wheels && \
    /lsiopy/bin/pip install --no-cache-dir /tmp/wheels/*.whl && \
    rm -rf /tmp/wheels /app/rust

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

COPY cps/ /app/calibre-web/cps/

# Sentence-level tone classifier (cps/sentiment_store.py -> taratsa_text::classifier). Apache-2.0. The SHA-256 values
# pin the files: a changed upstream file fails the build instead of silently moving every book's tone score.
ARG SENTIMENT_MODEL_REPO=Horizon-Labs/multilingual-sentiment-small
ARG SENTIMENT_MODEL_REVISION=main
RUN mkdir -p /app/calibre-web/cps/sentiment_model && cd /app/calibre-web/cps/sentiment_model && \
    for file in model.safetensors tokenizer.json config.json special_tokens_map.json; do \
      curl -fsSL -o "$file" "https://huggingface.co/${SENTIMENT_MODEL_REPO}/resolve/${SENTIMENT_MODEL_REVISION}/${file}"; \
    done && \
    printf '%s\n' \
      'f0d0b6d2958f2f0a017ec060bb4768bfa720ef67625486ef02710c6484d02dd1  model.safetensors' \
      'f34b44a6dc8a0eef651bfa10e8325057530152606a69d9c3b6ae02efb1558f0a  tokenizer.json' \
      '516d8046cca3238145113bbe8b5e2b5b34b2f0c04b0ca093d7761c5f0a504eb9  config.json' | sha256sum -c -
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
