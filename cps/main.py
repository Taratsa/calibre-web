#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2012-2022 OzzieIsaacs
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

import sys
import threading

from flask import g, request

from . import create_app, limiter, logger
from .jinjia import jinjia

log = logger.create()


def request_username():
    return request.authorization.username if request.authorization else ""


def main():
    app = create_app()

    from .about import about
    from .admin import admi
    from .basic import basic
    from .duplicates import duplicates
    from .editbooks import editbook
    from .error_handler import init_errorhandler
    from .gdrive import gdrive
    from .health import register_health_blueprint
    from .opds import opds
    from .remotelogin import remotelogin
    from .search import search
    from .search_metadata import meta
    from .shelf import shelf
    from .tasks_status import tasks
    from .web import web

    try:
        from flask_limiter.util import get_remote_address

        from .kobo import get_kobo_activated, kobo
        from .kobo_auth import kobo_auth

        kobo_available = get_kobo_activated()
    except (ImportError, AttributeError):  # Catch also error for not installed flask-WTF (missing csrf decorator)
        kobo_available = False
        kobo = kobo_auth = get_remote_address = None

    try:
        from .oauth_bb import oauth

        oauth_available = True
    except ImportError:
        oauth_available = False
        oauth = None

    from . import web_server

    init_errorhandler()

    app.register_blueprint(search)
    app.register_blueprint(tasks)
    app.register_blueprint(web)
    app.register_blueprint(basic)
    app.register_blueprint(duplicates)
    register_health_blueprint(app)
    if limiter is None:
        raise RuntimeError("Flask-Limiter failed to initialise")
    limiter.limit("3/minute", key_func=request_username)(opds)
    app.register_blueprint(opds)
    app.register_blueprint(jinjia)
    app.register_blueprint(about)
    app.register_blueprint(shelf)
    app.register_blueprint(admi)
    app.register_blueprint(remotelogin)
    app.register_blueprint(meta)
    app.register_blueprint(gdrive)
    app.register_blueprint(editbook)
    from .api import api

    app.register_blueprint(api)
    if kobo_available:
        if get_remote_address is None or kobo is None or kobo_auth is None:
            raise RuntimeError("Kobo support reported as available but modules failed to import")
        limiter.limit("3/minute", key_func=get_remote_address)(kobo)
        app.register_blueprint(kobo)
        app.register_blueprint(kobo_auth)
    if oauth_available:
        if oauth is None:
            raise RuntimeError("OAuth support reported as available but module failed to import")
        app.register_blueprint(oauth)
    # Self-heal the duplicate index at boot: when the last full scan predates
    # current criteria or the library outgrew the index, queue one rescan.
    # Run after the worker is up so it sees a live queue; in a thread so a slow
    # index check never delays serving requests.
    def _boot_duplicate_selfheal():
        try:
            from . import config, ub
            from .db import CalibreDB

            # Skip when the library DB isn't configured yet (first boot / CLI).
            if not (config.config_calibre_dir and config.db_configured):
                return
            with app.test_request_context():
                # A bare thread has no request context, so the lazy per-request
                # calibre session (g.lib_sql) is unset. Seed it here; setup_db
                # builds a fresh engine+session bound to the attached DBs.
                g.lib_sql = CalibreDB.setup_db(config.config_calibre_dir, ub.app_DB_path)
                from .duplicate_index import queue_full_scan_if_stale

                queue_full_scan_if_stale()
        except Exception:
            log.warning("[duplicates] Startup self-heal failed", exc_info=True)

    threading.Thread(target=_boot_duplicate_selfheal, daemon=True).start()

    success = web_server.start()
    sys.exit(0 if success else 1)
