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

The Flask backend exposes `/read/<book-id>/ocr/<format>` (`pdf` or `epub`). Both
routes use the same viewer permissions
as the existing readers. PDFs (text-based, mixed and fully scanned) are sent to
a TurboOCR server over its streaming endpoint (`POST /ocr/stream?mode=auto&as_blocks=1&tables=1&autorotate=1`):
pages with a trusted embedded text layer use that text, and every other page (scans,
image-only pages) is rendered and OCR'd on the server's GPU. On a born-digital book
this is about 6x faster than OCR-ing every page and had fewer word errors in a
comparison on one book (`mode=ocr` garbled 16 words the text layer had right).
Layout blocks are rendered in reading order; running headers, page numbers and pull
quotes are dropped and footnotes are grouped at section breaks (`cps/ocr_layout.py`).
EPUB XHTML spine content is extracted directly.
No OCR models or native libraries are installed in the backend image.

Configure the server in `.env`:

```dotenv
TURBOOCR_URL=http://100.73.167.16:8020
TURBOOCR_TIMEOUT_SECONDS=900
TURBOOCR_IDLE_SECONDS=120
OCR_CACHE_DIR=/config/ocr-cache/results
```

The stream endpoint is used rather than `/ocr/pdf` because the server closes any
connection silent for 120 s (`IDLE_CONNECTION_TIMEOUT_S`); a large book (e.g. a
91 MB / 297-page scan) takes 2.5-5 minutes to finish and would otherwise return
504. The server's request-body cap (`max_body_mb`, read it from `GET /capabilities`)
was 100 MB when first tested and 512 MB later, so it is operator-configurable.
`autorotate=1` is on because scanned books are often scanned sideways: without
it the layout model reads sideways pages as vertical strips and the reading
order is wrong. Only one OCR job runs at a time per backend process. The backend
stores extracted text under `/config/ocr-cache/results`, keyed by book, format,
file size, and modification time; an incomplete or failed OCR run is never cached.

**On-demand queue.** A page load never runs a PDF extraction (it takes minutes and
would hit the proxy timeout): `GET /api/read/<id>/ocr/<format>` returns the cached
document, or `202` with the job state when the PDF has not been processed.
The reader page then offers a "Mulai proses OCR" button, which sends
`POST /api/read/<id>/ocr/<format>`; that queues the job on a dedicated single-thread
queue (`cps/tasks/ocr_queue.py`, separate from the shared mail/convert worker) and
returns at once. The page polls `/api/read/<id>/ocr/status/<format>` for
page-by-page progress and reloads when the result is cached. Only the explicit
POST queues work, so crawlers following links cannot start GPU jobs. At most 5
jobs may be pending (more get `429`), the POST is rate limited to 10/minute per
IP, and a failed job can be retried straight away. The queue lives in memory: a
backend restart drops queued jobs (users press the button again; finished
results are on disk). Admins can still pre-process the catalog with the
`/ocr/scan` task or `OCR_SCAN_CRON`. Caddy must route `/api/read/*` to Flask.

**Reader text size.** The OCR reader has an A− / 100% / A+ control in its toolbar
(85%, 100%, 115%, 130%, 150%, 175%). The choice is stored per browser in
`localStorage` (`ocr-font-scale`) and applied before first paint, so it persists
across books without flashing the default size. It scales body text, headings and
tables together; clicking the percentage resets to 100%.

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
