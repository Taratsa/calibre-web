"""Write `src/language_names.tsv`: every ISO 639-2 language name per locale, from `cps/iso_language_names.py`.

The book editor saves a language by its NAME in the editor's locale (`isoLanguages.get_language_code_from_name`), so the
suggestions in `src/suggest.rs` must offer exactly those names. The source file is pure data (a dict literal), so it is
executed here without importing the app. Run from `rust/backend`: `python3 tools/gen_language_names.py`. Rerun it when
`cps/iso_language_names.py` changes. Lines are `locale<TAB>code<TAB>name`, sorted, so the diff is reviewable.
"""

import pathlib

root = pathlib.Path(__file__).resolve().parents[3]
namespace: dict = {}
exec((root / "cps/iso_language_names.py").read_text(encoding="utf-8"), namespace)
names = namespace["LANGUAGE_NAMES"]

lines = []
for locale in sorted(names):
    for code, name in sorted(names[locale].items()):
        assert "\t" not in name and "\n" not in name, (locale, code, name)
        lines.append(f"{locale}\t{code}\t{name}")
out = pathlib.Path(__file__).resolve().parents[1] / "src/language_names.tsv"
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"{len(names)} locales, {len(lines)} names -> {out} ({out.stat().st_size} bytes)")
