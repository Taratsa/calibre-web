# Pustaka Deployment Guide

## Architecture

```
                    ┌──────────────────────────────────────┐
                    │         Caddy (:80/:443)             │
                    │  (runs on host, proxies by hostname) │
                    └───────────────┬──────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
        canonical frontend                       Flask backend
        Astro SSR :4321                          :8083
        (Bun runtime, CDN-cacheable)              downloads, OPDS,
                                                  legacy host, APIs
```

The canonical public frontend is Astro Node SSR output running in the
`astro-frontend` container. Its middleware sets shared-cache headers for 200
HTML responses; Caddy/CDN caching provides ISR-like reuse without generating
thousands of static pages. Flask remains authoritative for downloads, OPDS,
numeric redirects, the legacy host, and API routes.

## Services

| Service | Description | Port |
|---------|-------------|------|
| `calibre-web-automated` | Flask backend (slim Python + Calibre pre-baked) | 8083 |
| `astro-frontend` | Astro SSR frontend on Bun | 4321 (internal) |
| `caddy` | Reverse proxy (on host, not in compose) | 80/443 |

The compose file builds both application images. Frontend metadata is copied
into the image at build time; rerun the frontend image build after Calibre
metadata changes. This is not a live frontend rebuild watcher.

The Astro frontend also serves the same-origin `/video/` archive and
`/video/<id>/` watch pages from the checked-in dataset in
`frontend/src/data/wordpress-videos.json`. Refresh that dataset from the
`Taratsa/pustaka-video` crawler when its source archive changes, then rebuild
the Astro image. No additional Caddy route or service is required.

## Quick Start


### Document OCR

The Flask backend exposes `/read/<book-id>/ocr/?format=pdf` and
`/read/<book-id>/ocr/?format=epub`. Both routes use the same viewer permissions
as the existing readers. Text-based and mixed PDFs are supported; fully scanned
PDFs are skipped. EPUB XHTML spine content is extracted directly.
`pdf-inspector` runs in the backend; it is not installed in the Astro frontend.

Configure the model cache in `.env`:

```dotenv
XDG_CACHE_HOME=/config/ocr-cache
OCR_CACHE_DIR=/config/ocr-cache/results
PDF_INSPECTOR_OFFLINE=0
PDFIUM_LIB_PATH=/usr/local/lib/libpdfium.so
ORT_DYLIB_PATH=/usr/local/lib/libonnxruntime.so
```

The backend stores extracted text and scanned-PDF decisions under
`/config/ocr-cache/results`, keyed by book, format, file size, and modification
time. Scanned PDFs are skipped and do not expose an OCR link. The image currently
targets x86_64; use matching ARM64 runtime assets before deploying on ARM hosts.
```bash
# 1. Configure environment
cp .env.example .env
vim .env

# 2. Refresh database-backed frontend snapshots
./build-frontend.sh

# 3. Build and start both application images
docker compose build
docker compose up -d
```

## Existing Caddy Setup

The production Caddy configuration must proxy `pustaka.taratsa.id` to
`pustaka-astro:4321` for canonical Astro pages and route Flask-owned paths
(downloads, OPDS, APIs, numeric redirects) to `calibre-web-automated:8083`.
The legacy host `old-pustaka.taratsa.id` remains numeric and is served by
Flask with `X-Robots-Tag: noindex, nofollow`.

## Refresh Frontend Metadata

After adding or removing books or changing metadata, refresh the read-only
frontend data snapshot before rebuilding the image:

```bash
./build-frontend.sh
docker compose build astro-frontend
docker compose up -d astro-frontend
```

The seed step reads the mounted Calibre and app databases and updates
`frontend/src/data`. The generated static `frontend/dist` output is not served
by the SSR deployment. This rebuild is on-demand; there is no live database
watcher.

## Manual Commands

```bash
# Refresh frontend snapshots, build both images, and deploy
./build-frontend.sh
docker compose build
docker compose up -d

# Watch logs
docker compose logs -f calibre-web-automated astro-frontend

# Stop
docker compose down
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HARDCOVER_TOKEN` | - | Hardcover API token |
| `WEBHOOK_TOKEN` | - | Reserved for external integrations |
| `OAUTHLIB_RELAX_TOKEN_SCOPE` | - | Set in compose; relaxes Google OAuth scope check |
| `PUID`/`PGID` | 1000 | User/group for the abc user inside the container |
| `TZ` | UTC | Container timezone |

## File Structure

```
calibre-web/
├── docker-compose.yml
├── Caddyfile.compose
├── Dockerfile
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   └── scripts/seed.mjs
├── cps/
└── library/
```
