#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2024
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program. If not, see <http://www.gnu.org/licenses/>.

"""Liveness and readiness probes for Calibre-Web.

This blueprint exposes lightweight HTTP endpoints intended to be consumed by
container orchestrators (Docker HEALTHCHECK, Kubernetes liveness/readiness
probes, AWS ELB / GCP load balancer target groups) and uptime monitors.

Three aggregate endpoints are provided:

* ``GET /health``     - aggregate health report (status plus per-component
  checks). Returns HTTP 200 when every required component is healthy and
  HTTP 503 otherwise.  Useful for HTTP load balancers and dashboards.
* ``GET /healthz``    - alias of ``/health`` for Kubernetes-style conventions.
* ``GET /readyz``     - alias of ``/health`` for Kubernetes-style conventions.

In addition, two minimal text endpoints are exposed for the common case
where the probe just needs an HTTP 200 with a small body:

* ``GET /healthz/live``  - always returns ``200 ok``.  Suitable for the
  Kubernetes ``livenessProbe`` so that transient dependency outages do not
  restart the pod.
* ``GET /healthz/ready`` - returns ``200 ready`` only when all dependencies
  are reachable; otherwise returns ``503``.  Suitable for the Kubernetes
  ``readinessProbe`` so that traffic is only routed to pods that can serve
  real requests.

All endpoints are exempt from rate limiting, never require authentication,
and emit no application logs so that probe traffic does not pollute audit
logs.  They never leak sensitive data: only the boolean status of named
components is reported.
"""

from __future__ import annotations

import os
import platform
import sys
import time
from typing import Any

from flask import Blueprint, jsonify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from . import calibre_db, config, logger, ub

log = logger.create()

health_bp = Blueprint("health", __name__)


# Stable timestamp recorded at import time so that the JSON payload advertises
# how long the process has been up.  This is informational only and never used
# to derive liveness; it exists to make the response body deterministic enough
# to be cached by monitoring proxies when needed.
_START_TIME = time.time()


def _check_calibre_db() -> tuple[bool, str | None]:
    """Verify that the Calibre metadata database is reachable.

    Returns ``(True, None)`` when a trivial ``SELECT 1`` succeeds against the
    metadata DB; otherwise returns ``(False, error_message)``.  We catch both
    the generic ``SQLAlchemyError`` and the more specific ``OperationalError``
    so that connection errors, locked files, and corrupt databases are all
    reported as unhealthy without taking down the probe with an exception.
    """
    try:
        session = calibre_db.session
    except Exception as exc:
        return False, f"session_unavailable: {exc!s}"[:200]
    if session is None:
        return False, "calibre_db_not_configured"
    try:
        session.execute(text("SELECT 1"))
        return True, None
    except (OperationalError, SQLAlchemyError) as exc:
        return False, f"calibre_db_error: {exc!s}"[:200]
    except Exception as exc:
        return False, f"calibre_db_unexpected: {exc!s}"[:200]


def _check_app_db() -> tuple[bool, str | None]:
    """Verify that the Calibre-Web user database is reachable."""
    session = getattr(ub, "session", None)
    if session is None:
        return False, "app_db_not_initialised"
    try:
        session.execute(text("SELECT 1"))
        return True, None
    except (OperationalError, SQLAlchemyError) as exc:
        return False, f"app_db_error: {exc!s}"[:200]
    except Exception as exc:
        return False, f"app_db_unexpected: {exc!s}"[:200]


def _check_config() -> tuple[bool, str | None]:
    """Verify that the in-memory configuration has been loaded."""
    if not config.db_configured:
        return False, "config_not_configured"
    return True, None


def _build_status_payload() -> dict[str, Any]:
    """Aggregate the per-component health checks into a JSON-serialisable dict."""
    components: dict[str, dict[str, Any]] = {}

    for name, check in (
        ("config", _check_config),
        ("calibre_db", _check_calibre_db),
        ("app_db", _check_app_db),
    ):
        ok, error = check()
        components[name] = {"status": "up" if ok else "down", "error": error}

    overall_ok = all(c["status"] == "up" for c in components.values())
    return {
        "status": "up" if overall_ok else "down",
        "uptime_seconds": round(time.time() - _START_TIME, 3),
        "version": config.config_calibre_web_title or "",
        "checks": components,
        "process": _PLATFORM_INFO,
    }


@health_bp.get("/health")
@health_bp.get("/healthz")
@health_bp.get("/readyz")
def liveness():
    """Aggregate health probe endpoint.

    The same handler serves all three standard paths so that operators can
    point whichever URL convention their platform uses (Kubernetes commonly
    prefers ``/healthz`` and ``/readyz``, while AWS target groups often use
    ``/health``) at this single Calibre-Web instance without extra
    configuration.
    """
    payload = _build_status_payload()
    status_code = 200 if payload["status"] == "up" else 503
    response = jsonify(payload)
    response.status_code = status_code
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    return response


@health_bp.get("/healthz/live")
def liveness_minimal():
    """Minimal liveness probe.

    Always returns ``200 OK`` as long as the WSGI worker can run Python code.
    Use this for Kubernetes ``livenessProbe`` to avoid restarting pods that
    are merely experiencing a transient database outage.
    """
    return ("ok", 200, {"Content-Type": "text/plain", "Cache-Control": "no-store"})


@health_bp.get("/healthz/ready")
def readiness_minimal():
    """Minimal readiness probe.

    Returns ``200 OK`` only when all dependencies (Calibre DB, app DB, config)
    are reachable.  Suitable for Kubernetes ``readinessProbe`` so that traffic
    is only routed to pods that can serve real requests.
    """
    if _check_calibre_db()[0] and _check_app_db()[0] and _check_config()[0]:
        return ("ready", 200, {"Content-Type": "text/plain", "Cache-Control": "no-store"})
    payload = _build_status_payload()
    response = jsonify(payload)
    response.status_code = 503
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


def register_health_blueprint(application):
    """Register the health blueprint on ``application``.

    The blueprint is registered without a URL prefix so that the paths above
    are exposed verbatim.  When flask-limiter is installed the blueprint is
    marked as exempt so that probe traffic cannot exhaust the per-IP request
    budget; this lookup is best-effort so the blueprint still works when
    flask-limiter is missing.
    """
    application.register_blueprint(health_bp)
    try:
        from flask_limiter import Limiter  # noqa: F401
    except ImportError:
        return
    # ``limiter`` is the global limiter created in cps/__init__.py.  We look
    # it up dynamically to avoid a circular import at module load time.
    from . import limiter as global_limiter

    if global_limiter is not None:
        global_limiter.exempt(health_bp)


# Module-level marker so that ``uname`` style platform info is available
# without re-importing ``platform`` in callers that might not need it.
_PLATFORM_INFO = {
    "python": sys.version.split()[0],
    "platform": platform.platform(),
    "process": os.getpid(),
}
