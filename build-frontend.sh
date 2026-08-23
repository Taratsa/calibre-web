#!/bin/bash
# Build the Astro frontend (used for initial setup or manual rebuilds)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend/dist"
CALIBRE_DB="$SCRIPT_DIR/library/metadata.db"
APP_DB="$SCRIPT_DIR/data/app.db"
echo "=== Building Astro Frontend ==="

# Build locally
cd "$SCRIPT_DIR/frontend"
CALIBRE_DB_PATH="$CALIBRE_DB" APP_DB_PATH="$APP_DB" \
    node scripts/seed.mjs "$CALIBRE_DB"

npx astro build --outDir /tmp/pustaka-dist

# Copy to dist
echo "Copying build output to $FRONTEND_DIR..."
cp -r --remove-destination /tmp/pustaka-dist/* "$FRONTEND_DIR/"

echo "=== Frontend built successfully ==="
echo "Output: $FRONTEND_DIR"