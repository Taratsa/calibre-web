#  This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#    Copyright (C) 2024 OzzieIsaacs
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
import re
from datetime import datetime


def strip_whitespaces(text):
    return re.sub(r"(^[\s\u200B-\u200D\ufeff]+)|([\s\u200B-\u200D\ufeff]+$)", "", text)


_PUBDATE_RE = re.compile(r"^\s*(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?![\d])")


def normalize_pubdate(value):
    """Return YYYY-MM-DD for a YYYY, YYYY-MM or full ISO date(time); '' otherwise.

    Missing month/day default to 01, so a year-only dc:date keeps its year.
    """
    if not value or not isinstance(value, str):
        return ""
    match = _PUBDATE_RE.match(value)
    if not match:
        return ""
    year, month, day = match.group(1), match.group(2) or "01", match.group(3) or "01"
    try:
        datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
    except ValueError:
        return ""
    return f"{year}-{month}-{day}"
