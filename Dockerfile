# syntax=docker/dockerfile:1

FROM ghcr.io/linuxserver/unrar:latest AS unrar

FROM python:3.14-slim-bookworm AS builder

ARG BUILD_DATE
ARG VERSION
ARG CALIBREWEB_RELEASE
LABEL build_version="Linuxserver.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
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
ARG KEPUBIFY_RELEASE=v4.0.4
ARG CALIBRE_RELEASE=7.24.0
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
COPY cps.py /app/calibre-web/
COPY pyproject.toml /app/calibre-web/
COPY messages.pot /app/calibre-web/
COPY babel.cfg /app/calibre-web/
COPY MANIFEST.in /app/calibre-web/

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8083
VOLUME ["/config"]

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
