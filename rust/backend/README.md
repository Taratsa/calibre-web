# taratsa_backend

Rust (axum) side of the Pustaka backend. Branch `rewrite/rust-backend`.

## Strategy: strangler

Flask (`cps/`) stays in production. This service takes over routes one at a time; Caddy decides, per path, which
backend answers. Nothing moves until its Rust version has been compared against Flask on real data.

- **Same databases, Flask owns them.** The service opens `app.db` and Calibre's `metadata.db` **read-only** and
  never writes to either, or to `library/`. Schemas, accounts, password hashes and the signing key are untouched, so
  Calibre desktop and the Flask UI keep working, and a rollback is a Caddy edit.
- **Settings are re-read from `app.db`** (at most once per second), so an admin change in the Flask UI applies here
  too.
- **Same signing key.** `flask_settings.flask_session_key` (or `SECRET_KEY`, as in `cps/__init__.py`) signs the
  `/files` URLs. `src/signing.rs`, `cps/helper.py` and `frontend/scripts/seed.mjs` must stay byte-identical.

## Ported routes

| Route | Rust | Notes |
|---|---|---|
| `/health`, `/healthz`, `/readyz`, `/healthz/live`, `/healthz/ready` | `src/health.rs` | same paths and payload keys as `cps/health.py`; `process` names the Rust runtime |
| `/files/<id>/<fmt>/<version>/<sig>[/<name>]` | `src/files.rs` | signed, immutable, never counts a download; `Range`/`ETag`/`Last-Modified` from `tower-http` |
| `/cover/<id>[/<resolution>]`, `/cover_thumb/<id>[/<resolution>]` | `src/cover.rs` | anonymous unfiltered fast path reads cached JPEG/WebP files; all cookie/auth/restricted/Drive and cache-miss cases stay on Flask |
| `/series_cover/<id>[/<resolution>]` | `src/cover.rs` | the cover of the series' first book with a cover (no visibility filter, like Flask); same fast path and fallbacks as `/cover`; stays on Flask while `app.db` holds any series thumbnail row |
| `/download/<id>/<fmt>[/<name>]` | `src/download.rs` | anonymous only: counts the download in `app.db` and 302s to the signed `/files` URL; identity and failure cases proxy to Flask |
| `/static/<path>` | `src/static_files.rs` | GET/HEAD of an existing plain file under `cps/static`: werkzeug's ETag, `Last-Modified`, `no-cache`, 304 and single-range 206; a miss, odd path, symlink out, unknown type, other method, 412 or 416 goes to Flask |

Everything else remains Flask. The cover route serves an existing local source
JPEG or prebuilt WebP, or an existing Flask thumbnail-cache file. On cache miss (including requested WebP without
a prebuilt image), Rust proxies the original request to Flask; Flask generates/converts the asset and fills the
shared cache. Generated placeholder cards are still served by Flask. The security headers of `add_security_headers`
are applied here to every response (`src/security.rs`).

### Cover fallback requirements

- A request carrying `Cookie` or `Authorization`, a deployment with reverse-proxy-header login, hidden anonymous
  browsing, restricted custom columns or Google Drive always proxies to Flask. The Rust service does not yet
  decode Flask's signed session / remember cookies or implement per-user cover ACLs.
- The anonymous fast-path query applies the guest language and tag filters from the anonymous user row. Restricted
  custom columns still proxy to Flask.
- Thumbnail cache misses and on-demand WebP conversion stay in Flask. Existing cache files are served with
  Werkzeug-compatible path Adler-32 ETags, Last-Modified, Range, HEAD and conditional requests.
  `/cover_thumb` defaults to `sm`; `/cover` does not.

### `/series_cover/<id>[/<resolution>]`

Flask looks for a series thumbnail (`thumbnail.type = 2`, made only by the optional `TaskGenerateSeriesThumbnails`), and
otherwise serves the cover of the first book of the series that has one (`get_series_thumbnail_on_failure`, no
visibility filter and no `ORDER BY`, i.e. the lowest `books_series_link` row). Production has no type-2 rows, so Rust
answers it like `/cover/<book id>`. If such rows ever appear, `Settings.series_thumbnails` sends every series cover to
Flask again, so a generated series thumbnail is never bypassed. Checked against live Flask for all 23 series plus an
unknown id at original/`og`/`sm`/`md`/`lg`/unknown resolution, WebP and JPEG (288 requests): status, headers and body
identical, as are HEAD, `Range` and `If-None-Match`. The route is NOT yet sent to Rust by Caddy.

### `/static/<path>` (LIVE since 2026-11-27 ~18:29 WIB)

Flask's static view (`send_from_directory` over `cps/static`; `cps/cache_buster.py` only strips the `?q=<hash>` query).
It was the largest Flask-served family by request count in the Caddy log (3,539 css + 1,119 js + 958 locale + 255 wasm
of 8,596 Flask-routed requests, 87% of them 304s), so it is the cheapest load to take off the single gevent loop.
Rust answers only what it can reproduce exactly: GET/HEAD of an existing file whose name is plain `[A-Za-z0-9._-]`
segments, whose extension is one of the types listed in `content_type()` (the table was read from the live app for every
extension under `cps/static`), and which does not resolve through a symlink out of the directory. It sends werkzeug's
ETag (`mtime-size-adler32(path)`, shared with the cover code), `Last-Modified`, `Cache-Control: no-cache`,
`Content-Disposition: inline; filename=...`, `Vary: Cookie`, `Accept-Ranges`, the 304 (no `Content-Type`/`Length`) and a
single-range 206. Everything else goes to Flask: a miss (Flask's HTML 404), a directory, `/static` and `/static/`,
`..`/encoded/doubled-slash paths (werkzeug's 308 and 404), a type not in the table, POST/PUT/..., a failed `If-Match` (412),
an unsatisfiable range (416) and any `Range` header Rust cannot parse (werkzeug answers 416, not 200, for `bytes=a-b`;
the first version answered 200 there, found by the comparison below).

Measured against live Flask on the production image's own `cps/static` (837 files), with a Rust instance on a copy of
`app.db`: 5,053 requests (every file as GET, GET with `?q=`, HEAD, `If-None-Match`, `If-Modified-Since`, `Range: bytes=0-9`,
plus traversal, encoded and odd paths and five other methods): status, every header except `Date`, and the body hash
identical, 0 differences. A further 3,575-request pass covered weak/list/`*` validators, `If-Range`, `If-Match`,
`If-Unmodified-Since`, multi-range and suffix ranges on 126 files. Eight keep-alive clients, 250 requests each, random
css/js/font/svg/png: Flask 97 req/s (p50 44 ms, p95 124 ms, max 2,045 ms), Rust 302 req/s (p50 28 ms, p95 50 ms, max 127 ms).
The 540 `/static/css/libs/images/toolbarButton-viewsManagerToggle.svg` 404s in the log are a file the image does not
ship; they stay Flask's 404.

Rollout: image `calibre-web:rust-static` (previous image `calibre-web:pre-rust-static`), then `deploy/caddy-static.patch`
applied to the production Caddyfile (a `handle` block with the same Rust-first `lb_policy first` upstream list as `/files`;
backup `/home/devuser/backups/Caddyfile.pre-rust-static.2026-11-27`) and `caddy reload`. Rollback: delete the block and
reload. The same 5,022-request comparison, run again from `caddy_net` against the DEPLOYED binary on port 8084 and Flask on
8083, found 0 differences.

Live (first minutes): the Flask-served requests of that family are now answered by Rust, p50 8 ms for 304s and 28 ms for
200s. The slow tail in the Caddy log (about 2 s) is the requests Rust hands to Flask (misses: Flask renders its HTML 404)
and the period before the switch, when Flask's single loop was shared with the bulk import. A real finding: the missing
`toolbarButton-viewsManagerToggle.svg` is requested ~90 times per 5 minutes and each 404 costs a Flask round trip, so
shipping that file (or a Caddy-level 404 for it) would remove the last common Flask static hit.

### `/read/<id>/pdf` (LIVE since 2026-11-27 ~21:28 WIB)

The PDF.js viewer shell for the ANONYMOUS visitor (`src/reader.rs`). It renders the unchanged `cps/templates/readpdf.html`
(compiled in with `include_str!`, so the template and the route cannot drift) and fills the same few Jinja values:
the title, the signed `/files` URL (`/show/<id>/pdf` when the book has no PDF), the translated "PDF Reader", the
`GOOGLE_SITE_VERIFICATION` meta, the Umami snippet, and the print/download buttons (the guest's download role). A request
with any `Cookie` or `Authorization`, reverse-proxy login, a restricted custom column, Google Drive, guest browsing off,
a guest without the viewer role, a book the guest cannot see, an unknown or non-numeric id, a trailing slash, any other
format, a query error, or an `Accept-Language` this code cannot place exactly, is proxied to Flask unchanged. So
logged-in readers keep their per-session behaviour (bookmarks, CSRF, per-user archive and filters), and no session
cookie is decoded in Rust.

The guest's role, language and tag filters are read FRESH on every request (`settings::load_pdf_reader`), not from the
1 s settings cache the other routes use: this page's access depends on them, so a revocation applies to the next request.

Language: Flask picks the translation with Werkzeug's `LanguageAccept` ordering, Babel's `Locale.parse` and
`negotiate_locale` against the catalogs in `cps/translations`. Babel's CLDR data is not reimplemented. Instead
`tools/gen_locale_table.py` asks the real Babel inside the app image what 5,016 tag shapes map to and writes
`src/locale_table.txt`; `src/locale.rs` only parses the header and looks tags up. Regenerate the table when
`cps/translations` or Babel changes (command in the script's docstring). Absent `Accept-Language` means English, as in
Flask (64 of 292 production reader requests had none).

Measured against live Flask (2026-11-27), Rust on a copy of `app.db`, the production image's own template and library:
800 books (700 random PDFs, 40 without a PDF, 60 with `<`, `>`, `&`, quotes or backslashes in the title) across 7
`Accept-Language` shapes: status, every header except `Date`, and the body hash identical, 0 differences. Two bugs the
comparison found: Jinja's whitespace around block tags (the first version was 14 bytes short) and `tojson`, which
writes every non-ASCII character as `\uXXXX` (30 titles with en dashes or the replacement character). 85 further cases
(odd `Accept-Language` values, cookies, bad ids, other formats): identical apart from `Set-Cookie` (a fresh random
session per Flask response, so two Flask answers differ too). In Chromium the real 127-page, 4.8 MB report opens and
renders page 1 through Rust (1,096 ms with `id-ID`, the PDF itself served by the public site), with print and download
buttons and the same 404 for the viewer's missing `toolbarButton-viewsManagerToggle.svg` as Flask.

Live: `@rust_reader` in the production Caddyfile (`path_regexp ^/read/[0-9]+/pdf$`, Rust first and Flask as failover,
same upstream list as `/files`), inside `@flask`, so the `@reader` no-store headers still apply. Only this exact shape is
routed; `/read/<id>/epub` and everything else stay on Flask. Backup of the Caddyfile:
`/home/devuser/backups/Caddyfile.pre-rust-reader.2026-11-27`; roll back by deleting the block (then `caddy reload`).
First 3 minutes: 44 requests, all 200, Caddy-side p50 13 ms / p95 29 ms (Flask: p95 about 0.9 s), none reached Flask's
access log. `readpdf.html` is compiled into the binary, so the Dockerfile copies it into the builder stage
(`/app/cps/templates/`) and `build.rs` rebuilds on a template change; after a pdf.js upgrade, rerun the comparison.

### `/download/<id>/<fmt>[/<name>]` (the one route that writes)

Port of `download_link` + `get_download_redirect`, for the ANONYMOUS visitor only. It checks the guest's
`download` role, language and tag filters, that the file exists, then does what `ub.update_download` does (the same
`INSERT ... ON CONFLICT DO UPDATE` on `downloads`, user 0, a connection with `PRAGMA foreign_keys=ON`, 30 s busy
timeout; a failed write is logged, never fails the download), sends the Umami `file-download` event in the
background (`UMAMI_URL=off` disables it; `DNT: 1` skips it) and answers werkzeug's 302 to the signed `/files` URL:
same `Location`, body, `Cache-Control: private, no-store` and `Vary: Cookie` as Flask.

Everything else is proxied to Flask UNCHANGED, and nothing is counted on that path, so no download is counted
twice: `Cookie`/`Authorization`, reverse-proxy login, hidden anonymous browsing, Google Drive, restricted columns,
a guest without the download role, a Kindle User-Agent, a missing `User-Agent` (Flask answers 500), a non-numeric
id, and any book/format/file that is missing, hidden or has an unusable name or timestamp (so every 404 is Flask's).

Not ported: everything else.

Measured (2026-11-27, against copies of the live `app.db`, never the live file):

- Redirect: headers and the 513-byte body identical to Flask for book 4644; the file name and percent-encoding
  matched Flask's `get_valid_filename` + werkzeug quoting for 1,800 real books (1,500 random, 300 with special
  characters), 0 mismatches.
- Concurrency: 1,500 Rust `/download` requests (4 clients) next to 1,500 Flask-style writers (3 threads, same SQL, 30 s
  busy timeout, foreign keys on) on one WAL database: 0 failures and 0 lost counts (expected +3,000, got +3,000);
  Rust latency p50 10 ms, p99 336 ms, max 851 ms while sharing the write lock.
- Umami: the `file-download` payload and `User-Agent` equal what `_track_download_analytics` sends (`file` is
  `data.name` + format); `DNT: 1` sends nothing in both.

Rollout (LIVE since 2026-11-27): `.env` has `RUST_BACKEND_ENABLED=true` and `RUST_BACKEND_LISTEN=0.0.0.0:8084`
(reachable only over `caddy_net` as `calibre-web-automated:8084`; never publish it on the host, it has no
authentication). The production Caddyfile (`/home/wibi/apps/caddy/Caddyfile`, applied with `caddy reload`) sends
`/download/*` (since ~10:41 WIB), `/cover/*`, `/cover_thumb/*`, `/series_cover/*` (since ~11:25 WIB) and `/files/*` (since
~12:05 WIB, after the export-lock fixes below) to
`calibre-web-automated:8084 calibre-web-automated:8083` with `lb_policy first`, so Flask answers whenever Rust does not
(checked by killing Rust: all three routes kept answering). The cover `handle_response` blocks (2xx cached for a day,
errors `no-store`) stay in Caddy and apply to either upstream. The entrypoint restarts Rust 2 s after it exits.
Anything Rust cannot answer itself is proxied to Flask, so the worst case is a slower response, not a lost count.

Checked live through https://pustaka.taratsa.id: anonymous `/download/4644/pdf` -> 302 with Flask's headers, the
followed link downloads the 4,808,966 bytes, a cookie request is answered by Flask, an unknown id is a 404, and the
counter moved by exactly the requests Rust and Flask each answered. First 495 requests after the switch: 471 x 302,
24 x 404, no 502, p50 8 ms / p95 19 ms. Covers: 4,510 comparisons against live Flask (`/cover`, `/cover_thumb`; 350
books with a cover, 100 without, an unknown id; 5 URL shapes; WebP and JPEG) found 0 differences.
Baseline before the switch (Caddy log): `/download` ~292 requests per 22 minutes (6 with a cookie); covers ~12 per
minute, 241 of 242 anonymous, Flask p50 89 ms but p95 13.6 s / p99 23.8 s. Rust's proxy to Flask therefore uses a READ
timeout (120 s), not a total one: a slow Flask answer must not become a 502.

Rollback: restore the previous Caddyfile (`/home/devuser/backups/Caddyfile.pre-rust-files-v2.2026-11-27` is the
state before `/files`, `Caddyfile.pre-rust-covers.2026-11-27` the `/download`-only state, `Caddyfile.pre-rust-download.2026-11-27` the original) and `caddy reload`; or set
`RUST_BACKEND_ENABLED=false` and `docker compose up -d calibre-web-automated`. Previous images: `calibre-web:pre-rust-files3`, `calibre-web:pre-rust-covers`,
`calibre-web:pre-rust-download`. Rust logs to `/config/rust-backend.log` (errors only unless `RUST_LOG=info`).

### Concurrent exports (found 2026-11-27, `/files` rolled back once because of it)

`calibredb export` takes an exclusive lock on the library, so two exports can never overlap. With `MAX_EXPORTS=4`, four
simultaneous `/files` requests to Rust gave ONE embedded file and THREE stored files ("Another calibre program ...
is running"), and the stored bytes (7,533,766 for book 7) differ from an export (7,584,735) under a URL the CDN keeps
for a year. Flask alone never shows this (it serves requests one by one). Rust now exports one at a time, retries a
"library locked" answer 12 times (500 ms apart), and hands the request to Flask instead of serving the stored file when
the library is still locked; any other export failure serves the stored file, like Flask.

That made Rust correct on its own (18 of 18 simultaneous Rust requests embedded, in three rounds), but not safe
TOGETHER with Flask: with 6 requests to Rust and 3 to Flask at the same instant, the Rust ones all embedded and Flask
returned the stored file for 2 of its 3, because Flask did not retry when Rust held the lock. Two exporters on one
library is the real defect, so `do_calibre_export()` (`cps/embed_helper.py`, also used by mail and convert) now waits
for the lock the same way (12 tries, 500 ms apart) instead of falling through to the stored file. Flask's loop is not
monkey-patched, so that sleep blocks it for as long as it waits; the export itself already blocked it the same way.

### `/files/*` live check (2026-11-27)

Parity before the switch: 50 real signed URLs (25 PDF, 25 EPUB) compared with Flask, bodies equal apart from the
`xmp:MetadataDate` that every `calibredb export` rewrites; status and headers (`Vary: Cookie`, the 304 headers with
Flask's missing `Last-Modified`) equal after two fixes this found; 404 and 416 pages are Flask's own (Rust hands those
requests over). Simultaneous Rust and Flask exports: 59 of 59 embedded over six rounds (up to 8 + 8 at once), after the
lock fixes. Live, first 5 minutes: 35 requests, all 200, p50 1.0 s, p95 2.1 s (Flask alone had p95 10.3 s, p99 21.6 s).
Books whose export equals their stored file (228, 213: nothing to embed) legitimately return the stored size.

### Behaviour that is deliberately the same as Flask

- **Metadata embedding.** With `config_embed_metadata` and a Calibre binaries directory (production has both), a
  `/files` response is a fresh `calibredb export` of the book, not the stored file; `src/export.rs` runs the same
  command, bounded by `MAX_EXPORTS` (default 1) and a 5 minute timeout, and serves the stored file if the export
  fails. A staged copy is deleted as soon as the response has the file open.
- **Stale links.** A version that no longer matches 302s to `/download/<id>/<fmt>` with `private, no-store`.
- **First author** in the file name is the lowest author id (what SQLAlchemy's lazy load returns; checked against
  the 1,228 multi-author books of the live library, 0 differences).
- **`last_modified`** is read as UTC from the first `YYYY-MM-DD HH:MM:SS` of the stored text; a `+00:00` suffix
  (two rows) is ignored, as SQLAlchemy's `TIMESTAMP` does.

### Not served from Rust (returns 501 so a wrong Caddy rule is loud, never silently wrong)

- Google Drive libraries (`config_use_google_drive`).
- `kepub` with embedded metadata and kepubify configured.

Production uses neither (`config_use_google_drive=0`; 0 kepub formats in the library).

## Run

```bash
APP_DB_PATH=/config/app.db LISTEN=127.0.0.1:8084 RUST_LOG=info ./taratsa_backend
```

| Variable | Default | Meaning |
|---|---|---|
| `APP_DB_PATH` | `/config/app.db` | Flask's app database |
| `LISTEN` | `127.0.0.1:8084` | bind address |
| `MAX_EXPORTS` | `1` | concurrent `calibredb export` processes (calibre locks the library, so more only fail on each other) |
| `SECRET_KEY` | none | overrides the stored signing key, like Flask |
| `ONION_LOCATION` | none | adds the `Onion-Location` header |
| `UMAMI_URL` | `https://umami.kenadera.org/api/send` | Umami endpoint of the `/download` event; `off` disables it |

## Check

```bash
cargo fmt --check && cargo clippy --release --all-targets && cargo test --release
```
