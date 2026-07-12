#!/bin/bash
# Build and deploy script for Pustaka (Calibre-Web + Astro Frontend)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Pustaka Deployment Script ==="
echo

# Check for required files
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "Warning: .env file not found. Copy .env.example to .env and configure."
    echo "cp .env.example .env"
    echo
fi

# Parse arguments
FORCE_REBUILD=false
SKIP_WATCHER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force-rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        --no-watcher)
            SKIP_WATCHER=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --force-rebuild  Force rebuild of all Docker images"
            echo "  --no-watcher     Skip starting the rebuild-watcher"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build Docker images
echo "=== Building Docker images ==="
if [ "$FORCE_REBUILD" = true ]; then
    docker compose build --no-cache
else
    docker compose build
fi

# Stop existing containers
echo
echo "=== Stopping existing containers ==="
docker compose down

# Start services
echo
echo "=== Starting services ==="
if [ "$SKIP_WATCHER" = true ]; then
    docker compose up -d calibre-web-automated frontend
else
    docker compose up -d
fi

# Follow logs briefly
echo
echo "=== Container Status ==="
docker compose ps

echo
echo "=== Done! ==="
echo "View logs with: docker compose logs -f"
echo "Stop with: docker compose down"
