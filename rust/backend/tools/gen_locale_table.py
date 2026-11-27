"""Generates `src/locale_table.txt`: what Flask's `get_locale()` makes of every Accept-Language tag shape the Rust
PDF reader understands. Run it inside the app image (it needs the app's Babel and `cps/translations`):

    docker exec -i -u abc calibre-web-automated sh -c 'cd /app/calibre-web && /lsiopy/bin/python -' \
        < rust/backend/tools/gen_locale_table.py > rust/backend/src/locale_table.txt

Format, one entry per line, sorted:
    = <locale> <label>      the translated "PDF Reader" of an available locale (`en` has no catalog: the msgid)
    <tag> <locale>          a tag (`lang`, `lang_Script`, `lang_REGION` or `lang_Script_REGION`, as Babel spells
                            it) that `Locale.parse` accepts and `negotiate_locale` maps to an available locale

A tag that is absent either fails to parse or matches nothing; Flask then tries the next tag, and falls back to
English at the end, so absent means "skip". Shapes the table cannot answer (variants, `und`, numeric regions, scripts
outside SCRIPTS) are rejected by the Rust code, which hands that request to Flask instead of guessing.
"""

import gettext
import os

from babel import Locale, negotiate_locale
from babel.core import UnknownLocaleError, get_global

ROOT = "/app/calibre-web/cps/translations"
SCRIPTS = ["", "Hans", "Hant", "Latn", "Cyrl", "Arab"]

dirs = sorted(d for d in os.listdir(ROOT) if os.path.isfile(os.path.join(ROOT, d, "LC_MESSAGES", "messages.mo")))
available = {str(Locale.parse(d)) for d in dirs} | {"en"}  # Flask-Babel always lists its default locale


def resolve(tag):
    try:
        parsed = str(Locale.parse(tag))
    except (UnknownLocaleError, ValueError):
        return None
    return negotiate_locale([parsed], available)


# Every language that can end up on an available locale: the available ones, and the ones Babel aliases (`in`, `ind`).
languages = sorted({a.split("_")[0] for a in available} | set(get_global("language_aliases")))
territories = sorted(set(Locale("en").territories) | set(get_global("territory_aliases")) | {"ZZ"})
territories = [t for t in territories if len(t) == 2 and t.isalpha()]

lines = []
for lang in languages:
    for script in SCRIPTS:
        base = lang + ("_" + script if script else "")
        for tag in [base] + [f"{base}_{t}" for t in territories]:
            hit = resolve(tag)
            if hit:
                lines.append(f"{tag} {hit}")

for locale in sorted(available):
    if locale == "en":
        label = "PDF Reader"
    else:
        language = locale
        label = gettext.translation("messages", ROOT, languages=[next(d for d in dirs if str(Locale.parse(d)) == locale)]).gettext("PDF Reader")
    lines.append(f"= {locale} {label}")

print("\n".join(sorted(lines)))
