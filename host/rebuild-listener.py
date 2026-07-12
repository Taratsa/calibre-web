#!/usr/bin/env python3
"""HTTP listener for frontend rebuild requests from the Calibre-Web container.

Runs on the host (systemd unit or background process). The Calibre-Web
container POSTs here when the admin clicks "Rebuild" in the admin UI.
This script spawns build-frontend.sh as a detached process and returns 202.
"""
import hmac
import os
import subprocess
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

TOKEN = os.environ.get("WEBHOOK_TOKEN", "").encode()
SCRIPT = os.environ.get("BUILD_SCRIPT", "/srv/pustaka/build-frontend.sh")
LOG_FILE = os.environ.get("REBUILD_LOG_FILE", "/var/log/pustaka-rebuild.log")
PORT = int(os.environ.get("PORT", "9999"))
BIND = os.environ.get("BIND", "127.0.0.1")

if not TOKEN:
    print("ERROR: WEBHOOK_TOKEN must be set", file=sys.stderr)
    sys.exit(1)


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    line = f"[{ts}] {msg}\n"
    print(line, end="", flush=True)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line)
            f.flush()
    except OSError:
        pass


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress default access log; we handle our own

    def do_POST(self):
        if self.path != "/rebuild":
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"not found"}')
            return

        sig = self.headers.get("X-Frontend-Token", "")
        if not hmac.compare_digest(sig.encode(), TOKEN):
            log(f"403 forbidden from {self.client_address[0]}")
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"forbidden"}')
            return

        if not os.path.isfile(SCRIPT):
            log(f"500 BUILD_SCRIPT not found: {SCRIPT}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"build script missing"}')
            return

        reason = self.headers.get("X-Trigger-Reason", "manual")
        log(f"rebuild requested (reason={reason}); spawning {SCRIPT}")

        log_fh = open(LOG_FILE, "a")
        subprocess.Popen(
            [SCRIPT],
            stdout=log_fh,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            cwd=os.path.dirname(SCRIPT) or None,
        )

        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true,"queued":true}')

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_response(404)
        self.end_headers()


def main():
    log(f"rebuild-listener starting on {BIND}:{PORT}, script={SCRIPT}")
    server = HTTPServer((BIND, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("shutting down")
        server.shutdown()


if __name__ == "__main__":
    main()