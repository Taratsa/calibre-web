#!/bin/bash
set -eu

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
ABC_USER="abc"

if ! getent group "$ABC_USER" >/dev/null 2>&1; then
    groupadd -g "$PGID" "$ABC_USER"
fi
if ! id "$ABC_USER" >/dev/null 2>&1; then
    useradd -u "$PUID" -g "$PGID" -d /config -s /sbin/nologin "$ABC_USER"
fi

if [[ ! -f /config/client_secrets.json ]]; then
    echo "{}" > /config/client_secrets.json
fi

chmod +x /usr/bin/kepubify 2>/dev/null || true

if [[ -f /etc/ImageMagick-6/policy.xml ]]; then
    sed -i 's%<policy domain="coder" rights="none" pattern="PDF" />%<policy domain="coder" rights="read|write" pattern="PDF" />%' /etc/ImageMagick-6/policy.xml || true
fi

mkdir -p /app/calibre-web/cps/cache
mkdir -p /config/cache
chown -R "$ABC_USER":"$ABC_USER" /config /app/calibre-web/cps/cache 2>/dev/null || true
if [[ -d /calibre-library ]]; then
    chown -R "$ABC_USER":"$ABC_USER" /calibre-library 2>/dev/null || true
fi

export CALIBRE_DBPATH=/config
export CACHE_DIRECTORY=/config/cache

if [[ ! -f /config/app.db ]]; then
    echo "[entrypoint] First time run, creating app.db..."
    setpriv --reuid="$PUID" --regid="$PGID" --clear-groups \
        python3 /app/calibre-web/cps.py -d >/dev/null 2>&1 || true

    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 /config/app.db "UPDATE settings SET config_kepubifypath='/usr/bin/kepubify' WHERE config_kepubifypath IS NULL OR LENGTH(config_kepubifypath)=0;" 2>/dev/null || true
        sqlite3 /config/app.db "UPDATE settings SET config_calibre='/app/calibre' WHERE config_calibre IS NULL OR LENGTH(config_calibre)=0;" 2>/dev/null || true
    fi
    echo "[entrypoint] app.db initialised."
fi

chown -R "$ABC_USER":"$ABC_USER" /config 2>/dev/null || true

echo "[entrypoint] CACHE_DIRECTORY=$CACHE_DIRECTORY CALIBRE_DBPATH=$CALIBRE_DBPATH" >&2

exec setpriv --reuid="$PUID" --regid="$PGID" --clear-groups \
    python3 /app/calibre-web/cps.py