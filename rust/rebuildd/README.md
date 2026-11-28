# pustaka-rebuildd

Keeps the Astro frontend's catalog in step with Calibre's database, in Rust, without anyone running
`./build-frontend.sh` by hand.

The frontend bakes `src/data` into its image at build time, so a new or edited book reaches the site only after a
reseed, an image rebuild and a container recreate. Measured on the production host: **seed ~26 s + image build ~41 s**
(warm Docker cache) **+ ~11 s recreate** (76 s in total), with that last stretch answering 502 on the Astro pages.

## What it does

- Watches `library/metadata.db` (with `-wal`/`-shm`: SQLite commits land in the WAL, the main file's mtime alone is not
  reliable) and `data/clippings`, polling every 5 s. `data/app.db` is not watched: every download and login writes it.
- On a change, waits for **90 s of quiet** (`REBUILD_DEBOUNCE_SECS`), defers a continuous stream at most **600 s**
  (`REBUILD_MAX_WAIT_SECS`), runs **at most once per 300 s** (`REBUILD_MIN_INTERVAL_SECS`), and never two at a time.
- Skips the run when the fingerprint (mtime+size of those files) did not actually move.
- **Refuses to run while frontend CODE is uncommitted** (`frontend/src/{pages,components,layouts,styles,utils,scripts}`,
  `middleware.ts`, `astro.config.mjs`, `Dockerfile`) unless `REBUILD_ALLOW_DIRTY=1`. `frontend/src/data` is excluded on
  purpose: the seed rewrites it every run, so counting it would block every rebuild after the first.
- HTTP on `127.0.0.1:9777`: `POST /rebuild` (queue one refresh; requires `X-Frontend-Token` when `REBUILD_TOKEN` is
  set — the same header the old Python listener used), `GET /status` (running, next run, last run, log tail), `GET
  /healthz`.
- `--once [--dry-run]` runs one refresh and prints the outcome as JSON (for a timer or an operator); `--dry-run` never
  touches Docker.

Flask's `trigger_rebuild_async` (12 call sites in `editbooks.py`) posts to Flask's own `/internal/rebuild-frontend` only
when `config_frontend_rebuild_token` is set; it is not, so those calls are no-ops. This daemon watches the database
instead, so edits made in Calibre desktop are covered too.

## Run it (no systemd)

```bash
cd rust/rebuildd && cargo build --release          # once
scripts/rebuildd.sh start      # background supervisor: restarts the daemon after a crash
scripts/rebuildd.sh status     # running/stopped + the daemon's own /status
scripts/rebuildd.sh logs       # follow ~/.local/state/pustaka/rebuildd.log
scripts/rebuildd.sh stop       # finishes the build in flight, starts nothing new, waits up to 180 s
scripts/rebuildd.sh once       # one rebuild now, in the foreground (add --dry-run to only report)
```

It binds `127.0.0.1:9777` (override with `REBUILD_BIND`; 9999 is taken by the Tor bridge on this host). Optional
settings (`REBUILD_TOKEN`, `REBUILD_DEBOUNCE_SECS`, ...) go in `~/.config/pustaka/rebuildd.env`. To start it at boot
add `@reboot /home/devuser/workspaces/calibre-web/scripts/rebuildd.sh start` with `crontab -e`.

## Check

```bash
cargo fmt --check && cargo clippy --release --all-targets && cargo test --release
```
