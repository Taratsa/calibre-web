"""Generates `src/reader_strings.json`: the gettext strings of `cps/templates/read.html`, per available catalog.

Run it inside the app image (it needs the app's Babel and `cps/translations`):

    docker exec -i -u abc calibre-web-automated sh -c 'cd /app/calibre-web && /lsiopy/bin/python -' \
        < rust/backend/tools/gen_reader_strings.py > rust/backend/src/reader_strings.json

Shape: {"<locale>": {"<msgid>": "<translation>", ...}, ...}. Identity translations are omitted (the renderer falls
back to the msgid, which is what Babel does for a missing entry). Regenerate whenever `read.html` or the catalogs change.
"""

import gettext
import json
import os
import re

ROOT = "/app/calibre-web/cps/translations"
TEMPLATE = "/app/calibre-web/cps/templates/read.html"


def msgids():
    text = open(TEMPLATE, encoding="utf-8").read()
    found = re.findall(r"""_\(\s*'([^']*)'\s*\)""", text)
    return sorted(set(found))


def main():
    ids = msgids()
    result = {}
    locales = ["en"] + sorted(
        d for d in os.listdir(ROOT) if os.path.isfile(os.path.join(ROOT, d, "LC_MESSAGES", "messages.mo"))
    )
    for locale in locales:
        if locale == "en":
            result[locale] = {}
            continue
        translation = gettext.translation("messages", ROOT, languages=[locale], fallback=False)
        entries = {}
        for msgid in ids:
            translated = translation.gettext(msgid)
            if translated and translated != msgid:
                entries[msgid] = translated
        result[locale] = entries
    json.dump(result, open("/dev/stdout", "w"), ensure_ascii=False, sort_keys=True, indent=0)


main()
