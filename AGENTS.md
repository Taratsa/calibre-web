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
- The reader page CSP allows `blob:` frames (`frame-src`) and `blob:` scripts (`script-src-elem`, which must repeat the
  `default-src` sources because it replaces that fallback for `<script>`): each chapter is a blob iframe and Readium
  injects its helper scripts (CSS selector generator, execution prevention) as blob URLs. Without it the console
  shows "Loading the script 'blob:...' violates the following Content Security Policy"
- **Chapter sanitising**: Readium's iframe sandbox is `allow-same-origin allow-scripts` (set in the toolkit, not
  configurable), so the browser warns about it, and a chapter script CAN reach `window.parent` (the logged-in page
  and its CSRF token); the toolkit only fakes storage/cookies. `readium.strip_active_content()` therefore removes
  `<script>`, `on*` attributes, `srcdoc` and `javascript:` URLs from every XHTML/HTML/SVG member before
  `/show/readium/<id>/<path>` serves it. All markup is parsed (a regex prefilter misses `java&#9;script:`); clean
  documents keep their exact bytes; a member that cannot be parsed returns 404. Checked against all ~6,000
  markup members of the library: none unparseable, none modified. Keep it if the sandbox flags or the CSP change
- **Layout**: `#viewer` sits inside `#stage` (`read.html`, `css/main.css`). Readium measures its container's PARENT,
  so `#stage` carries the gutter (`padding: 0 clamp(56px, 7vw, 140px)`, room for the page-turn arrows; none under
  900px) and Readium sets `#viewer`'s width inline from the columns it can fit (about 680px per column: 1 column up
  to ~1,300px of stage, 2 at 1,920px, 4 at 2,560px). Chapter frames are `width/height: 100%` of `#viewer`. NEVER pin
  `#viewer iframe` to a fixed size or give `#viewer` a percentage width: the legacy epubjs rules (iPad
  960x515 / 460x740, `min-device-width` queries) froze the page at 960px on any large screen and were removed

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

### Clippings Admin (`/admin/clippings`)
- Admin-only dashboard (sidebar "Clippings", `role_admin`) for old newsletter / press clippings ("kliping"). Each
  clipping is ONE Markdown file `<id>.md`: YAML frontmatter = metadata, body = transcribed Markdown. The files are the
  only source of truth (no DB table); copy/edit/version them with any tool
- Storage: `$CLIPPINGS_DIR`, default `<app.db dir>/clippings` (`/config/clippings`, i.e. `./data/clippings` on the host,
  bind-mounted via `./data:/config`). Delete moves the file to `clippings/.trash/<timestamp>_<id>.md`, never unlinks
- Frontmatter keys (`cps/clippings_store.py: KNOWN_KEYS`): `number` (positive int, assigned by the store), `title` (required), `publication`, `date`
  (`YYYY`/`YYYY-MM`/`YYYY-MM-DD`), `issue`, `page`, `authors[]`, `tags[]`, `language`, `source_url` (http/https),
  `status` (`draft`|`published`, default `draft`). Unknown keys are preserved on every save. `id` = file name, built once
  from `<date>-<ascii title slug>` (`-2`, `-3` on collision) and never changes on edit
- Numeric alias: `create()` stores `number` = highest number ever used (live files + `.trash`) + 1, so a deleted
  clipping's number is never reused; `update()` keeps it (assigns one to a legacy file without it). `/kliping/<number>/`
  308-redirects to `/kliping/<id>/` (`pages/kliping/[id].astro`, `clippingByNumber()`); the slug id stays canonical. The
  seed drops a duplicate `number` with a `[seed]` warning
- Layers: `cps/clippings_store.py` (pure parse/validate/dump/storage + `render_markdown`; import-linter contract
  `clippings-store-is-pure`) and `cps/clippings.py` (blueprint, routes under `/admin/clippings*`). Markdown is
  rendered with markdown2 and sanitised by `clean_html.clean_string` (same as OCR/comments); the editor preview calls
  `POST /admin/clippings/preview`. Bulk import: upload `.md` files (frontmatter supplies metadata)
- Public site (Astro, `/kliping/` list + `/kliping/<id>/` detail): `frontend/scripts/seed-clippings.mjs` (run by
  `seed.mjs`, so `./build-frontend.sh`; reads `CLIPPINGS_DIR`, `data/clippings` on the host) snapshots ONLY
  `status: published` files into `src/data/clippings.json` + `src/data/clippings/<id>.json`. The directory is rebuilt as
  a whole, so unpublishing/deleting a clipping removes it on the next reseed + image rebuild; a missing source dir
  keeps the previous snapshot. Unparseable files are skipped with a `[seed]` warning. The seed's id/date/key rules
  mirror `cps/clippings_store.py`; change both together
- Public rendering is a SECOND Markdown renderer (`frontend/src/data/clippings.ts`, markdown-it with `html: false`, so raw
  HTML in a clipping is escaped, and `javascript:`/`data:` links are not linkified); the admin preview uses markdown2 +
  nh3, so they can differ on edge cases. Detail pages emit `NewsArticle` JSON-LD (`<` escaped), are in the sitemap
  (`utils/sitemap.ts`) and nav; filtered/paged list views are `noindex`
- Production Caddy forwards only listed prefixes to Flask; `/admin/*` already goes to Flask, so no proxy change. `/kliping/*`
  is served by Astro (the default), so no Caddy change either

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

- Legacy Calibre-Web URLs are deliberately left as 404 (`/author/stored/<n>`, `/category/stored/<n>`, `/formats/<sort>/PDF/<n>`,
  `/newest/<sort>/...`, `/read/<id>/text/*.xhtml`); they were ~80% of Search Console's "Not found (404)" sample. Two shapes
  are handled: `/book/<id>/<old-slug>/` 301s to the canonical slug (`pages/book/[id]/[slug]/index.astro`), and relative
  links inside EPUB text (`Section0006.xhtml`) are unwrapped on `/read/<id>/ocr/epub/` (`unwrapRelativeLinks`) so they stop
  being crawlable dead URLs
- Astro runs with `trailingSlash: 'always'`: every internal `href` and `canonical` MUST end in `/` (`/author/`,
  `/category/<id>/`, `${authorPath(a)}/`). A slashless link 301s, and a 2026-11 audit found 56% of internal links were
  slashless, which wastes crawl budget and inflates Search Console's "Page with redirect". Do not link `/osd.xml`
  (Flask serves it only under `/opds/osd`; the head link was removed after returning 404)
- A sitemap `/read/<id>/ocr/<fmt>/` URL answered `noindex` in 2026-11 because Cloudflare served a stale copy of the
  "not processed" stub (origin: `private, no-store` + `Cloudflare-CDN-Cache-Control: no-store`; edge: `public,
  max-age=15552000`, `cf-cache-status: HIT`). The cause was a Cloudflare Cache Rule matching `/read/*`; see
  "Cloudflare caching" below
- The sitemap lists `/read/<id>/ocr/<fmt>/` only for books in `frontend/src/data/ocr-ready.json`, written by
  `seed.mjs` from the OCR cache (`OCR_CACHE_DIR`, set by `build-frontend.sh`): entries of the current
  `CACHE_VERSION` (read from `cps/ocr_service.py`) that are `ready` and still match the library file's name
  and size. Pages for unprocessed books render a `noindex` stub, so they stay out of the sitemap. New OCR results
  appear in the sitemap after the next `./build-frontend.sh`; without the cache dir the previous manifest is kept
- EPUB text pages (`/read/<id>/ocr/epub/`, "Baca EPUB (teks)") are crawlable plain SSR HTML. The book page links them
  for every EPUB whose text extracts (`/api/read/<id>/ocr/status/epub` extracts inline, no GPU, so `available` means
  "has extractable text"); a corrupt EPUB (no `container.xml`, no text) gets no link and its API/page answer 404, not
  503. Text is extracted on the first status/page request, so a newly added EPUB is linked and readable at once; only
  the sitemap needs `./build-frontend.sh` to list it in `ocr-ready.json`. The reader notice and "0.0 detik" meta
  are shown for PDFs only
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
- A new file version needs NO purge: `/download` recomputes `version` and redirects to a new `/files` URL, which the
  edge fetches once. The old URL keeps serving its old bytes to anyone holding that exact link. `version` includes
  `last_modified`, so a metadata edit also creates a new URL (the file is fetched and cached again). Purge
  `/files/<id>/*` in Cloudflare ONLY when a book is deleted (cached copies stay reachable until evicted) or a file is
  replaced on disk without Calibre updating `last_modified`/size
- Kindle/Kobo clients and the Google Drive path skip the redirect and use the
  old direct `get_download_link()`
- **Cloudflare**: a dashboard Cache Rule must NOT match `/download/*`
  (a cached 200/302 there bypasses the counter). Cache `/files/*` only

### Cover Images
- `Cache-Control: public, max-age=86400` (1 day) from Caddy's `@covers` block; the URL carries no version, so a changed
  cover stays stale up to a day in browsers and at the edge. Cloudflare previously rewrote `/cover/<id>` to 14 days
  (see "Cloudflare caching")
- `Vary: Accept, Accept-Encoding`
- WebP served to supporting browsers via `?fm=webp` or `Accept` header
- **Generated covers**: a book with no cover (`has_cover = 0`, or its `cover.jpg` is missing) gets a title + publisher
  card from `cps/cover_placeholder.py` (Pillow only, bundled Open Sans, neutral grey card, near-black type, no colour,
  2:3, import-linter contract `cover-placeholder-is-pure`). It is rendered on demand by `get_cover_on_failure()` in
  `cps/helper.py` at the SAME URLs as real covers (`/cover/<id>`, `/cover_thumb/<id>[/sm|md|lg]`, `/opds/cover/<id>`),
  so every consumer (Astro cards, book page, search, OG image, sitemap image, OPDS) needs no special case and
  `seed.mjs` always emits `/cover_thumb/<id>` and `/cover/<id>/og`. Output is memoised in-process (`render_cached`,
  256 entries) and sent with `max-age=86400`, `Vary: Accept` (WebP or JPEG). Only an unknown/invisible book id still
  gets the static `generic_cover.jpg`, so nothing about hidden books leaks. To change the look edit
  `cover_placeholder.py` (the whole template is that one file); a new look reaches browsers/CDN within a day. Titles
  are HTML-unescaped and `_` turned into spaces (several coverless titles are slugs or contain `&amp;`)

### Cloudflare caching
Cache policy lives in Caddy and the app, not in Cloudflare (decided 2026-11).
- NO Cloudflare Cache Rule, Page Rule, Transform Rule or Browser Cache TTL override may match `/read/*`, `/download/*`,
  `/show/*`, `/send/*`, `/api/*`, `/ajax/*`, `/admin*`, `/login`, `/me`, `/opds*`, `/kobo/*`. The origin already sends
  `private, no-store` + `Cloudflare-CDN-Cache-Control: no-store` for them. A rule matching `/read/*` made the edge
  serve ONE cached reader shell to every visitor (same CSRF token, same saved bookmark) and rewrote the browser TTL
  to 180 days; on `/download/<id>/<fmt>` that header lets a browser skip the server, so the counter misses repeats
- Verify after any Cloudflare change: `curl -I` on `/read/<id>/pdf`, `/read/<id>/ocr/pdf/` and `/download/<id>/pdf`
  must show `private, no-store` and no `cf-cache-status: HIT`; two anonymous fetches of `/read/<id>/epub` must carry
  different `csrf_token` values
- Already cached correctly at the edge: `/files/*` (immutable, 1 year) and `/_astro/*`. Extensionless `/cover*` and
  `/series_cover*` are `DYNAMIC` unless a Cache Rule "Eligible for cache, respect origin headers" matches them
- Resolved 2026-11-17: the 180-day `cache-control` on `/read/*` and `/download/*` (and 14 days on `/cover/*`) came from
  three Cloudflare "Modify Response Header" overrides ("override books download/cover/read caching ttl"), a separate
  list from Cache Rules. They are disabled; do not re-enable them. Keep the Cache Rules `books caching` (`/files/*`,
  immutable) and `books cover caching` (Edge TTL = origin header) ENABLED: `.epub` files and extensionless `/cover*`
  URLs are `DYNAMIC` (uncached) without them

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
