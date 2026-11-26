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

Not ported (still Flask): `/download/*` (authorizes and counts, needs sessions), `/cover*` (placeholder cards and
thumbnails need the image pipeline), everything else. The security headers of `add_security_headers` are applied
here to every response (`src/security.rs`).

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

## Check

```bash
cargo fmt --check && cargo clippy --release --all-targets && cargo test --release
```
