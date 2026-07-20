"""Helpers for the Astro static frontend rebuild workflow.

The Flask backend fires `trigger_rebuild_async()` after database-changing
operations. The actual rebuild script lives at /usr/local/bin/rebuild-frontend.sh
inside the calibre-web container, and is configured via:

    config_frontend_rebuild_token   →  shared token in X-Frontend-Token header
    config_frontend_rebuild_url     →  internal URL to POST to
                                       (defaults to the in-process endpoint)

All hooks are no-ops if the flag is disabled, so deployments without the
Astro frontend continue to work unchanged.
"""

from __future__ import annotations

import logging
import threading

import requests

log = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 3.0


def trigger_rebuild_async(reason: str = "calibre change") -> None:
    """Kick off a frontend rebuild in a background thread. Never raises."""

    def _run() -> None:
        try:
            from . import config

            if not getattr(config, "config_frontend_rebuild_token", None):
                return
            url = getattr(config, "config_frontend_rebuild_url", None) or "http://localhost:8083/internal/rebuild-frontend"
            token = config.config_frontend_rebuild_token
            log.info("Triggering frontend rebuild (%s)", reason)
            requests.post(
                url,
                headers={"X-Frontend-Token": token, "X-Trigger-Reason": reason},
                timeout=DEFAULT_TIMEOUT,
            )
        except Exception as exc:
            log.warning("Frontend rebuild trigger failed: %s", exc)

    threading.Thread(target=_run, daemon=True).start()
