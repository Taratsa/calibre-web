#!/bin/bash
# Reseed the Astro frontend data from the live Calibre DBs, rebuild the
# frontend Docker image (which bakes in src/data), and recreate the running
# container so the new catalog data is actually served.
#
# Replaces the old rebuild-watcher flow: seeding to frontend/dist/ is dead —
# Caddy serves the Astro SSR container (pustaka-astro), which reads src/data
# baked into the image at build time. This script is the single manual entry
# point for a full frontend refresh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CALIBRE_DB="$SCRIPT_DIR/library/metadata.db"
APP_DB="$SCRIPT_DIR/data/app.db"
SERVICE="astro-frontend"

echo "=== 1/3 Seeding frontend data from live DBs ==="
cd "$SCRIPT_DIR/frontend"
CALIBRE_DB_PATH="$CALIBRE_DB" APP_DB_PATH="$APP_DB" \
    node scripts/seed.mjs "$CALIBRE_DB"

echo "=== 2/3 Rebuilding frontend image (bakes src/data) ==="
cd "$SCRIPT_DIR"
docker compose build "$SERVICE"

echo "=== 3/3 Recreating running container ==="
docker compose up -d --force-recreate --no-deps "$SERVICE"

echo "=== Frontend rebuilt and recreated ==="
docker compose ps "$SERVICE" --format '{{.Name}} {{.Status}}'
