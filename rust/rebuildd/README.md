# pustaka-rebuildd

Keeps the Astro frontend's catalog in step with Calibre's database, in Rust, without anyone running
`./build-frontend.sh` by hand.

The frontend bakes `src/data` into its image at build time, so a new or edited book reaches the site only after a
reseed, an image rebuild and a container recreate. Measured on the production host: **seed 28 s + image build 40 s**
(warm Docker cache) **+ ~1 s recreate**, with about a second of 502 while the container restarts.

## What it does

- Watches `library/metadata.db` (with `-wal`/`-shm`: SQLite commits land in the WAL, the main file's mtime alone is not
  reliable) and `data/clippings`, polling every 5 s. `data/app.db` is not watched: every download and login writes it.
- On a change, waits for **90 s of quiet** (`REBUILD_DEBOUNCE_SECS`), defers a continuous stream at most **600 s**
  (`REBUILD_MAX_WAIT_SECS`), runs **at most once per 300 s** (`REBUILD_MIN_INTERVAL_SECS`), and never two at a time.
- Skips the run when the fingerprint (mtime+size of those files) did not actually move.
- **Refuses to run while frontend CODE is uncommitted** (`frontend/src/{pages,components,layouts,styles,utils,scripts}`,
  `middleware.ts`, `astro.config.mjs`, `Dockerfile`) unless `REBUILD_ALLOW_DIRTY=1`. `frontend/src/data` is excluded on
  purpose: the seed rewrites it every run, so counting it would block every rebuild after the first.
- HTTP on `127.0.0.1:9999`: `POST /rebuild` (queue one refresh; requires `X-Frontend-Token` when `REBUILD_TOKEN` is
  set — the same header the old Python listener used), `GET /status` (running, next run, last run, log tail), `GET
  /healthz`.
- `--once [--dry-run]` runs one refresh and prints the outcome as JSON (for a timer or an operator); `--dry-run` never
  touches Docker.

Flask's `trigger_rebuild_async` (12 call sites in `editbooks.py`) posts to Flask's own `/internal/rebuild-frontend` only
when `config_frontend_rebuild_token` is set; it is not, so those calls are no-ops. This daemon watches the database
instead, so edits made in Calibre desktop are covered too.

## Stopping

`systemctl --user stop` (SIGTERM) lets the build in flight finish and starts nothing new; the unit allows 180 s.

## Build and run

```bash
cd rust/rebuildd
cargo build --release
REBUILD_TOKEN=… ./target/release/pustaka-rebuildd          # daemon
./target/release/pustaka-rebuildd --once --dry-run          # what would it do?
```

Install as a user unit (the build needs `docker compose` and the docker group):

```bash
mkdir -p ~/.config/systemd/user ~/.config/pustaka
cp deploy/pustaka-rebuildd.service ~/.config/systemd/user/
printf 'REBUILD_TOKEN=%s\n' "$(openssl rand -hex 16)" > ~/.config/pustaka/rebuildd.env
chmod 600 ~/.config/pustaka/rebuildd.env
systemctl --user daemon-reload
systemctl --user enable --now pustaka-rebuildd
loginctl enable-linger "$USER"      # keep it running without an open session
journalctl --user -u pustaka-rebuildd -f
```

## Check

```bash
cargo fmt --check && cargo clippy --release --all-targets && cargo test --release
```
