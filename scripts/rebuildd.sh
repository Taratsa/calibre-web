#!/bin/bash
# Run pustaka-rebuildd in the background, restarting it if it exits, without systemd.
#
#   scripts/rebuildd.sh start     start the supervisor (no-op when it already runs)
#   scripts/rebuildd.sh stop      finish the build in flight, then stop (waits up to 180 s)
#   scripts/rebuildd.sh status    running / stopped, plus the daemon's own /status
#   scripts/rebuildd.sh logs      follow the log
#   scripts/rebuildd.sh once      one rebuild now, in the foreground (same as the binary's --once)
#
# State lives under $PUSTAKA_STATE (default ~/.local/state/pustaka): the supervisor pid and the log.
# Optional settings are read from ~/.config/pustaka/rebuildd.env (REBUILD_TOKEN, REBUILD_DEBOUNCE_SECS, ...).
# To start it at boot without systemd, add this line with `crontab -e`:
#   @reboot /home/devuser/workspaces/calibre-web/scripts/rebuildd.sh start

set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$REPO/rust/rebuildd/target/release/pustaka-rebuildd"
STATE="${PUSTAKA_STATE:-$HOME/.local/state/pustaka}"
PIDFILE="$STATE/rebuildd.pid"
LOG="$STATE/rebuildd.log"
ENVFILE="${PUSTAKA_ENV:-$HOME/.config/pustaka/rebuildd.env}"
# 9999 belongs to the Tor bridge container on this host.
export REBUILD_BIND="${REBUILD_BIND:-127.0.0.1:9777}"
export PUSTAKA_REPO="$REPO"
# `docker compose` is invoked by build-frontend.sh, which needs the working directory and PATH of a login shell.
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

mkdir -p "$STATE"
[ -f "$ENVFILE" ] && { set -a; . "$ENVFILE"; set +a; }

supervisor_pid() {
    [ -f "$PIDFILE" ] || return 1
    local pid
    pid="$(cat "$PIDFILE" 2>/dev/null)"
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && echo "$pid"
}

supervise() {
    # Restart on any exit except a requested stop; back off so a crash loop cannot spin.
    local stopping=0 child=0 delay=5
    trap 'stopping=1; [ "$child" -gt 0 ] && kill -TERM "$child" 2>/dev/null' TERM INT
    while [ "$stopping" -eq 0 ]; do
        "$BIN" >>"$LOG" 2>&1 &
        child=$!
        local started=$SECONDS
        # `wait` returns early when a trapped signal arrives; keep waiting until the child is really gone.
        while kill -0 "$child" 2>/dev/null; do wait "$child" 2>/dev/null; done
        [ "$stopping" -eq 1 ] && break
        # A run that lasted a minute was healthy: restart after 5 s. Quick deaths back off 5, 10, 20, 40, 60 s.
        if [ $((SECONDS - started)) -ge 60 ]; then delay=5; fi
        echo "[$(date -u +%FT%TZ)] rebuildd exited; restarting in ${delay}s" >>"$LOG"
        sleep "$delay"
        [ $((SECONDS - started)) -lt 60 ] && delay=$((delay * 2 > 60 ? 60 : delay * 2))
    done
    rm -f "$PIDFILE"
}

case "${1:-}" in
    start)
        if pid="$(supervisor_pid)"; then echo "already running (supervisor pid $pid)"; exit 0; fi
        [ -x "$BIN" ] || { echo "build it first: (cd $REPO/rust/rebuildd && cargo build --release)" >&2; exit 1; }
        cd "$REPO" || exit 1
        setsid bash "$0" __supervise >/dev/null 2>&1 < /dev/null &
        sleep 1
        if pid="$(supervisor_pid)"; then echo "started (supervisor pid $pid), log: $LOG"; else echo "failed to start; see $LOG" >&2; exit 1; fi
        ;;
    __supervise)
        echo $$ >"$PIDFILE"
        cd "$REPO" || exit 1
        supervise
        ;;
    stop)
        if ! pid="$(supervisor_pid)"; then echo "not running"; exit 0; fi
        kill -TERM "$pid"
        echo "stopping (finishing any build in flight)..."
        for _ in $(seq 1 180); do kill -0 "$pid" 2>/dev/null || { echo "stopped"; exit 0; }; sleep 1; done
        echo "still running after 180 s; not forcing it" >&2
        exit 1
        ;;
    status)
        if pid="$(supervisor_pid)"; then echo "running (supervisor pid $pid)"; else echo "stopped"; fi
        curl -s --max-time 3 "http://$REBUILD_BIND/status" | head -c 600; echo
        ;;
    logs)
        exec tail -n 40 -F "$LOG"
        ;;
    once)
        cd "$REPO" || exit 1
        shift
        exec "$BIN" --once "$@"
        ;;
    *)
        sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
        exit 2
        ;;
esac
