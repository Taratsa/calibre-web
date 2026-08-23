# syntax=docker/dockerfile:1

FROM ghcr.io/linuxserver/unrar:latest AS unrar

FROM python:3.14-slim-bookworm AS builder

ARG BUILD_DATE
ARG VERSION
ARG CALIBREWEB_RELEASE
ARG PDFIUM_RELEASE=native-v7988
ARG ONNX_RUNTIME_VERSION=1.27.0
ARG KEPUBIFY_RELEASE=v4.0.4
ARG CALIBRE_RELEASE=7.24.0
LABEL maintainer="notdriz"

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
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

FROM python:3.14-slim-bookworm AS runtime

ARG BUILD_DATE
ARG VERSION
ARG CALIBREWEB_RELEASE
ARG PDFIUM_RELEASE=native-v7988
ARG ONNX_RUNTIME_VERSION=1.27.0
ARG KEPUBIFY_RELEASE=v4.0.4
ARG CALIBRE_RELEASE=7.24.0
LABEL build_version="Linuxserver.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
LABEL maintainer="notdriz"

ENV \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox" \
    DEBIAN_FRONTEND=noninteractive \
    PDFIUM_LIB_PATH=/usr/local/lib/libpdfium.so \
    ORT_DYLIB_PATH=/usr/local/lib/libonnxruntime.so \
    XDG_CACHE_HOME=/config/ocr-cache

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
RUN mkdir -p /usr/local/lib && \
    curl -fsSL -o /tmp/pdfium.tgz \
      "https://github.com/firecrawl/pdfium-rs/releases/download/${PDFIUM_RELEASE}/firecrawl-pdfium-linux-x64.tgz" && \
    echo "6248189e07bbc33cdeb31976c539a88614307c8a19f3276dbd018efbe5b4a2a2  /tmp/pdfium.tgz" | sha256sum -c - && \
    tar -xzf /tmp/pdfium.tgz -C /tmp && \
    cp /tmp/lib/libpdfium.so /usr/local/lib/libpdfium.so && \
    curl -fsSL -o /tmp/onnxruntime.tgz \
      "https://github.com/microsoft/onnxruntime/releases/download/v${ONNX_RUNTIME_VERSION}/onnxruntime-linux-x64-${ONNX_RUNTIME_VERSION}.tgz" && \
    echo "547e40a48f1fe73e3f812d7c88a948612c23f896b91e4e2ee1e232d7b468246f  /tmp/onnxruntime.tgz" | sha256sum -c - && \
    tar -xzf /tmp/onnxruntime.tgz -C /tmp && \
    cp "/tmp/onnxruntime-linux-x64-${ONNX_RUNTIME_VERSION}/lib/libonnxruntime.so.${ONNX_RUNTIME_VERSION}" /usr/local/lib/libonnxruntime.so && \
    rm -rf /tmp/pdfium.tgz /tmp/onnxruntime.tgz /tmp/lib "/tmp/onnxruntime-linux-x64-${ONNX_RUNTIME_VERSION}"

COPY --from=builder /lsiopy /lsiopy
ENV PATH="/lsiopy/bin:${PATH}"

COPY cps/ /app/calibre-web/cps/
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
