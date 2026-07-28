#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2023 OzzieIsaacs
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

import mimetypes
import os
import shutil
import zipfile
from io import BytesIO
from tempfile import gettempdir

from . import logger

log = logger.create()

try:
    import magic

    error = None
except ImportError as e:
    error = f"Cannot import python-magic, checking uploaded file metadata will not work: {e}"


def get_mimetype(ext):
    # overwrite some mimetypes for proper file detection
    mimes = {".fb2": "text/xml", ".cbz": "application/zip", ".cbr": "application/x-rar"}
    return mimes.get(ext, mimetypes.types_map[ext])


def get_temp_dir():
    tmp_dir = os.path.join(gettempdir(), "calibre_web")
    if not os.path.isdir(tmp_dir):
        os.mkdir(tmp_dir)
    return tmp_dir


def del_temp_dir():
    tmp_dir = os.path.join(gettempdir(), "calibre_web")
    shutil.rmtree(tmp_dir)


def validate_mime_type(file_buffer, allowed_extensions):
    if error:
        log.error(error)
        return False
    mime = magic.Magic(mime=True)  # pyright: ignore[reportPossiblyUnboundVariable]
    allowed_mimetypes = []
    for x in allowed_extensions:
        try:
            allowed_mimetypes.append(get_mimetype("." + x))
        except KeyError:
            log.error(f"Unkown mimetype for Extension: {x}")
    tmp_mime_type = mime.from_buffer(file_buffer.read())
    file_buffer.seek(0)
    if any(mime_type in tmp_mime_type for mime_type in allowed_mimetypes):
        return True
    # Some epubs show up as zip mimetypes
    elif "zip" in tmp_mime_type:
        try:
            with zipfile.ZipFile(BytesIO(file_buffer.read()), "r") as epub:
                file_buffer.seek(0)
                if "mimetype" in epub.namelist():
                    return True
        except Exception:
            file_buffer.seek(0)
    log.error(f"Mimetype '{tmp_mime_type}' not found in allowed types")
    return False
