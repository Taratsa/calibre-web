
#   This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
#     Copyright (C) 2019 pwr
#
#   This program is free software: you can redistribute it and/or modify
#   it under the terms of the GNU General Public License as published by
#   the Free Software Foundation, either version 3 of the License, or
#   (at your option) any later version.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU General Public License for more details.
#
#   You should have received a copy of the GNU General Public License
#   along with this program. If not, see <http://www.gnu.org/licenses/>.

from . import logger
from .iso_language_names import LANGUAGE_NAMES as _LANGUAGE_NAMES
from .string_helper import strip_whitespaces

log = logger.create()


try:
    from pycountry import languages as pyc_languages

    def _copy_fields(l):  # noqa: E741
        l.part1 = getattr(l, 'alpha_2', None)
        l.part3 = getattr(l, 'alpha_3', None)
        return l

    def get(name=None, part1=None, part3=None):
        if part3 is not None:
            return _copy_fields(pyc_languages.get(alpha_3=part3))
        if part1 is not None:
            return _copy_fields(pyc_languages.get(alpha_2=part1))
        if name is not None:
            return _copy_fields(pyc_languages.get(name=name))
except ImportError:
    print("Python 3.12 isn't compatible with iso-639. Please install pycountry.")
    try:
        from iso639 import languages  # pyright: ignore[reportMissingImports]
        get = languages.get
    except ImportError:
        get = None  # pyright: ignore[reportAssignmentType]


def get_language_names(locale):
    names = _LANGUAGE_NAMES.get(str(locale))
    if names is None:
        names = _LANGUAGE_NAMES.get(locale.language)
    return names


def get_language_name(locale, lang_code):
    UNKNOWN_TRANSLATION = "Unknown"
    names = get_language_names(locale)
    if names is None:
        log.error(f"Missing language names for locale: {locale!s}/{locale.language}")
        return UNKNOWN_TRANSLATION

    name = names.get(lang_code, UNKNOWN_TRANSLATION)
    if name == UNKNOWN_TRANSLATION:
        log.error(f"Missing translation for language name: {lang_code}")

    return name


def get_language_code_from_name(locale, language_names, remainder=None):
    language_names = set(strip_whitespaces(x).lower() for x in language_names if x)
    lang = list()
    names = get_language_names(locale)
    if names is None:
        return lang
    for key, val in names.items():
        val = val.lower()
        if val in language_names:
            lang.append(key)
            language_names.remove(val)
    if remainder is not None and language_names:
        remainder.extend(language_names)
    return lang


def get_valid_language_codes_from_code(locale, language_names, remainder=None):
    lang = list()
    if "" in language_names:
        language_names.remove("")
    names = get_language_names(locale)
    if names is None:
        return lang
    for k, __ in names.items():
        if k in language_names:
            lang.append(k)
            language_names.remove(k)
    if remainder is not None and len(language_names):
        remainder.extend(language_names)
    return lang


def get_lang3(lang):
    try:
        if len(lang) == 2:
            lang_obj = get(part1=lang) if get else None
            ret_value = lang_obj.part3 if lang_obj else ""
        elif len(lang) == 3:
            ret_value = lang
        else:
            ret_value = ""
    except (KeyError, AttributeError):
        ret_value = lang
    return ret_value
