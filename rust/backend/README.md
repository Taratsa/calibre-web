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
| `/download/<id>/<fmt>[/<name>]` | `src/download.rs` | anonymous only: counts the download in `app.db` and 302s to the signed `/files` URL; identity and failure cases proxy to Flask |

`/series_cover/*` and everything else remain Flask. The cover route serves an existing local source
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

Not ported: `/series_cover/*` (series cache semantics), everything else.

### Behaviour that is deliberately the same as Flask

- **Metadata embedding.** With `config_embed_metadata` and a Calibre binaries directory (production has both), a
  `/files` response is a fresh `calibredb export` of the book, not the stored file; `src/export.rs` runs the same
  command, bounded by `MAX_EXPORTS` (default 4) and a 5 minute timeout, and serves the stored file if the export
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
| `MAX_EXPORTS` | `4` | concurrent `calibredb export` processes |
| `SECRET_KEY` | none | overrides the stored signing key, like Flask |
| `ONION_LOCATION` | none | adds the `Onion-Location` header |
| `UMAMI_URL` | `https://umami.kenadera.org/api/send` | Umami endpoint of the `/download` event; `off` disables it |

## Check

```bash
cargo fmt --check && cargo clippy --release --all-targets && cargo test --release
```
