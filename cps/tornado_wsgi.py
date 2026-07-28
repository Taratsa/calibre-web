#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2022 OzzieIsaacs
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

import typing
from collections.abc import Callable
from types import TracebackType
from typing import Any

import tornado
from tornado import escape, httputil
from tornado.ioloop import IOLoop
from tornado.log import access_log
from tornado.wsgi import WSGIContainer

if typing.TYPE_CHECKING:
    pass


class MyWSGIContainer(WSGIContainer):
    def __call__(self, request: httputil.HTTPServerRequest) -> None:
        if tornado.version_info < (6, 3, 0, -99):
            data = {}  # type: Dict[str, Any] # pyright: ignore[reportUndefinedVariable]
            response = []  # type: List[bytes] # pyright: ignore[reportUndefinedVariable]

            def start_response(
                status: str,
                headers: list[tuple[str, str]],
                exc_info: tuple["type[BaseException] | None", BaseException | None, TracebackType | None] | None = None,
            ) -> Callable[[bytes], Any]:
                data["status"] = status
                data["headers"] = headers
                return response.append

            app_response = self.wsgi_application(MyWSGIContainer.environ(self, request), start_response)
            try:
                response.extend(app_response)
                body = b"".join(response)
            finally:
                if hasattr(app_response, "close"):
                    app_response.close()  # type: ignore # pyright: ignore[reportAttributeAccessIssue]
            if not data:
                raise Exception("WSGI app did not call start_response")

            status_code_str, reason = data["status"].split(" ", 1)
            status_code = int(status_code_str)
            headers = data["headers"]  # type: List[Tuple[str, str]] # pyright: ignore[reportUndefinedVariable]
            header_set = set(k.lower() for (k, v) in headers)
            body = escape.utf8(body)
            if status_code != 304:
                if "content-length" not in header_set:
                    headers.append(("Content-Length", str(len(body))))
                if "content-type" not in header_set:
                    headers.append(("Content-Type", "text/html; charset=UTF-8"))
            if "server" not in header_set:
                headers.append(("Server", f"TornadoServer/{tornado.version}"))

            start_line = httputil.ResponseStartLine("HTTP/1.1", status_code, reason)
            header_obj = httputil.HTTPHeaders()
            for key, value in headers:
                header_obj.add(key, value)
            assert request.connection is not None
            request.connection.write_headers(start_line, header_obj, chunk=body)
            request.connection.finish()
            self._log(status_code, request)
        else:
            IOLoop.current().spawn_callback(self.handle_request, request)

    def environ(self, request: httputil.HTTPServerRequest) -> dict[str, Any]:
        try:
            environ = WSGIContainer.environ(self, request)
        except TypeError:
            environ = WSGIContainer.environ(request)  # pyright: ignore[reportCallIssue]
        environ["RAW_URI"] = request.path
        self.env = environ  # pyright: ignore[reportUninitializedInstanceVariable]
        return environ

    def _log(self, status_code: int, request: httputil.HTTPServerRequest) -> None:
        if status_code < 400:
            log_method = access_log.info
        elif status_code < 500:
            log_method = access_log.warning
        else:
            log_method = access_log.error
        request_time = 1000.0 * request.request_time()
        assert request.method is not None
        assert request.uri is not None
        ip = self.env.get("HTTP_FORWARD_FOR", None) or request.remote_ip
        summary = (
            request.method  # type: ignore[operator] # pyright: ignore[reportOperatorIssue]
            + " "
            + request.uri
            + " ("
            + ip
            + ")"
        )
        log_method("%d %s %.2fms", status_code, summary, request_time)
