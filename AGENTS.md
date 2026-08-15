# Calibre-Web Fork Notes

## Repository Info
- This is a forked repository from upstream (https://github.com/janeczku/calibre-web)
- Branch: `taratsa` (custom modifications for Taratsa deployment)

## Deployment Pipeline

### Docker Stack
Services defined in `docker-compose.yml`:
- `calibre-web-automated` - Flask app (Calibre-Web backend)
- `rebuild-watcher` - Watches Calibre DB, auto-rebuilds frontend on changes

```bash
docker compose build        # Build all images
docker compose up -d        # Start all services
docker compose logs -f      # View logs
docker compose up -d --build rebuild-watcher  # Force rebuild watcher
```

### Flask App (`calibre-web-automated`)
Serves API endpoints: `/admin/*`, `/login*`, `/logout`, `/me`, `/register*`, `/remote_login*`, `/read/*`, `/show/*`, `/download/*`, `/send/*`, `/ajax/*`, `/table`, `/downloadlist`, `/cover/*`, `/series_cover/*`, `/opds`, `/opds/*`, `/kobo/*`, `/.well-known/*`, `/metrics`, `/feed.xml`, `/osd.xml`, `/index.xml`, `/robots.txt`, static files under `cps/static/`.

### Rebuild Watcher (`rebuild-watcher`)
- Polls `metadata.db` every 5 seconds for changes
- Debounces 10 seconds before rebuilding
- Runs `seed.mjs` + `astro build` in Docker
- Outputs to `./frontend/dist/`
- Environment variables (see `.env.example`):
  - `CALIBRE_DB_PATH` - Path to metadata.db
  - `APP_DB_PATH` - Path to app.db
  - `FRONTEND_OUTPUT` - Output directory
  - `WEBHOOK_TOKEN` - Token for rebuild webhook
  - `DEBOUNCE_SECONDS` - Wait after DB change (default: 10)
  - `POLL_INTERVAL_SECONDS` - DB check frequency (default: 5)

### Static Frontend (Astro)
Built by `rebuild-watcher` or manually via:
```bash
./build-frontend.sh
```

Output served by Caddy from `/srv/frontend/dist` (mapped from `frontend/dist/`).

## Download Tracking

### Anonymous Downloads
- **Location**: `cps/helper.py:1245-1246`
- Anonymous downloads are now tracked (user_id=0)
- Previously only authenticated users were tracked
- Hot Books section now includes all downloads

### Hot Books ("Most Downloaded")
- **Endpoint**: `/hot` (web) and `/opds/hot` (OPDS)
- Query: Groups downloads by book_id, orders by count
- Shows books that have been downloaded at least once

## OPDS Feed

### Endpoints
| Endpoint | Description |
|----------|-------------|
| `/opds` | Root navigation feed |
| `/opds/new` | Recently added books |
| `/opds/books` | Alphabetical books |
| `/opds/author` | Authors index |
| `/opds/publisher` | Publishers index |
| `/opds/category` | Categories/Tags index |
| `/opds/series` | Series index |
| `/opds/hot` | Most downloaded books |
| `/opds/rated` | Best rated books |
| `/opds/search/{query}` | Search |
| `/opds/download/{book_id}/{format}` | Download book |
| `/opds/cover/{book_id}` | Get cover image |
| `/opds/osd` | OpenSearch description |
| `/opds/stats` | Database statistics |

### OPDS Conformance
- Uses Atom feed format with OPDS profile
- Supports pagination (next/previous links)
- Supports OpenSearch
- Conforms to OPDS 1.2 specification

## Static Files Location
| Path | Location | Served By |
|------|----------|-----------|
| `cps/static/` | In Docker container | Flask |
| `frontend/public/` | `/srv/frontend/public/` | Caddy |
| `frontend/dist/` | `./frontend/dist/` | Rebuild watcher output |

**Important**: Changes to `cps/static/` require Docker rebuild. Changes to `frontend/public/` require frontend rebuild.

## Upstream Sync
- When syncing from upstream, committed changes are preserved
- If upstream modifies the same lines, merge conflicts may occur and need manual resolution
- DO NOT use `git reset --hard upstream/main` - this will wipe local modifications
- Safe sync: `git fetch upstream && git merge upstream/main`

## Important Notes

### DO NOT Touch
- **NEVER modify or delete files in `library/` folder** - these contain production book files 

### Modified Files
- `cps/helper.py` - Server-side Umami analytics, WebP conversion, anonymous download tracking
- `cps/web.py` - Trailing slash route for book detail pages, WebP detection
- `cps/opds.py` - OPDS feed endpoints
- `cps/frontend_rebuild.py` - Async frontend rebuild trigger
- `cps/templates/layout.html` - Umami tracking for downloads
- `cps/templates/detail.html` - JSON-LD structured data, canonical URL
- `cps/templates/author.html` - JSON-LD structured data
- `cps/templates/readpdf.html` - PDF viewer configuration
- `docker-compose.yml` - Docker services definition
- `docker/entrypoint.sh` - Custom init replacing s6-overlay (user setup, first-boot DB init, non-root exec)
- `host/rebuild-listener.py` - Host-side HTTP listener for frontend rebuild triggers
- `Caddyfile` - Caddy proxy configuration (on host)

### Key Features
- Umami analytics tracking for downloads (browser + server-side)
- Anonymous download tracking for Hot Books
- OPDS feed for ebook reader compatibility
- App-level WebP conversion for cover images
- Canonical URLs for SEO

### Smart Duplicate Detection System & Management
- **Endpoint**: `/duplicates` (sidebar link, admin/edit users only)
- Detection combines hybrid SQL candidate prefiltering + Python fuzzy title/author
  normalization (`cps/duplicate_index.py`, data layer, no UI deps)
- Configurable matching rules (`duplicate_settings` row id=1 in app.db): title,
  author, language, series, publisher, format; scan method (hybrid/python/sql);
  scheduled incremental scans (crontab via APScheduler in `cps/schedule.py`);
  optional auto-resolution with strategies newest/oldest/merge/highest_quality_format/
  most_metadata/largest_file_size and a cooldown
- Persistent per-book index (`duplicate_book_key`) + cached groups
  (`duplicate_index_cache`) enable incremental scans (books added since last scan)
  and post-ingest check hooks (upload/edit/delete in `cps/editbooks.py` queue a
  hidden incremental `TaskDuplicateScan`)
- One-click dismiss/undismiss per user (`DismissedDuplicateGroup`), batch
  preview + execute resolution (`cps/duplicate_resolve.py` — kept free of UI code
  so background tasks can use it), backups of deleted books under
  `<app.db dir>/processed_books/duplicate_resolutions/`, audit-log entries
  (`action="duplicate_resolution"`)
- Deletion reuses stock helpers (`helper.delete_book` + `editbooks.delete_whole_book`);
  the lazy `duplicate_resolve -> editbooks` import is a documented
  import-linter ignore in `.importlinter`
- UI: `cps/templates/duplicates.html` + `cps/static/js/duplicates.js`
- Background scan task: `cps/tasks/duplicate_scan.py` (`TaskDuplicateScan`)
- `/duplicates/invalidate-cache` internal endpoint is CSRF-exempt

### Structured Data (JSON-LD)

#### Book Pages
- `url`, `name`, `author` (Person array), `image`, `inLanguage`
- `description`, `isbn`, `datePublished`, `publisher`
- `bookFormat` (EBook/Book), `aggregateRating`

#### Author Pages
- `name`, `image`, `description`, `sameAs` (Goodreads), `url`

## Caching Configuration

### Book Downloads
- `Cache-Control: public, max-age=3888000` (45 days)
- Applied in `cps/helper.py:get_download_link()`

### Cover Images
- `Cache-Control: public, max-age=86400` (7 days)
- `Vary: Accept, Accept-Encoding`
- WebP served to supporting browsers via `?fm=webp` or `Accept` header

### Cloudflare Cache Rules (recommended)
| Path | Edge TTL | Browser TTL |
|------|----------|-------------|
| `/download/*/pdf/*` | 1.5 months | 1.5 months |
| `/download/*/epub/*` | 1.5 months | 1.5 months |
| `/cover/*` | 1 week | 7 days |

## Environment Configuration

Copy `.env.example` to `.env` and configure:
```bash
HARDCOVER_TOKEN=      # Optional: Hardcover API token
WEBHOOK_TOKEN=        # Optional: Frontend rebuild webhook token
```

## Module Boundary Enforcement

Architectural dependencies between `cps/` modules are enforced by
[import-linter](https://github.com/seddonym/import-linter) using grimp to
statically analyze the import graph. Contracts are defined in `.importlinter`
at the repo root and run via `lint-imports` (also wired into the
`.pre-commit-config.yaml`).

### Contracts

| Contract | Enforces |
|---|---|
| `metadata-provider-is-isolated` | `cps.metadata_provider.*` must not depend on the web/UI layer, task framework, or scheduler |
| `services-are-framework-and-integrations` | `cps.services.*` (worker, scheduler, gmail, simpleldap, SyncToken, goodreads) must not depend on the web/UI layer or task implementations |
| `tasks-are-background-only` | `cps.tasks.*` background jobs must not depend on the web/UI layer |
| `cw-login-is-vendored` | `cps.cw_login` is a vendored Flask-Login fork and must not depend on any other `cps.*` module |
| `cw-advocate-is-vendored` | `cps.cw_advocate` is a vendored requests proxy-validation library and must not depend on any other `cps.*` module |

### Running

```bash
lint-imports             # check contracts (uses cached graph)
lint-imports --no-cache  # force full re-analysis
```

Ignored imports are documented in `.importlinter` under each contract's
`ignore_imports` section. Each entry represents a known function-level lazy
import used to break otherwise-unavoidable circular dependencies (for
example, prometheus-metrics glue between `cps.db` / `cps.helper` and
`cps.web`). They should ideally be cleaned up in a future refactor by
introducing a dedicated metrics module that both sides can import freely.

### Adding a new cps submodule

When you introduce a new submodule under `cps/`, decide which layer it belongs
to (vendored / external-integration / background-task / UI) and either:

- add it to the relevant contract's `source_modules` / `forbidden_modules`
  lists, or
- introduce a new contract if it needs its own boundary.

Run `lint-imports --no-cache` after editing `.importlinter`.
