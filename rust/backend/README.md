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
`/download/*` (since ~10:41 WIB) and `/cover/*`, `/cover_thumb/*`, `/series_cover/*` (since ~11:25 WIB) to
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

Rollback: restore the previous Caddyfile (`/home/devuser/backups/Caddyfile.pre-rust-covers.2026-11-27` is the
`/download`-only state, `Caddyfile.pre-rust-download.2026-11-27` the original) and `caddy reload`; or set
`RUST_BACKEND_ENABLED=false` and `docker compose up -d calibre-web-automated`. Previous images: `calibre-web:pre-rust-covers`,
`calibre-web:pre-rust-download`. Rust logs to `/config/rust-backend.log` (errors only unless `RUST_LOG=info`).

### Concurrent exports (found 2026-11-27, `/files` rolled back once because of it)

`calibredb export` takes an exclusive lock on the library: with `MAX_EXPORTS=4`, four simultaneous `/files` requests gave
ONE embedded file and THREE stored files ("Another calibre program ... is running"), and the stored bytes (7,533,766 for
book 7) differ from an export (7,584,735) under a URL the CDN keeps for a year. Flask never shows this because its
requests are served one by one. Now: one export at a time; a "library locked" answer is retried 12 times, 500 ms
apart; if the library is still locked the request goes to Flask instead of being served the stored file; any other
export failure serves the stored file, like Flask. Tested live: 4 and 8 simultaneous requests to Rust, and 4 to Rust plus
4 to Flask at the same moment, 20 of 20 responses embedded. A residual risk remains where Flask's own export holds the
lock for longer than the retries (about 6 s); that request is then answered by Flask, never by a stored file.

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
