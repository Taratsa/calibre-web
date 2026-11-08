# Calibre-Web Fork Notes

## Repository Info
- This is a forked repository from upstream (https://github.com/janeczku/calibre-web)
- Branch: `taratsa` (custom modifications for Taratsa deployment)

## Deployment Pipeline

### Docker Stack
Services defined in `docker-compose.yml`:
- `calibre-web-automated` - Flask app (Calibre-Web backend)
- `rebuild-watcher` - Watches Calibre DB, auto-rebuilds frontend on changes

Backend base image: `python:3.15-slim-bookworm` (GA, set via the
`PYTHON_VERSION` ARG in `Dockerfile`). The `builder` and `runtime` stages share
that ARG, so a version change keeps the `/lsiopy` venv ABI-compatible; never pin
the stages to different Python versions.

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

### Video Transcripts (`/video/<id>/`)
- The video page renders a collapsible "Subtitel" section from
  `frontend/src/data/video-transcripts/<id>.json` (`{lang, lines: [[sec, text]]}`);
  absent/empty file means no section. Loader: `frontend/src/data/video-transcripts.ts`
- Generate with `bun run enrich:video-transcripts` (needs `yt-dlp`; YouTube
  blocks datacenter IPs, so run from an unblocked IP or pass `--cookies cookies.txt`).
  Resumable; no-caption videos get `lines: []` (`--retry-empty` to retry)
- Transcripts are read at SSR time from `src/data` (copied into the runtime image),
  so new files need an image rebuild

## Download Tracking

### Anonymous Downloads
- **Location**: `cps/helper.py:1245-1246`
- Anonymous downloads are now tracked (user_id=0)
- Previously only authenticated users were tracked
- Hot Books section now includes all downloads
- user_id=0 rows reference the `__anonymous__` sentinel user (id=0), inserted
  idempotently at startup by `_ensure_anonymous_downloads_user()` in `cps/ub.py`
- **Counter policy (decided 2026-10-18)**: bot/crawler downloads COUNT (no UA
  filtering), historical counts are kept as-is (no rebaselining), no scheduled
  reseed of `popular.json`, and incomplete/aborted transfers COUNT (the
  increment runs when the response is built, before streaming finishes)
- **FK policy**: foreign keys are enforced ONLY on the dedicated download
  counter engine (`PRAGMA foreign_keys=ON` via the connect listener in
  `cps/ub.py`), which is why the `__anonymous__` row must exist. App-wide
  enforcement stays OFF: `audit_log` and other children keep referencing
  deleted users, so global FK would break `_delete_user`.
- `/downloadlist` excludes user_id=0 from its per-user join (and the alphabet
  list) and renders the anonymous total as its own bucket instead


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

## Search

Two live search systems (plus the legacy advanced-search form):

### Frontend `/search` (Astro SSR - the site's search)
- `frontend/src/pages/search.astro` queries the in-process MiniSearch index in
  `frontend/src/utils/search.ts` (`searchBooks(query, limit)` returns
  `{ hits, total }`); the index is built once per SSR process over
  `frontend/src/data/books.json` with boosts title 4 / authors 3 / tags 2 /
  series 2 / publisher 1, `prefix: true`, `fuzzy: 0.2`, `combineWith: 'AND'`
- Multi-term queries are AND (all terms must match); typo tolerance and
  prefix matching come from the fuzzy/prefix options - no substring-splitting
  heuristic (removed with the old linear-scan scoring)
- Status line reports the untruncated total: `Menampilkan 120 dari N hasil`
  when more than `limit` (120) books match
- Results are plain SSR HTML (no client JS); identical queries are CDN-cached
  (`s-maxage=300`, `frontend/src/middleware.ts`)
- The dead client-side typeahead (`frontend/src/utils/liveSearch.ts`) was
  removed; do not reintroduce a second index

### Backend search (OPDS, `/ajax/listbooks`, legacy UI)
- `cps/db.py:search_query()` keeps the `ILIKE '%term%'` OR-query as the
  source of truth, now narrowed by a trigram FTS5 prefilter
- The index lives in `app.db` (`books_fts` + `books_fts_meta`), never in
  `library/`; `CalibreDB._rebuild_fts_index()` attaches `metadata.db`
  read-only and rebuilds (~200 ms) when the fingerprint
  `COUNT(*)|MAX(last_modified)` of `calibre.books` changes (checked per
  search, so external Calibre edits are picked up)
- Parity invariant: for eligible terms every LIKE hit is an FTS hit
  (verified exhaustively over the catalog vocab), so the FTS ids only narrow
  the scan and an empty candidate set skips it entirely (miss queries ~25 ms)
- Terms with LIKE wildcards (`%`/`_`), words shorter than 3 chars, or
  control characters bypass the prefilter (trigram cannot cover them); any
  index/FTS error falls back to plain LIKE
- Searchable custom columns disable the prefilter (they are not indexed);
  with them configured the query is exactly the old LIKE query

### OPDS search pagination
- `/opds/search/<path:query>` returns `config.config_books_per_page` entries
  per page with `rel="next"`/`rel="previous"` links (`?offset=N`); it no
  longer renders every hit in one Atom page
- `/opds/search?query=...` 302-redirects to the path variant (canonical;
  `feed.xml` builds next/prev from `request.path`, which would drop `?query=`)
- `cps/templates/feed.xml` supports a `link_query` base for those links

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
- `cps/db.py` - Trigram FTS5 search prefilter (index in app.db, auto-rebuild on catalog change) + LIKE fallback
- `cps/templates/feed.xml` - `link_query` pagination base for OPDS search next/prev links
- `cps/frontend_rebuild.py` - Async frontend rebuild trigger
- `cps/text_analysis.py`, `cps/text_analysis_store.py`, `cps/tasks/text_analysis.py` - Corpus text statistics for `/data` (see Corpus Statistics)
- `cps/templates/layout.html` - Umami tracking for downloads
- `cps/templates/detail.html` - JSON-LD structured data, canonical URL
- `cps/templates/author.html` - JSON-LD structured data
- `cps/templates/readpdf.html` - PDF viewer configuration
- `docker-compose.yml` - Docker services definition
- `docker/entrypoint.sh` - Custom init replacing s6-overlay (user setup, first-boot DB init, non-root exec)
- `host/rebuild-listener.py` - Host-side HTTP listener for frontend rebuild triggers
- `Caddyfile` - Caddy proxy configuration (on host)
- `frontend/src/pages/search.astro` - MiniSearch-backed search page (counts, empty state)
- `frontend/src/utils/search.ts` - In-process search index (`searchBooks`); `frontend/src/utils/liveSearch.ts` deleted as dead code

### Key Features
- Umami analytics tracking for downloads (browser + server-side)
- Umami `epub-read` / `pdf-read` events (`book_id`, `format`, `title`) fired on load by the standalone
  reader pages `read.html` / `readpdf.html` via the shared `cps/templates/umami_reader.html` partial
  (these pages do not extend `layout.html`, so they load the Umami script themselves)
- Anonymous download tracking for Hot Books
- OPDS feed for ebook reader compatibility
- App-level WebP conversion for cover images
- Canonical URLs for SEO. Numeric `/book/<id>/` URLs 301-redirect to the slug
  form: Caddy's `@legacy_book` matcher sends them to Flask (`web.show_book`),
  which resolves the ID via `frontend/src/data/book-slugs.json` (generated by
  `seed.mjs`). That file is bind-mounted read-only into the Flask container at
  `/app/calibre-web/book-slugs.json`, and `_get_book_slugs()` (`cps/web.py`)
  re-reads it whenever its mtime changes - so seed regenerations take effect
  without rebuilding the backend image.
- **Frontend design system**: Scandinavian minimal
  (github.com/ericzakariasson/scandinavian-design). Neutrals are alpha-black
  ladders (light) / alpha-white ladders (dark) - never warm/cool gray casts;
  focus rings, stars, and search highlights are neutral; the red `--accent`
  token is reserved for primary actions only. UI border-radius is capped at
  4px. All tokens live in `frontend/src/styles/global.css`; keep new
  components on `var(--*)` tokens rather than hardcoded colors.

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
- Background resolution task: `cps/tasks/duplicate_resolve.py`
  (`TaskDuplicateResolve`). **Resolution MUST NOT run in a request handler**:
  the WSGI server is cooperative gevent with no threadpool
  (`cps/server.py`, `spawn=Pool()`), so a multi-minute resolution that copies
  and deletes whole book folders blocks every other request and Cloudflare
  answers 524. `POST /duplicates/execute-resolution` queues the task and
  returns `{queued, task_id}` immediately; the UI polls `/duplicates/status`
  (`resolving` flag) and reloads when it clears. A second request returns 409
  while one is running/queued.
- `/duplicates/invalidate-cache` internal endpoint is CSRF-exempt

### EPUB Reader (Readium ts-toolkit)
- `/read/<id>/epub` (`templates/read.html` + `static/js/reading/epub.js`) renders EPUBs with the
  [Readium ts-toolkit](https://github.com/readium/ts-toolkit) `EpubNavigator`; it replaced epubjs/epub-ts. The
  navigator does not read zips: `cps/readium.py` builds a Readium Web Publication Manifest and a position list
  (one position per ~1,024 characters) from the EPUB, and `web.py` serves them with single zip members:
  `/show/readium/<id>/manifest.json`, `/show/readium/<id>/positions.json`, `/show/readium/<id>/<zip path>`. They
  live under `/show/` on purpose: the production Caddyfile (`/home/wibi/apps/caddy/Caddyfile`, not the repo copy)
  already sends `/show/*` to Flask with `private, no-store`, so no proxy change is needed. Same permissions as
  `/show/<id>/<fmt>` (`viewer_required`). Manifests are memoised on the file's mtime/size. EPUBs on Google Drive are
  not supported by these routes
- The browser bundle is `static/js/libs/readium.js` (global `Readium`), built from `readium-reader/`
  (`cd readium-reader && npm install && npx vite build`; versions pinned in its `package.json`). Vite is needed
  because the toolkit imports Readium CSS and the in-frame scripts with `?raw`. Rebuild and commit the bundle when
  bumping `@readium/*`
- Reader settings are Readium preferences (`EpubPreferences`): theme (background/text colour), font size
  (70-300%, via Readium CSS `zoom`), font family, columns, **text alignment** (default/left/justify) - all kept in
  `localStorage` (`calibre.reader.*`). The reading position is stored per book as a serialized locator under
  `calibre.reader.locator.<id>`; the server bookmark (`/ajax/bookmark`) now holds a Readium locator (JSON) instead of
  an epub CFI, so old CFI bookmarks are ignored
- The reader page CSP allows `blob:` frames (`frame-src`), because each chapter is rendered in a blob iframe

### Corpus Statistics (`/data`)
- `/data` (Astro) shows library totals from `src/data` (`frontend/src/utils/library-stats.ts`, computed once per SSR
  process, so reseed + image rebuild refreshes it) and, below them, text statistics of the **whole corpus**
  (`components/CorpusAnalysis.astro`, styles in `src/styles/analysis.css`). There is deliberately **no per-book
  analysis** on book pages
- Statistics are derived from the OCR/EPUB text cache, never from the files: `cps/text_analysis.py` (pure:
  `CorpusBuilder`), `cps/text_analysis_store.py` (storage), `cps/tasks/text_analysis.py` (`rebuild_corpus`,
  `TaskTextAnalysis`)
- Storage: `<OCR_CACHE_DIR>/../analysis/corpus.json` (`/config/ocr-cache/analysis`), rebuilt as a whole, never
  patched. Bump `ANALYSIS_VERSION` whenever a metric or its definition changes (an older file is then ignored until
  the next rebuild)
- The corpus is built from the full cached texts, one document per book (EPUB wins over PDF). Word counts and
  document frequency are exact; the n-gram tables are capped at `MAX_NGRAM_ENTRIES` and flag `approximate_ngrams`
  when singletons had to be dropped. Takes ~1 minute and ~0.5 GB for ~1,000 books
- Word cloud (`cloud` in the corpus result, panel "Awan kata"): top `CLOUD_WORDS` words after dropping stopwords and words
  shorter than `CLOUD_MIN_LENGTH`. Stopwords = stopwords-iso (MIT) Indonesian + English + Dutch + a few old-spelling
  fragments, bundled as `cps/text_analysis_stopwords.json`. Malay is left out on purpose: it contains content words
  ("orang", "rakyat", "negara"). The n-gram and "Frekuensi kata" panels stay unfiltered. Change the list -> bump `ANALYSIS_VERSION`
- Nothing computes on a request: `GET /api/analysis/corpus` (public, no per-book data) answers 200 with the stored
  result or 202 `{"state":"pending"}`, and `/data` then shows a notice instead of the panels
- Rebuild triggers: the end of a full scheduled OCR scan (`tasks/ocr_scan.py`) and the admin button "Compute Text
  Analysis Now" (`POST /analysis/run`). On-demand reader OCR does not rebuild it, so `/data` can lag behind until
  the next run
- PDFs without cached OCR text are left out (no GPU work is queued); ~6,000 of ~7,100 books are in that state

### Structured Data (JSON-LD)

#### Book Pages
- `url`, `name`, `author` (Person array), `image`, `inLanguage`
- `description`, `isbn`, `datePublished`, `publisher`
- `bookFormat` (EBook/Book), `aggregateRating`
- `inLanguage` and `og:locale` come from Calibre's ISO 639-2 codes (`ind`) mapped to ISO 639-1 / locale
  (`id`, `id_ID`) by `languageTag()` / `ogLocale()` in `frontend/src/data/index.ts`. Add new languages to
  `ISO_639_1` there. `BookLayout` passes the locale to `BaseLayout`, which emits the only `og:locale`
- `datePublished`, `book:release_date` and the visible "Tahun" row use `reliablePubdate()`
  (`frontend/src/utils/pubdate.ts`): Calibre fills `pubdate` with the import date when a book has none, so a
  date within 31 days before `timestamp` (or after it) is treated as a placeholder and omitted

#### Author Pages
- `name`, `image`, `description`, `sameAs` (Goodreads), `url`

### Indexing

- The sitemap lists `/read/<id>/ocr/<fmt>/` only for books in `frontend/src/data/ocr-ready.json`, written by
  `seed.mjs` from the OCR cache (`OCR_CACHE_DIR`, set by `build-frontend.sh`): entries of the current
  `CACHE_VERSION` (read from `cps/ocr_service.py`) that are `ready` and still match the library file's name
  and size. Pages for unprocessed books render a `noindex` stub, so they stay out of the sitemap. New OCR results
  appear in the sitemap after the next `./build-frontend.sh`; without the cache dir the previous manifest is kept
- The Flask viewer shells (`/read/<id>/<fmt>` -> epub.js/pdf.js/etc.) send `X-Robots-Tag: noindex`
  (`add_security_headers` in `cps/web.py`); do not also `Disallow` them in robots.txt or crawlers never see it

## Caching Configuration

### Book Downloads
- `/download/<id>/<fmt>` is never cached: it authorizes, counts the hit
  (`ub.update_download` + Umami), then 302s to
  `/files/<id>/<fmt>/<version>/<sig>/<name>` (`get_download_redirect()` in
  `cps/helper.py`). `version` = `last_modified-size`, `sig` = HMAC of
  id/format/version with the app secret key
- `/files/*` (`get_signed_file()`) serves the same bytes to everyone with
  `Cache-Control: public, max-age=31536000, immutable` and NEVER counts, so the
  CDN may cache it. A metadata/file change alters `version`, so stale copies are
  never served; an old link 302s back to `/download`
- Kindle/Kobo clients and the Google Drive path skip the redirect and use the
  old direct `get_download_link()`
- **Cloudflare**: a dashboard Cache Rule must NOT match `/download/*`
  (a cached 200/302 there bypasses the counter). Cache `/files/*` only

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
