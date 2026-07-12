# Pustaka Deployment Guide

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
vim .env

# 2. Build frontend
./build-frontend.sh

# 3. Deploy
docker compose up -d
```

## Architecture

```
                    ┌─────────────────────────────────┐
                    │         Caddy (:80/:443)        │
                    │  (runs on host, not in compose)  │
                    │                                 │
                    │  /srv/frontend ──┐               │
                    │  reverse_proxy ──┼─► Flask :8083│
                    └──────────────────┼──────────────┘
                                       │
                                       ▼
                             ┌───────────────────┐
                             │ Flask (Calibre-   │
                             │ Web container)    │
                             │ - Backend API     │
                             │ - Book downloads  │
                             │ - Cover images    │
                             └───────────────────┘
```

**Frontend builds happen ONLY on the host** — never inside any container.
Run `./build-frontend.sh` manually after changes to your Calibre library.

## Services

| Service | Description | Port |
|---------|-------------|------|
| `calibre-web-automated` | Flask backend (slim Python + Calibre pre-baked) | 8083 |
| `caddy` | Reverse proxy (on host, not in compose) | 80/443 |

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
vim .env

# 2. Build frontend on the host (one-time)
./build-frontend.sh

# 3. Deploy
docker compose up -d

# 4. Rebuild frontend when library changes
./build-frontend.sh
```

## Option 1: Use Caddy in Docker Compose

```bash
# 1. Copy and edit Caddyfile
cp Caddyfile.compose Caddyfile
vim Caddyfile

# 2. Uncomment caddy service in docker-compose.yml

# 3. Start all services
docker compose up -d
```

## Option 2: Existing Caddy Setup (recommended)

If Caddy runs separately (on host or another stack), add to your existing Caddyfile:

```caddy
pustaka.taratsa.id {
    root * /path/to/calibre-web/frontend/dist

    # ... your existing config ...

    reverse_proxy calibre-web-automated:8083
}
```

Mount the frontend directory in your Caddy container:
```yaml
# In your Caddy docker-compose
volumes:
  - /path/to/calibre-web/frontend/dist:/srv/frontend:ro
```

## Manual Frontend Rebuild

After adding/removing books, edit metadata, or change anything that affects
the static frontend, run:

```bash
./build-frontend.sh
```

This regenerates `./frontend/dist/` which Caddy serves immediately.

The previous architecture used a watcher container and webhook; those were
removed because:
- Builds happen only on the host (per project rule)
- Watcher required Docker-in-Docker socket access
- Manual rebuild is fast (~10s) and reliable

## Manual Commands

```bash
# Build frontend on the host
./build-frontend.sh

# Build & deploy
docker compose build
docker compose up -d

# Watch logs
docker compose logs -f calibre-web-automated

# Stop
docker compose down
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HARDCOVER_TOKEN` | - | Hardcover API token |
| `WEBHOOK_TOKEN` | - | (unused, kept for backward compat) |
| `OAUTHLIB_RELAX_TOKEN_SCOPE` | - | Set in compose; relaxes Google OAuth scope check |
| `PUID`/`PGID` | 1000 | User/group for the abc user inside the container |
| `TZ` | UTC | Container timezone |

## File Structure

```
calibre-web/
├── docker-compose.yml
├── Caddyfile.compose      # Template for Caddy
├── Caddyfile              # Your host Caddyfile (not in repo)
├── .env                   # Your secrets
├── Dockerfile             # Flask app (slim Python + Calibre pre-baked)
├── docker/
│   └── entrypoint.sh      # Init replacing s6-overlay (user setup, DB init, non-root exec)
├── host/
│   └── rebuild-listener.py  # Standalone host listener (unused — manual rebuilds)
├── frontend/
│   ├── package.json
│   └── dist/              # Built static files (gitignored)
└── library/
    └── metadata.db        # Calibre database
```

## Image Size Notes

The new image pre-bakes Calibre directly into the build (~600 MB) to
eliminate the 30-second runtime install that the docker-mods approach
required. Startup is now instant. Total image: ~1.55 GB compressed.

If you don't use Calibre's `ebook-convert` at all, set `CALIBRE_RELEASE=`
to empty in Dockerfile and rebuild to drop ~600 MB.

## Troubleshooting

### Frontend shows stale data
```bash
./build-frontend.sh
```

### DB not found
- Ensure `./library/metadata.db` exists
- Check volume mounts in docker-compose.yml

### Build fails
```bash
docker builder prune
docker compose build --no-cache
```
