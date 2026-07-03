# syntax=docker/dockerfile:1

FROM ghcr.io/linuxserver/unrar:latest AS unrar

# ─── Builder: install build deps + build python venv ───
FROM ghcr.io/linuxserver/baseimage-ubuntu:noble AS builder

ARG BUILD_DATE
ARG VERSION
ARG CALIBREWEB_RELEASE
LABEL build_version="Linuxserver.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
LABEL maintainer="notdriz"

RUN \
  echo "**** install build packages ****" && \
  apt-get update && \
  apt-get install -y --no-install-recommends \
    build-essential \
    libldap2-dev \
    libsasl2-dev \
    python3-dev \
    poppler-utils \
    imagemagick \
    ghostscript \
    libldap2 \
    libmagic1t64 \
    libsasl2-2 \
    libxi6 \
    libxslt1.1 \
    python3-venv \
    sqlite3 \
    xdg-utils

COPY ./ /app/calibre-web

RUN \
  echo "**** install calibre-web dependencies ****" && \
  cd /app/calibre-web && \
  python3 -m venv /lsiopy && \
  pip install -U --no-cache-dir \
    pip \
    wheel && \
  pip install -U --no-cache-dir --find-links https://wheel-index.linuxserver.io/ubuntu/ -r \
    requirements.txt -r \
    optional-requirements.txt && \
  echo "***install kepubify" && \
  if [ -z ${KEPUBIFY_RELEASE+x} ]; then \
    KEPUBIFY_RELEASE=$(curl -sX GET "https://api.github.com/repos/pgaskin/kepubify/releases/latest" \
    | awk '/tag_name/{print $4;exit}' FS='[""]'); \
  fi && \
  curl -o \
    /usr/bin/kepubify -L \
    https://github.com/pgaskin/kepubify/releases/download/${KEPUBIFY_RELEASE}/kepubify-linux-64bit && \
  rm -rf \
    /tmp/* \
    /var/lib/apt/lists/* \
    /var/tmp/* \
    /root/.cache

# ─── Runtime: minimal image with only runtime deps ───
FROM ghcr.io/linuxserver/baseimage-ubuntu:noble

ARG BUILD_DATE
ARG VERSION
ARG CALIBREWEB_RELEASE
LABEL build_version="Linuxserver.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
LABEL maintainer="notdriz"

RUN \
  echo "**** install runtime packages ****" && \
  apt-get update && \
  apt-get install -y --no-install-recommends \
    poppler-utils \
    imagemagick \
    ghostscript \
    libldap2 \
    libmagic1t64 \
    libsasl2-2 \
    libxi6 \
    libxslt1.1 \
    python3-venv \
    sqlite3 \
    xdg-utils && \
  rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY --from=builder /lsiopy /lsiopy
COPY --from=builder /usr/bin/kepubify /usr/bin/kepubify
COPY ./ /app/calibre-web
COPY root/ /
COPY --from=unrar /usr/bin/unrar-ubuntu /usr/bin/unrar

EXPOSE 8083
VOLUME /config
