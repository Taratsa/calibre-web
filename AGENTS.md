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

- **Health check**: `curl --max-time 25 /healthz/live`, interval 30 s, timeout 30 s, 4 retries. Flask is ONE gevent loop,
  so a traffic spike or a bulk import makes the endpoint answer in 1-4 s and now and then past the old 10 s timeout (2 of
  5 consecutive checks timed out on 2026-11-24 with CPU at 100%). Slow is not dead; nothing restarts a container on
  `unhealthy` here, so the check is a status signal, not a trigger. Diagnose a busy Flask by thread: the `python3`
  main thread is the web loop, `Thread-N` is the task worker (OCR, thumbnails, duplicate scans)
- **Language codes stay Calibre's** (`cps/isoLanguages.py`): the library stores ISO 639-2 terminologic codes (`nld deu
  fra msa zho ces ...`), and Calibre's own `canonicalize_lang()` accepts exactly those (it returns None for the
  bibliographic aliases `dut ger fre may chi cze ...`; all 424 codes in `iso_language_names.py` pass it). By decision
  (2026-11-24) the upload path does NOT translate aliases: an upload whose metadata says `dut` is reported as "'dut' is
  not a valid language" and gets no language. An earlier version mapped the 20 aliases to their terminologic twins;
  every target was a Calibre-valid code, so it stored nothing foreign, but it was removed to keep the app strictly on
  Calibre's own vocabulary. The `hermes` bulk import is the source (116 such errors in 2 hours): fix it to send
  `nld`/`deu`/`fra`/`msa`, or set the language in Calibre afterwards

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
- **Fetch from the browser when yt-dlp is blocked** (2026-11-26): on this server every yt-dlp/Innertube client gets
  "Sign in to confirm you're not a bot", and a raw `get_transcript` call fails with `FAILED_PRECONDITION`, but a real
  Chromium tab (eval `browser`) loads the watch page and its "Show transcript" panel works. The 53 `mei-1998` YouTube
  videos were filled that way: open `watch?v=<id>`, expand the description, click "Show transcript" (a real click, then a
  JS click if no segments appear), read `transcript-segment-view-model` (`.ytwTranscriptSegmentViewModelTimestamp` and
  `[role="text"]`), group into ~280-character paragraphs like `parseJson3()`. The panel names no language, so `lang` was
  guessed from stopwords and then checked by hand: one Thai track was mis-tagged `en`, and `w9cG81ZXqXw` is
  garbled Portuguese ASR of Indonesian audio, so it was stored as `lines: []`. 38 of 53 have text (29 `id`, 8 `en`,
  1 `th`); 15 have none (14 with no panel, mostly the AP Archive clips, plus that one). Tracks are often auto-generated, so the page says so
- Internet Archive videos (`type: "archive"`) have no transcript (no caption files; `getTranscript` is YouTube-only)

### Video Catalogue (`/video/`, `/video/<id>/`)
- Two sources in one list (`frontend/src/data/videos.ts`): the WordPress crawl
  (`bun run crawl:videos`, upstream `Taratsa/pustaka-video`) and the videos of the
  Arsip Mei 1998 catalogue (`bun run import:videos-mei98`,
  `scripts/import-mei98-videos.ts`). Collection entries carry `collection: "mei-1998"`
  and `postId: 0`; only their selection (video ID, title, date) comes from Logos
  (`k` "Video" for clips, "Audio/video" for footage uploaded to an archive), and the
  rest from the source itself: YouTube oEmbed for `v.yt` (`type: "youtube"`),
  `archive.org/metadata/<id>` for `v.ia` (`type: "archive"`, thumbnail
  `archive.org/services/img/<id>`, channel = item creator). An Internet Archive item
  that is not a public movie (e.g. the audio-only `pyk6qfgqs…`) is skipped with a
  warning. `crawl:videos` keeps entries from other collections, so a re-crawl does not
  drop them; `import:videos-mei98` is idempotent and skips videos already present
- Whole channels come through `bun run import:channel -- --channel @jakartanicus
  --collection jakartanicus` (`scripts/import-channel-videos.ts`, 2026-11-26): `yt-dlp --flat-playlist`
  on the Videos and Live tabs (that listing is NOT bot-checked here), then each new video's watch page for
  the publish date (`videoDescriptionHeaderRenderer.publishDate`) and description
  (`expandableVideoDescriptionBodyRenderer.attributedDescription` when YouTube sends it). It is resumable:
  it saves every 25 videos, skips ids already present and retries the rest on a rerun (1,132 videos in 43 min
  at `--delay-ms 1500`, 13 reran clean). 1,151 `jakartanicus` entries (2014-2026), channel name
  "Jakartanicus"; the listing carries no dates, so `--extractor-args youtubetab:approximate_date` (all
  "today") is not usable. Descriptions come back empty for these pages, so their detail pages say the
  description is unavailable
- Detail pages embed `youtube-nocookie.com` or `archive.org/embed/<id>`; a YouTube video
  the owner does not allow to be embedded (`embeddable: false`, e.g. `CPpVu28RIxg`)
  renders a thumbnail link to YouTube instead. YouTube descriptions need
  `bun run enrich:video-descriptions -- --collection mei-1998 --concurrency 1
  --delay-ms 2500`: watch pages answer 429 after a burst, and `yt-dlp` asks for a
  "not a bot" sign-in on datacenter IPs (Archive descriptions come with the import)

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
- `frontend/src/pages/search.astro` calls `searchCatalog(request)` in `frontend/src/utils/search.ts`, which returns
  every match sorted; the page shows 48 per page (`?page=N`). The index is built once per SSR process over
  `frontend/src/data/books.json` with boosts title 4 / authors 3 / tags 2 / series 2 / publisher 1, `prefix: true`,
  `fuzzy: 0.2`, `combineWith: 'AND'`
- Multi-term queries are AND (all terms must match); typo tolerance and prefix matching come from the fuzzy/prefix
  options - no substring-splitting heuristic (removed with the old linear-scan scoring)
- **Advanced search** (same page, same index; a `<details>` panel under the main box, opened by `?advanced=1` or when
  any field is set; plain GET form, no client JS):
  - Main box syntax: `"exact phrase"` (whole words in order inside ONE field: title, author, a tag, series or
    publisher), `-word` (removes books matching that word, prefix match), `-"phrase"`. An unclosed quote or a lone `-`
    is read as plain words, never an error
  - Field boxes `title`, `author`, `publisher`, `series`, `tag`: restricted to that field and EXACT-PREFIX (fuzzy 0),
    unlike the main box, so "aidit" does not return "Audit" or "Adit". Boxes combine with AND
  - Filters `lang` (ISO 639-2 as stored: `ind`, `eng`, `msa`), `format` (`pdf`, `epub`), `from`/`to` publication year;
    `sort` = `relevance` | `newest` | `title` | `year`. Language/format choices and their counts are read from the
    catalog (`searchFacets()`), not hard-coded
  - Only ~1,500 of ~8,300 books have a publication year we trust (`reliablePubdate()` drops Calibre's import-date
    placeholder), so a year filter excludes every undated book; the status line says so. Do not "fix" it by using
    the raw `pubdate`
  - Active criteria show as removable chips (each links to the same search without it). Search result pages are
    `noindex,nofollow`; old `/search?q=` links 301 to `/search/?q=` and keep the query
- Results reuse `BookGrid`/`BookCard`, so a search hit looks like every other listing and a coverless book gets its
  generated cover
- Results are plain SSR HTML (no client JS); identical queries are CDN-cached (`s-maxage=300`,
  `frontend/src/middleware.ts`)
- The dead client-side typeahead (`frontend/src/utils/liveSearch.ts`) was removed; do not reintroduce a second index

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

### Full-text search (inside the book text, Manticore)
- `/search/text/` (Astro, SSR, `noindex`) searches the OCR/EPUB text itself and shows the best passage per book with
  highlighted matches, where in the book it sits ("sekitar 45% dari buku", chunk number / last chunk of that format,
  `lastChunks()`) and a link to `/read/<id>/ocr/<fmt>/`. Optional `format=pdf|epub` (radio group + removable chip;
  anything else means both). The catalog search (`/search/`, titles/authors/tags) is separate and unchanged
- **Search UI (shared)**: `components/SearchTabs.astro` ("Katalog" / "Di dalam teks") sits above the form on both pages and
  carries the current `q` to the other mode, so the same words can be re-run. The sidebar box is ONE input with two
  submit buttons ("Katalog" = form action `/search/`, also the Enter default; "Di dalam teks" = `formaction="/search/text/"`)
  plus the "Pencarian lanjutan" link. The catalog results page links "Cari "<q>" di dalam teks"; the empty state says
  the catalog only covers titles, authors and categories. The text start page shows example queries, a collapsible
  syntax help (open only before the first search) and the number of searchable books (`searchableBooks()`, one cheap
  query, start page only). Controls are at least 36-44 px high (measured at 390/820/1365); `autofocus` only on an empty
  search. The advanced panel on `/search/` is grouped into fieldsets (Judul dan pengarang / Jenis buku / Urutan), shows
  a count badge of active criteria on its summary, and has its own "Terapkan" button so the submit does not scroll away
- Engine: **Manticore Search 32.1.3** (`manticore` service in `docker-compose.yml`, container `pustaka-manticore`,
  volume `manticore_data`, `mem_limit: 3g`). It has NO authentication, so it only joins the internal `search_net`
  network (Flask + Astro + Manticore, no route out, no published port); never publish 9308. The decision came from a
  benchmark on the real corpus (745,872 chunks): 1.0 GB index (Meilisearch 8.9 GB, FTS5 2.05 GB), 138 s build
  (Meilisearch 803 s), replacing one book in ~80 ms (Meilisearch 66 s), 237 q/s with 8 clients. Rejected: SQLite FTS5
  (23 q/s and p95 1.9 s at 2x size, one gevent worker would block), Meilisearch (index size, 10-word query cap, 65,535
  positions per field, slow updates)
- Layout is defined in `cps/fulltext.py` (pure): table `text_chunks(body, book, fmt, seq)`, one document per ~900
  characters cut on paragraph boundaries, id = `book*1_000_000 + format*500_000 + seq` (EPUB=0, PDF=1), so one format
  or one book is a contiguous id range and is deleted without a scan. Table options: `min_infix_len=2` (needed for
  `fuzzy=1`), `index_exact_words=1`. Writer: `cps/fulltext_store.py` (requests, short timeouts, `FulltextUnavailable`).
  Reader: `frontend/src/utils/fulltext.ts` (server-side only, `MANTICORE_URL`). Import-linter contracts
  `fulltext-is-pure` and `fulltext-store-is-a-client`
- Index upkeep (derived data; the OCR cache stays the source): `extract_book_ocr()` indexes a format right after it
  caches fresh text (`replace_format_later`, background thread, never fails the OCR job); `delete_whole_book()` and a
  deleted format remove their chunks; the admin button "Rebuild Full-Text Index Now" (`POST /admin/fulltext/run`,
  `tasks/fulltext_index.py`) reindexes everything, indexes BOTH formats of a book, skips PDFs without cached text and
  drops books that left the library. ~250 s for 8,386 formats. After a bulk reindex run
  `optimize index text_chunks option cutoff=1, sync=1` (~140 s) to merge to one disk chunk (1.19 GB). A write that
  happens while Manticore is down is lost until the next full rebuild
- OCR cache housekeeping: a cache file is `<book id>-<sha256 of the request>.json`, so a `CACHE_VERSION` bump, a layout
  version bump or a changed source file writes a NEW name. `extract_book_ocr()` calls `_prune_superseded()` right
  after a successful `_save_cache()` and deletes the other files of the same book and format (a file that does not
  parse is left alone; a failed delete is logged, never fails the job). Before this (2026-11-26) nothing deleted them:
  1,544 stale files (231 MB of 1.6 GB) were removed by hand. Books never re-extracted keep their old-version file, and
  files of books deleted from the library are not pruned. The cache is large because it IS the text: 1.22 G characters
  (EPUB 11.4k files 149 MB; PDF 9.4k files 1.14 GB, median file 10 KB, p90 176 KB, largest 4 MB), HTML markup only 7%
- Query syntax (`matchExpression()` in `frontend/src/utils/fulltext.ts`, the only copy): all words must be in ONE passage,
  `"exact phrase"`, `-word`, `-"phrase"`; 7+ plain words need 60% of them (a pasted sentence); every Manticore
  operator is stripped; max 200 characters, 12 words. When the exact words match nothing the query is retried with
  `fuzzy=1, distance=1` (typo tolerance; distance 2 made "zzzxqj" match a real book). Counts are exact
  (`count(distinct book)`) but only the top 500 books can be paged
- Failure: `/search/text/` answers 503 + `Cache-Control: no-store` when Manticore is down (middleware.ts only rewrites
  200 HTML), and the rest of the site keeps working. Do not add `/search/text/` to the sitemap; it is `noindex`
- Limits: OCR damage in the text ("provinsinusa", "diff erance") is found only when typed that way; no stemming (the
  word "buruh" does not match "perburuhan"; use fuzzy or a longer word); snippets are plain chunks, not page-accurate
  anchors (the reader has no passage anchors, so a hit opens the book's text page)

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
- `cps/text_analysis.py`, `cps/text_analysis_store.py`, `cps/tasks/text_analysis.py`, `cps/sentiment_lexicon.json` and
  `rust/taratsa_text/` - Corpus text statistics and the book-page tone line for `/data` (see Corpus Statistics)
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
- Browser error tracking (Umami v3.5+, `data-errors="true"` on the tracker in `BaseLayout.astro`): uncaught JS errors
  and unhandled promise rejections are grouped under Umami's Monitoring → Errors. The self-hosted server must be on
  v3.5+ (migration `27_add_error_tracking`)
- Umami `epub-read` / `pdf-read` events (`book_id`, `format`, `title`) fired on load by the standalone
  reader pages `read.html` / `readpdf.html` via the shared `cps/templates/umami_reader.html` partial
  (these pages do not extend `layout.html`, so they load the Umami script themselves)
- Formbricks feedback widget (`BaseLayout.astro`, served from `feedback.taratsa.id`, workspace `cmuxi018b…`): a failed
  first sync makes the SDK store `{status:{value:"error",expiresAt:+10min}}` with NO config; until it expires the SDK
  skips initialization and its page-view check throws "config is null, maybe the init function was not called?" on
  every page load (also seen as an unhandled `Cannot read properties of undefined (reading 'data')`). The embed
  therefore drops a stored `error` status before calling `setup`, so a visit made after a failure is not wasted. That
  alone was NOT enough (still reported 2026-11-25 from an iOS webview): when the VERY FIRST sync fails, `setup()`
  stores the error state and the SDK then runs its page-view check anyway, which throws the unhandled rejection from
  inside the SDK (no `try/catch` of ours can reach it). Reproduced in Chromium with the `/environment` request aborted
  or answered 503: the old embed threw on every load, the new one never. So the embed now makes the SDK's own first
  request itself (`GET .../api/v1/client/<workspace>/environment`, same `Content-Type` header, so the same CORS
  preflight) and only calls `setup()` when it answers `ok`; otherwise the widget stays off for that page view and
  nothing is stored. The failure itself is upstream (one edge 503 on `/js/surveys.umd.cjs` and aborted CORS preflights on
  `/api/v1/client/<workspace>/environment` were observed); `user` identification is enterprise-only on that server
- Anonymous download tracking for Hot Books
- OPDS feed for ebook reader compatibility
- App-level WebP conversion for cover images
- Canonical URLs for SEO. Numeric `/book/<id>/` URLs 301-redirect to the slug
  form: Caddy's `@legacy_book` matcher sends them to Flask (`web.show_book`),
  which resolves the ID via `frontend/src/data/book-slugs.json` (generated by
  `seed.mjs`). The Flask container mounts the whole `frontend/src/data` directory read-only at
  `/app/calibre-web/seed-data` and `BOOK_SLUGS_PATH` points at the file inside it, and `_get_book_slugs()`
  (`cps/web.py`) re-reads it whenever its mtime changes - so seed regenerations take effect without rebuilding the
  backend image. Mount the directory, never the single file: a single-file bind mount follows the inode, so a git
  stash/checkout/pull (which replaces the file) leaves the container on a deleted copy and new books 404 on
  `/book/<id>/` until a restart (happened 2026-11-25, ids 21585-21617).
- **Frontend design system**: Scandinavian minimal
  (github.com/ericzakariasson/scandinavian-design). Neutrals are alpha-black
  ladders (light) / alpha-white ladders (dark) - never warm/cool gray casts;
  focus rings, stars, and search highlights are neutral; the red `--accent`
  token is reserved for primary actions only. UI border-radius is capped at
  4px. All tokens live in `frontend/src/styles/global.css`; keep new
  components on `var(--*)` tokens rather than hardcoded colors.
- **Logo in dark mode**: the logo is black on transparent. `public/logo-taratsa-white.{png,webp}` are the same image
  with every pixel white and the alpha channel unchanged. `BaseLayout.astro` renders both `<img class="logo-light">` and
  `<img class="logo-dark">` in the brand link and `global.css` shows one, using the same rules as the theme toggle
  icons (system `prefers-color-scheme` unless the reader chose a theme, and `data-theme` wins). A `<picture media>`
  would ignore the manual toggle, so it is not used. The Flask templates (`cps/templates`, legacy UI) and the JSON-LD
  `logo` keep the black PNG. Regenerate the white copy if the logo changes (Pillow: keep alpha, set RGB to 255)

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
- Bulk imports: `notify_book_changed()` (`cps/duplicate_index.py`) is DEBOUNCED. It collects the changed ids and queues
  ONE incremental scan after `SCAN_DEBOUNCE_SECONDS` (20 s) without another change, and never later than
  `SCAN_MAX_DELAY_SECONDS` (120 s) after the first, so an import of N books costs about N x 3 s / 120 s scans instead
  of N. The scan is queued from a daemon `threading.Timer`; ids pending at a crash are lost, but the index is already
  marked pending and the startup `queue_full_scan_if_stale()` heals it. If a scan is still WAITING in the worker queue it
  absorbs the ids (`TaskDuplicateScan.add_book_ids()`, closed under a lock when the scan starts). An incremental scan
  whose index is behind the library by more books than it covers (`has_valid_duplicate_index_baseline()` false), or
  whose batch exceeds `MAX_INCREMENTAL_BOOK_IDS`, rebuilds the index in place (`_full_scan()`, ~5 s) instead of marking
  it "pending: manual scan required" and exiting. History: before this, 251 of 285 scans in 30 minutes exited at "no
  valid duplicate index baseline" and the index stayed 424 books behind; a first version without the debounce still
  queued 40 scans for 80 uploads
- Known race: the scan reads through the process-wide `ub.session` while uploads commit on it, so a scan that overlaps
  an upload commit can fail with "This session is in 'prepared' state" (logged, the task fails, the next scan heals the
  index; 5 of ~40 scans failed that way during an 80-upload import, no 500s and no failed uploads). Zero occurrences in
  the 7 h before the change, when scans exited early; the likely reason is that they now hold the session for seconds
  instead of milliseconds [INFERENCE]. The structural fix is a private short-lived `Session` for the scan's reads, like
  the dedicated write path (`_app_transaction()`); about 20 `ub.session` call sites in `cps/duplicate_index.py`
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
  (`components/CorpusAnalysis.astro`, styles in `src/styles/analysis.css`). Per-book analysis is limited to the
  "Tentang teks" block on book pages (see below)
- Statistics are derived from the OCR/EPUB text cache, never from the files: `cps/text_analysis.py` (the Python seam:
  stopwords, constants, `CorpusBuilder`), `cps/text_analysis_store.py` (storage), `cps/tasks/text_analysis.py`
  (`rebuild_corpus`, `TaskTextAnalysis`)
- The computation is the PyO3 extension in `rust/taratsa_text` (crate `taratsa_text`): `CorpusBuilder.add()/result()/
  book_text()/author_text()` plus `html_to_blocks()`, which `cps/fulltext.py` also uses. `add()` and the similarity
  pass run with the GIL released, so the single gevent loop keeps serving during a rebuild. `cps/text_analysis.py`
  loads the stopword file (the crate never reads config) and re-exports the tuning constants from the crate's
  `settings()`; `src/constants.rs` is the only place they are defined. Change a rule there, then bump
  `ANALYSIS_VERSION`. The Dockerfile builds the wheel in the `builder` stage with the venv's own interpreter; local
  dev needs `cargo` + `maturin develop --release` (or `maturin build` + `pip install`) before importing
  `cps.text_analysis`/`cps.fulltext`, and `cargo test` in the crate covers the text pipeline. Measured 2026-11-24 over
  14,936 cached documents: 159 s end to end, 1.3 GB peak RSS (previous pure-Python implementation: 759 s, 3.4 GB; the
  Rust figure includes reading the cache, the Python one excluded it), with `corpus.json`, `book_text.json` and
  `author_text.json` byte-identical between the two
- Hyphenation breaks are joined before anything counts words (`html_to_blocks` in `rust/taratsa_text/src/text.rs`):
  an attached hyphen, whitespace (a line end, or the space TurboOCR writes) and a lowercase continuation become one
  word (`Nasio-\nnal` and `mengu- mumkan` -> `Nasional`, `mengumumkan`). A repeat (`kata- kata`) stays reduplication,
  a spaced dash (`sekunder - pertanian`) is not a break because the hyphen is unattached, and digits on the left
  (`1990- an`) are left alone. Joined without the hyphen: on HistoriKorpus (5,383 paired OCR/ground-truth newspaper
  excerpts, CC BY 4.0, doi:10.17632/b6p3jgdx83.2) that scored WER 35.06% -> 30.22%, CER 9.01% -> 8.64%, against
  36.54% keeping the hyphen. The cost is a real compound broken at a line end (`sosial-` + `ekonomi`) losing its
  hyphen. The same function cuts the full-text chunks, so a change here needs a full-text reindex as well as the
  corpus rebuild (`ANALYSIS_VERSION` 10)
- Rebuild speed (measured 2026-11-24, 8 cores, OCR job running alongside): `build_corpus()` feeds `CorpusBuilder.add_many()`
  in batches of up to 64 documents or 48M characters. Tokenizing (HTML -> blocks -> sentences -> folded tokens, the pure
  part) runs on a rayon pool of at most 6 threads, always leaving one core for the web loop; counting stays serial and in
  input order, because vocabulary ids and the n-gram tables' singleton drops depend on order. Output is bit-identical
  to a serial `add()` loop (digest of `result()`, `book_text()` and `author_text()` equal over 19,378 documents, and a
  `cargo test` covers it). Corpus rebuild 175 s -> 91 s. Where `add()` spends its time (3,946 documents): tokenizing
  ~55%, n-gram counting ~35% (bigrams and trigrams hash into shared tables, so it is not parallelised), vocabulary
  interning ~8%. ASCII tokens are lower-cased bytewise instead of through Unicode case folding (identical for ASCII).
  Full-text reindex: the Manticore writes dominate, so `TaskFulltextIndex` hands each document to 4 writer threads
  (1 writer 2,087 chunks/s, 4 writers 3,336, 8 writers 3,434 on a populated table; bulk size 1000 vs 5000 made no
  difference) and locks per book instead of globally: 303 s -> 181 s. `optimize index text_chunks option cutoff=1,
  sync=1` afterwards still takes ~145 s and is not parallelisable
- Tone line on the book page ("Sentimen kata"): `profile.sentiment` = `{score, positive, negative}` or `null`, where
  `score` = (positive - negative) / hits in [-1, 1]. Words come from `cps/sentiment_lexicon.json` (hand-curated
  Indonesian evaluative words, single tokens, under this repository's licence - InSet has no licence and VADER's
  lexicon is English); the rules are VADER's design (`rust/taratsa_text/src/sentiment.rs`): a negator within the 3
  previous words flips the sign, a booster within 2 doubles the hit, a contrastive conjunction ("tetapi", "but") ends
  the negation scope. Scored per sentence. Only Indonesian/Malay books (Calibre `ind`/`msa`, or untagged) are scored:
  an English book scored by this vocabulary is noise. Fewer than `SENTIMENT_MIN_HITS` (50) hits means `null`, so
  leaflets and thin OCR get no line. Measured on 400 books: median 2.5% of tokens are polarity hits, 237/400 books
  pass the gate, ratio quartiles -0.10 / +0.10 / +0.28. It measures WORD VALENCE, not the book's argument (a
  nationalist or religious register skews positive, a report on violence negative); the page always prints the counts
  and says it is a rough estimate. The profile also carries `trend`: 16 sections from start to end of the book, each
  the same ratio over that section, `null` where a section has fewer than `SENTIMENT_TREND_MIN_HITS` (5) hits; the
  value is an empty list when fewer than 8 sections qualify, and the page then draws no graph. `emotions` is
  `[[code, hits], ...]` over Plutchik's eight (`cps/sentiment_lexicon.json` -> `emotions`: anger, fear, sadness, joy,
  trust, surprise, disgust, anticipation; a word may carry several), most frequent first, empty below
  `SENTIMENT_EMOTION_MIN_HITS` (30); a negated emotion word ("tidak takut") is dropped, not flipped. The page shows the
  top three as shares of all emotion words. Sentence-level sanity check against human labels (IndoNLU, MIT): `smsa`
  test 500 sentences -> 64% accuracy / 0.61 macro-F1 (majority baseline 42%), `emot` 440 tweets -> 16-22% / 0.28-0.33
  (majority baseline 25%), rising to 21.6% / 0.33 with the love words (cinta/mencintai/tercinta/kekasih -> joy,
  sayang/menyayangi -> trust) and affix stripping. So it is a book-level aggregator, not a sentence classifier; a
  fine-tuned IndoBERT (published ~93% smsa / ~72% emot) is the only large accuracy jump, at days of CPU for the library. No Rust crate covers Indonesian emotions (the crates are English polarity
  or NPC affect models; NRC's emotion lexicon is English and research-only), so the mapping lives in the lexicon file. A BERT/rust-bert scorer was rejected: ~120-290 CPU hours for the library plus
  1-2 GB of weights, against milliseconds for the lexicon
  Two token rules (2026-11-26 audit of book 21708, "Symposion ...": 567 positive / 515 negative was labelled
  "cenderung negatif"): a reduplicated token (`kesulitan-kesulitan`) scores as its base word, because the hyphenated
  form matched nothing and the lexicon only holds bare forms; and `salah` followed by `satu`/`seorang`/`sebuah`/a
  small number ("salah satu" = "one of") is neutral (`partitive_heads`/`partitive_tails` in the lexicon; 64% of all
  `salah` in a 4,000-book sample was this phrase, 8.9% of every negative hit). The page label says "cenderung
  negatif" only when negative words are the majority (positive share < 0.5), "cenderung positif" from 0.70, and
  "berimbang" between; an older corpus-quartile cut-off (0.53) labelled 336 of 6,090 books "negatif" while they had
  more positive than negative words. Not done, and measured as the next biggest error: old-spelling Indonesian
  (`jang`, `dj`, `tj`; about 1,500 books) misses the lexicon, English books (about 2,400) are not scored, and
  `perang`/`benar`/`terang` are scored out of context; English books are also left unscored by design
- Sentence tone ("Nada kalimat (model)", same page, separate from "Sentimen kata"): a multilingual transformer reads a
  sample of the book's sentences, so it works for every language in the library and is not fooled by context-free
  words. Model `Horizon-Labs/multilingual-sentiment-small` (Apache-2.0, ModernBERT-small, 3-way negative/neutral/
  positive); int8 ONNX file taken from the model repo (`onnx/model_quantized.onnx`, 268 MB) in the Dockerfile's
  `models` stage, SHA-256 pinned, into `cps/sentiment_model/` (git-ignored). Runs on ONNX Runtime through the `ort`
  crate (`2.0.0-rc.15`, `load-dynamic`: the crate loads `libonnxruntime.so` from `ORT_DYLIB_PATH`, copied out of the
  `onnxruntime` wheel in the `models` stage) and the `tokenizers` crate, from `rust/taratsa_text/src/onnx.rs`
  (shared engine, batches sentences by length) and `classifier.rs`; the Python seam is `cps/sentiment_store.py` (I/O +
  cache) and `cps/sentiment.py` (pure calibration). Replaced candle after measuring on 96 real book sentences: candle
  fp32 3.9-6.0 sentences/s, ONNX Runtime int8 23.4/s on 4 threads (11.6/s on 1), 99.0% label agreement, mean
  probability difference 0.0026, per-sentence polarity correlation 0.9995. `SENTIMENT_THREADS` (default 4) sets the
  intra-op threads. Measured on 400 human-labelled NusaX sentences per language:
  81.8 macro-F1 Indonesian, 82.6 English (the lexicon: 57.6 / 14.1); on Indonesian rewritten to Van
  Ophuijsen spelling 76.2 (lexicon 43.7). NusaX is review text, so these are direction, not book-level accuracy;
  no human-labelled sentences from this library were scored yet
- Old-spelling normalisation: `rust/taratsa_text/src/orthography.rs` (rules) and `cps/sentiment_sample` (apply).
  Rules `dj->j tj->c nj->ny sj->sy ch->kh oe->u j->y`, order significant (`dj` before `j`). The system is detected per
  document (share of `dj`/`tj` tokens >= 0.4% -> Van Ophuijsen; else `oe` >= 0.2% -> Soewandi: `oe` only; else modern:
  nothing changes), so modern books are never rewritten. Derived and tested on DOIL (`doi:10.5334/johd.564`, CC BY
  4.0): rules picked on half of the 44 pre-1972 works; exact match against its human `standardized_eyd` column on the
  other half 72.1% -> 98.0%, and over all 58 works with the detector 78.7% -> 98.0% (Van Ophuijsen 65.0% -> 97.3%,
  Soewandi 82.4% -> 98.2%, modern 98.7% unchanged). Remaining errors are almost all `j->y` where `j` is right
  (`saja`, `menjadi`, `wajan`); a word list would fix them
- Sentence tone data flow: admin button "Compute Sentence Tone Now" (`POST /sentiment/run`) queues
  `TaskSentenceTone` (`cps/tasks/sentiment.py`); ~1.2M sentences for ~20.7k books (60 sampled sentences each,
  sequential: throughput is flat across threads at the measured ~6 sentences/s fp32) - about two days of CPU. The task writes the
  file incrementally every few batches, and the first full pass is run as a separate process so the worker queue (OCR,
  duplicates, full text) is not held for days. It writes `<OCR_CACHE_DIR>/../analysis/sentiment_sentences.json`
  (`{version, built_at, model, books: {id: {score, positive_share, sentences}}}`, version =
  `SENTENCE_TONE_VERSION` in `cps/sentiment.py`, not `ANALYSIS_VERSION`). Sampling is deterministic per book (the 60
  sentences with the smallest hash of book id and index), so a rerun scores the same sentences. `score` = mean
  (positive probability - negative probability) over the sample, calibrated across the library (shift so the median
  book is 0, scale so the middle half reaches about +-0.25, clip +-1, scale capped at 4). `positive_share` = share of
  non-neutral sentences called positive, `null` below 30 sentences. The page shows "cenderung positif" from +0.25,
  "cenderung negatif" at or below -0.25, otherwise "berimbang". `seed.mjs` (`loadSentenceTone()`) merges the record
  into `books/<id>.json` as `text.tone`; a missing or version-mismatched file means no line, never a stale one.
  Re-run the task and then `./build-frontend.sh` to publish new tone numbers
- Model emotions ("Emosi dominan (model)", same page, next to the lexicon's "Emosi dominan"): one RoBERTa per
  language, both MIT. Neither repo ships ONNX, so the Dockerfile's `models` stage (Python 3.12, torch 2.15,
  transformers 4.57.1, onnx 1.23.2, onnxruntime 1.32.0; `docker/export_emotion_onnx.py`) exports each checkpoint and
  dynamically quantizes it to int8 (125 MB instead of 480 MB); the export is deterministic (two runs, same SHA-256)
  and every resulting file is pinned, so a tool upgrade fails the build instead of moving every book's emotions. Int8
  costs 0.3-1.0 macro-F1 and runs 2.3-2.6x faster: Indonesian EmoT 72.1 -> 71.8 (46.0 vs 17.6 sentences/s on 4
  threads), English GoEmotions 75.4 -> 74.4 on 800 sentences (92.0 vs 39.3/s). Fp32 results: candle (which has no
  `roberta` module but loads these via its `xlm_roberta` one) matched torch on 96 sentences at 100% label agreement.
  Models: Indonesian: `StevenLimcorn/indonesian-roberta-base-emotion-classifier` (EmoT 5 labels), 72.1 macro-F1 /
  71.8 accuracy on the EmoT test set; English: `SamLowe/roberta-base-go_emotions` (GoEmotions 28 labels), 79.1 / 84.2
  on the single-label GoEmotions test set under a coarse 5-way mapping. Rejected after measuring: one multilingual
  model (`tabularisai/multilingual-emotion-classification`, XLM-R) 59.4 Indonesian / 43.6 English, and
  `Aardiiiiy/EmoSense-ID` (BERT, Plutchik 8) 46.3 Indonesian. Routing: Calibre tag `eng` -> English model, `ind`/`msa`
  -> Indonesian, untagged decided on function words in the sampled sentences (English only if >1.5x Indonesian); no
  other language gets model emotions. The model reads the first 40 sentences of the tone sample (same deterministic
  sample), stores its top three labels with shares of the non-neutral labels as `tone.emotions` plus
  `tone.emotion_language`; "neutral" is dropped. The page maps both label sets to Indonesian names. Costs ~2x the tone
  pass; on ONNX the library run takes about a day and a half (see below). Sentence emotion accuracy is measured on tweets/reviews, not book
  prose
- Storage: `<OCR_CACHE_DIR>/../analysis/corpus.json` (`/config/ocr-cache/analysis`), rebuilt as a whole, never
  patched. Bump `ANALYSIS_VERSION` whenever a metric or its definition changes (an older file is then ignored until
  the next rebuild)
- Book page "Tentang teks" block (`pages/book/[id]/index.astro`, styles in `book.css`, replaced the word cloud): the
  corpus rebuild also writes `analysis/book_text.json` (`{version, built_at, books: {id: profile}}`; per-book data, so
  it is a separate file from the public `corpus.json` and has no API route). `seed.mjs` (`loadBookText()`) merges the
  profile into `src/data/books/<id>.json` as `text` (type `BookText`); a file whose version differs from
  `ANALYSIS_VERSION` is ignored. Profile = `words` (tokens), `longer_than` (% of the library's books with fewer
  words), `top` (12 most FREQUENT non-stopwords), `distinct` (12 by count x log(books / books using the word): frequent
  here, rare elsewhere; needs the final document frequencies, so `CorpusBuilder.book_text()` runs after the last
  `add`) and `phrases` (up to 8 bigrams/trigrams seen >= 3 times; a trigram weighs 1.5x a bigram and a phrase
  contained in a better one is dropped). Words need >= `CLOUD_MIN_LENGTH` letters, a count >= `BOOK_WORD_MIN_COUNT`
  and no stopword; a list shorter than its `*_MIN_SHOWN` is empty and the page hides it (a leaflet still shows the facts
  line). Only the top `BOOK_CANDIDATES` words of a book are scored for `distinct` (150 matched the full ranking in
  99.8% of 900 books). Reading time = words / 200 per minute. Repeated page headers show up as phrases. New OCR text
  appears only after the next corpus rebuild + `./build-frontend.sh`; changing a rule -> bump `ANALYSIS_VERSION`
- "Buku serupa" (book page, below the article, rendered with `BookGrid`): `profile.similar` = up to 10 `[book id, score]`
  from `CorpusBuilder._similar_books()`: cosine similarity of tf-idf vectors over each book's `BOOK_CANDIDATES` words
  (weight `(1 + ln count) x ln(books / books using the word)`; words in more than `SIMILAR_MAX_DOCUMENT_SHARE` of the
  books are dropped). Scores below `SIMILAR_MIN_SCORE` (0.10) are not shown; scores at or above `SIMILAR_MAX_SCORE`
  (0.85) are other copies/editions of the same text and are skipped (25% of sampled books had one). At least
  `SIMILAR_BOOKS_MIN_SHOWN` matches or the section is hidden. Quality, measured on 400 books against Calibre
  categories: a neighbour at >= 0.10 shares a Kategori 37% of the time (random pair 3.7%), 54-66% above 0.30. It
  compares TEXT, so a different-language book or a book with little text matches poorly; the page resolves ids
  against `books.json`, so a removed book is dropped. Inverted index in the Rust extension; this pass is what made the
  old pure-Python `finish` step take about 4 min for the library
- Author page word cloud (`pages/author/[id].astro` page 1, `components/AuthorCloud.astro`): the corpus rebuild also writes
  `analysis/author_text.json` (`{version, built_at, authors: {id: {books, cloud: [[word, count, books_using]]}}}`);
  `seed.mjs` (`loadAnalysis()`, shared with the book profiles) writes it to `src/data/author-text.json` (always written,
  `{}` when missing, so the page import stays valid), read through `authorText(id)` in `src/data/index.ts`.
  `rebuild_corpus()` passes each book's `(author id, name)` pairs to `CorpusBuilder.add()`. Built by
  `CorpusBuilder.author_text()`: sums the books' candidate words (top `BOOK_CANDIDATES` each) and ranks by summed count
  x ln(books / books using the word) (same "frequent here, rare elsewhere" idea as `distinct`), top `AUTHOR_WORDS` (40).
  Rules: the author needs >= `AUTHOR_MIN_BOOKS` (2) books with text; a word must occur in >= max(2,
  `AUTHOR_WORD_MIN_SHARE` = 25% of the author's books) of them, otherwise OCR debris of a few scans dominates (before the
  share rule "ber", "meng", "ter" were Pramoedya's whole cloud); the author's own name is dropped; fewer than
  `AUTHOR_WORDS_MIN_SHOWN` (12) words = no cloud and the section is hidden; placeholder authors (`AUTHOR_PLACEHOLDERS`:
  "Tidak diketahui", "Unknown", "Anonim", "dkk", ...) get none. Author pages 2+ show no cloud. A co-authored book counts
  for each of its authors. Changing a rule -> rebuild the corpus + `./build-frontend.sh`
- The corpus is built from the full cached texts, one document per book (EPUB wins over PDF). Word counts and
  document frequency are exact; the n-gram tables are capped at `MAX_NGRAM_ENTRIES` and flag `approximate_ngrams`
  when singletons had to be dropped. Takes ~1 minute and ~0.5 GB for ~1,000 books
- Word cloud (`cloud` in the corpus result, panel "Awan kata"): top `CLOUD_WORDS` words after dropping stopwords and words
  shorter than `CLOUD_MIN_LENGTH`. Stopwords = stopwords-iso (MIT) Indonesian + English + Dutch + a few old-spelling
  fragments, bundled as `cps/text_analysis_stopwords.json`. Malay is left out on purpose: it contains content words
  ("orang", "rakyat", "negara"). The "Frekuensi kata" panel stays unfiltered. Change the list -> bump `ANALYSIS_VERSION`
- N-grams use the same stopword list, applied to the EDGES only (`_ngrams()` in `cps/text_analysis.py`): a bigram/trigram
  is counted only when its first and last word are not stopwords and are at least `CLOUD_MIN_LENGTH` letters. Stopwords
  inside a trigram stay ("hak asasi manusia", "sumber daya alam"). Filtering happens at counting time, so the
  `MAX_NGRAM_ENTRIES` table holds content phrases only. Before version 3, 26 of the top 30 bigrams and 15 of the top
  30 trigrams were all-stopword ("of the", "di dalam", "oleh karena itu")
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

### Agent discovery (Link header, WebMCP)
- The homepage `/` answers with a `Link` header (`api-catalog`, `service-desc`, `service-doc`, `describedby`), set in
  `frontend/src/middleware.ts`; Astro serves `/`, so the one in Flask's `web.index()` never reaches visitors. Keep the
  targets in step with the `<link>` tags in `BaseLayout.astro`
- WebMCP: `frontend/src/scripts/webmcp.ts`, bundled into every page by `BaseLayout.astro`. It registers 5 tools through
  `navigator.modelContext.registerTool()` (`document.modelContext` in the current draft; both are tried):
  `search_catalog`, `search_book_text`, `list_sections`, `navigate`, `get_page_content`. They are client-side only: they
  fetch the same public SSR pages a visitor sees and parse the HTML (`/search/` results via `.book-card`, `#search-status`), so a markup
  change in `BookCard.astro` or `search.astro` must keep those selectors. `navigate` accepts only same-origin paths.
  One `AbortController` owns all registrations (aborted on `pagehide`, re-registered on a bfcache `pageshow`). Nothing
  happens in browsers without the API. Tool text returned to an agent is untrusted page content (`untrustedContentHint`)

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
- The 404 page (`pages/404.astro`) helps a mistyped `/book/<slug>/` instead of ending there; the status stays 404 and the page
  `noindex`, so nothing new is indexable. `suggestForBookPath()` (`utils/search.ts`) reads the slug: a trailing `-<id>`
  names a book only if that book's title shares a word with the slug (so "...-1998" is not read as book 1998), which is
  shown as "Apakah maksud Anda buku ini?" followed by that book's "Buku serupa" (the corpus similarity from
  `src/data/books/<id>.json`). Without a matching id, the slug's words (3+ letters, no digits) search the catalog index with
  OR, so one garbled word does not empty the result: "Buku yang mungkin Anda cari", up to 12. A slug with no usable
  words, or any other path, gets the plain message. The words are free text from the URL and only ever rendered through
  `BookGrid`, which escapes them. Checked with `.../temuan-tim-gabungsdfsdfan-...-1998-unknown-492/`: book 492 plus its six
  similar books
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
  and size. The file is `{pdf: {<book id>: "YYYY-MM-DD"}, epub: {...}}`: the date is the cache file's mtime (entries are
  replaced atomically, so it moves only when the text changes) and is that page's `<lastmod>`. It used to be the
  book's Calibre `last_modified`, which was older than the text for 14,268 of 20,639 pages (6,132 by more than 30
  days), so a recrawl was never prompted. Book pages keep Calibre's `last_modified` (verified 2026-11-26: it equals
  the date added for 20,446 of 20,759 books, so the 12,258 dated 2026-11-23/24 are two real bulk imports, not a
  bulk touch). Pages for unprocessed books render a `noindex` stub, so they stay out of the sitemap. New OCR results
  appear in the sitemap after the next `./build-frontend.sh`; without the cache dir the previous manifest is kept
- Image sitemap: each `/book/<slug>/` entry carries `<image:image>` for `/cover/<id>/og` ONLY when the book has a
  real cover (`has_cover` in `books.json`, from Calibre's `has_cover`; 9,703 of 20,769). The other 11,066 are served a
  generated title card (`cps/cover_placeholder.py`), which is text on grey; Google's image guidance says to avoid
  generic or text-only images, so they are left out. Videos, authors and clippings have no image entries (no own image).
- EPUB text pages (`/read/<id>/ocr/epub/`, "Baca EPUB (teks)") are crawlable plain SSR HTML. The book page links them
  for every EPUB whose text extracts (`/api/read/<id>/ocr/status/epub` extracts inline, no GPU, so `available` means
  "has extractable text"); a corrupt EPUB (no `container.xml`, no text) gets no link and its API/page answer 404, not
  503. Text is extracted on the first status/page request, so a newly added EPUB is linked and readable at once; only
  the sitemap needs `./build-frontend.sh` to list it in `ocr-ready.json`. The reader notice and "0.0 detik" meta
  are shown for PDFs only
- Reader text spacing (`pages/read/[id]/ocr/[format].astro`): Tailwind's reset zeroes `p` margins, so
  `.ocr-reader__content p` sets `margin: 0 0 0.9em` (about 15 px gap). `.ocr-footnotes p` has its own tighter margin
  (0.35rem) with higher specificity and is unaffected; do not remove the `p` rule or the text runs together
- Reader settings on the same page, kept in `localStorage` and applied by an inline `<head>` script before first paint
  (no flash): text size `ocr-font-scale` (6 steps, 85-175%) and text alignment `ocr-text-align`. Alignment is a
  two-button toggle (icons, `aria-pressed`): left (default, stores nothing) or justify, which sets
  `data-ocr-align="justify"` on `<html>` and styles `p` with `text-align: justify; hyphens: auto` (the document is
  `lang="id"`, so the browser can hyphenate). Only paragraphs are justified; headings, footnotes and `pre` keep their
  alignment. Keep the allowed values in the inline script and the page script in sync
- Reading position bar (same page, EPUB and PDF text): a sticky bar (`.ocr-progress`, under the site top bar on narrow
  screens) shows the heading path of the section being read, like gwern.net's link chain: book title › chapter ›
  subsection, each a link to its heading (`#ocr-top` is the page `<h1>`), plus the percentage of the text scrolled
  and a 2 px line under the bar. Client script only (no extra request): the path comes from the `h2-h6[id]` headings the
  page already has (levels give the nesting), the current section is the last heading at or above where a jump to a
  heading lands (`scroll-margin-top`), found by binary search over heading offsets measured on load, resize and when the
  article is resized (text size, alignment, images). A document without headings shows only the title and percent.
  Chain items are created by the script, so their styles use `:global()` inside the Astro `<style>`
- Heading look (same page): the page title is the only `h1`, document headings are demoted one level, and Tailwind's reset
  gives `h3`-`h6` the body's size and weight, so `[format].astro` styles `h2`-`h6` as a size/weight ladder inside
  `.ocr-reader__content`; without it the heading structure was invisible (only `h2` had a size)
- Download buttons (same page toolbar, "Unduh .txt" / "Unduh .md"): built in the browser from the rendered article, so the
  file is exactly what the reader sees and nothing new is requested from Flask. The API returns only sanitised HTML, so a
  small DOM walker (script in `[format].astro`) writes Markdown (`#` headings by tag level, emphasis, links made absolute,
  `>` blockquotes and footnote boxes, `-`/`1.` lists, pipe tables, `---`) or plain text (same blocks, no marks; footnotes
  and quotes indented, tables as ` | ` rows). The file starts with the title, authors, the source URL and, for PDFs, the
  OCR warning. Heading levels in the file are the page's (demoted) levels, so the document's top heading is `##` under
  the book's `#`. File name `<title slug>-<pdf|epub>.<md|txt>`. Checked in Chromium against books 21620 (PDF), 8141
  (EPUB), 7958 (PDF and EPUB): no HTML tags left, Markdown length within 1% of the article's `innerText` for the last three
- A PDF format whose file is not a PDF (68 MP3, 2 MP4, 8 saved Google Drive "virus scan" HTML pages were uploaded under
  the PDF format) gets `OcrNoTextError("File is not a PDF")` from `_check_pdf_file()` (cps/ocr_service.py, looks for
  `%PDF-` in the first KB). `/api/read/<id>/ocr/status/pdf`, the POST queue and the page answer 404, so the book page
  offers no OCR button and the job is never queued. The files themselves are left alone (`library/` is never edited);
  the fix for them is to replace or delete the format in Calibre
- TurboOCR page mode comes from `TURBOOCR_MODE` (default `ocr`: every page is OCR'd; `auto` keeps a PDF text layer when
  present). The cache key has no mode, so changing it does not redo cached books. To redo books on purpose, call
  `scan_book_ocr` with `ocr_service._load_cache` stubbed to return None (the new text replaces the old atomically and
  only after a successful run). Books added since 2026-11-18 were refreshed this way
- OCR coverage (2026-11-26): 20,672 of 20,774 PDF/EPUB formats have cached text (9,249 pdf, 11,423 epub). The remaining
  formats fail permanently and must not be queued again: 78 "PDF" files that are MP3/MP4/HTML (rejected by
  `_check_pdf_file`), 4 PDFs the OCR server cannot open (`INVALID_PDF`: 6972, 6967, 6966, 3820), 8365
  (`PDF_RENDER_FAILED` at page 102/110; Ghostscript rasterizes those pages fine, so it is the server's renderer),
  1 EPUB with no text layer at all (1339, 53 images only), 3 junk 2 KB EPUBs (7501-7503), and 2 PDFs over the OCR
  server's page limit (`PDF_TOO_LARGE`, default `MAX_PDF_PAGES` 2000: 17326 has 3,053 pages, 17813 has 2,595). Raise
  that limit on the server (a RAGFlow deployment at `TURBOOCR_URL`) before retrying those two. Queue work through
  `POST /api/read/<id>/ocr/<fmt>` (cap 5 pending), never many at once: the server is the bottleneck
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
- **PDF reader file** (`get_pdf_reader_url()` in `cps/helper.py`, used by `read_book()` -> `readpdf.html` `pdf_url`): the
  viewer loads the signed `/files/<id>/pdf/...` URL, NOT `/show/<id>/pdf`. `/show/*` is `private, no-store` by design, so
  every reader of a popular book re-streamed the whole PDF through Flask (book 4644, a 4.8 MB report that went viral:
  ~250 reader loads and ~200 file serves in 5 minutes from 165 IPs kept the single gevent loop at ~70% CPU and made
  `/healthz/live` take 1-4 s). `/files` is the same bytes, edge-cached (`cf-cache-status: HIT` on Range requests), supports
  Range, and never counts a download, which is right for viewing (counter stays at 185 across a reader session). Google
  Drive and books without a PDF format keep the `/show` URL. `/show/<id>/<fmt>` is still used by the other readers
  (txt, cbr, djvu, audio) and by the EPUB reader's routes. The reader PAGE (`/read/<id>/pdf`, ~55 KB, 30-300 ms) is
  still rendered by Flask on every load because it carries the session CSRF token and must not be cached
- **Search engines index the raw files**: `/files/*` and `/show/<id>/<fmt>` both answer with
  `Link: <https://pustaka.taratsa.id/files/<id>/<fmt>/<version>/<sig>>; rel="canonical"` (`_signed_file_url()` in
  `cps/helper.py`, no filename in the canonical form), so the `/show`, `/download` and filename variants all point at
  ONE cacheable URL; without it Search Console reported "Duplicate without user-selected canonical" for ~925 crawled
  `/files`/`/show` PDF/EPUB URLs. Google indexes both PDF and EPUB. `X-Robots-Tag: noindex` is limited to the viewer
  shells (`web.read_book`) and the `/show/readium/` chapter assets. `/files` copies are edge-cached for a year, so a
  header change there reaches crawlers only after a purge (`/files/*` or Purge Everything)
- The same canonical URLs are in the sitemap (`file-urls.json`, written by `seed.mjs` from `metadata.db` + the
  `flask_settings.flask_session_key` in `app.db`; only visible books, pdf/epub only). Sitemap inclusion and the
  `rel="canonical"` header must always name the same URL. The Node copy of `_file_version`/`_file_signature` in
  `seed.mjs` must be changed together with `cps/helper.py`; it relies on the app container's `TZ=UTC` when turning
  `last_modified` into an epoch. ~20.7k file URLs, 75.5k sitemap entries in 2 chunks


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
- **Error responses are not cacheable at the origin** (changed 2026-11-20, after the 2026-11-18 outage): the `/cover*`
  rule in the production Caddyfile sets `Cache-Control: public, max-age=86400` only inside `handle_response` for
  `status 2xx`, and `no-store` for 3xx/4xx/5xx. A plain `header @covers >Cache-Control ...` applied to every status, so
  Cloudflare cached ~160 cover 500s for a day after Flask had recovered. Write it as `header >Name "v"` inside
  `handle_response ... { ...; copy_response }`: `header_down`, `copy_response_headers` or a bare `header Name` either do
  not apply there or emit two `Cache-Control` lines. Test a Caddyfile change on throwaway ports with the production
  image (`caddy-caddy:latest`) against Flask before reloading (backup: `/home/devuser/backups`)
- **Cloudflare still has its own TTL by status code.** A 404 cover answered `no-store` +
  `Cloudflare-CDN-Cache-Control: no-store` by the origin was still served from the edge as `cf-cache-status: HIT` with
  `max-age=14400`. Whether the same applies to 5xx was NOT tested (a 500 cannot be produced safely on production), so
  after any backend outage `curl -I` a few cover URLs without a query string and purge by URL if they show a cached
  error. Check Cloudflare's Cache Rule "books cover caching" for per-status Edge TTLs
- `Onion-Location` appears twice on every Flask response behind Caddy: Flask adds it from `ONION_LOCATION` and the
  `pustaka.taratsa.id` Caddy block adds it too. Pre-existing and harmless; drop one source to tidy it

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
