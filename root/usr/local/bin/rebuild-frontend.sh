#!/usr/bin/env bash
# Triggered by Flask admin via POST /internal/rebuild-frontend.
#
# Re-runs the Astro seed over the live Calibre DB and rebuilds the static
# frontend. The output is rsync'd into /srv/frontend for Caddy to serve.

set -euo pipefail

LOG_FILE="${REBUILD_LOG_FILE:-/tmp/rebuild-frontend.log}"
APP_ROOT="${APP_ROOT:-/app/calibre-web}"
FRONTEND_DIR="${FRONTEND_DIR:-/app/calibre-web/frontend}"
OUT_DIR="${OUT_DIR:-/srv/frontend}"
NODE_BIN="${NODE_BIN:-node}"
CALIBRE_DB_PATH="${CALIBRE_DB_PATH:-/calibre-library/metadata.db}"
APP_DB_PATH="${APP_DB_PATH:-/config/app.db}"

mkdir -p "$(dirname "$LOG_FILE")"
exec >>"$LOG_FILE" 2>&1
echo "===== rebuild started $(date -Iseconds) ====="

cd "$FRONTEND_DIR"

if [[ ! -f "$CALIBRE_DB_PATH" ]]; then
  echo "ERROR: CALIBRE_DB_PATH not found at $CALIBRE_DB_PATH" >&2
  exit 2
fi

echo "[$(date +%H:%M:%S)] seed"
CALIBRE_DB_PATH="$CALIBRE_DB_PATH" APP_DB_PATH="$APP_DB_PATH" \
  "$NODE_BIN" scripts/seed.mjs

echo "[$(date +%H:%M:%S)] npm run build"
"$NODE_BIN" ./node_modules/.bin/astro build

echo "[$(date +%H:%M:%S)] publish to $OUT_DIR"
mkdir -p "$OUT_DIR"
rsync -a --delete dist/ "$OUT_DIR/dist/"
if [[ -d public ]]; then
  rsync -a public/ "$OUT_DIR/public/"
fi

echo "[$(date +%H:%M:%S)] done"
echo "===== rebuild finished $(date -Iseconds) ====="
