"""Turn TurboOCR page results into reader HTML.

Pure functions, no cps imports. Handles reading order and tables, and removes layout noise that the layout model
leaves in the text: running headers, page numbers, pull quotes, watermarks. Footnotes are collected and shown
together at the next section break instead of in the middle of the text, and paragraphs that continue across
a page break are joined.
"""

from __future__ import annotations

import re
from collections import defaultdict
from collections.abc import Mapping
from dataclasses import dataclass
from html import escape

# Block classes that never belong in the reading text.
SKIPPED_CLASSES = frozenset({"header", "footer", "number", "header_image", "footer_image", "aside_text"})
_HEADING_LEVEL = {"doc_title": 1, "paragraph_title": 2}
_HEADER_ZONE = 0.14  # a block centred in the top 14% / bottom 12% of a page is a running header / footer
_FOOTER_ZONE = 0.88
_MAX_HEADING = 110
_ROMAN = re.compile(r"M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})")
_NUMBER_TOKEN = re.compile(r"\d{1,4}[.)]?|[–—\-•·.]+")
_TERMINAL = re.compile(r"[.!?:;…”\"')\]]$")
_NOTE_BREAK = re.compile(r"(?<=[.!?”\"])\s+(?=\d{1,3}\s+\S)")
_HYPHEN_BREAK = re.compile(r"(?<=[a-z])- (?=[a-z])")


@dataclass
class _Item:
    kind: str  # h1 | h2 | p | caption | note | html
    text: str
    page: int


def _blocks(page: Mapping[str, object]) -> list[Mapping[str, object]]:
    blocks = page.get("blocks")
    return [block for block in blocks if isinstance(block, dict)] if isinstance(blocks, list) else []


def _box(item: object) -> tuple[float, float, float, float] | None:
    points = item.get("bounding_box") if isinstance(item, dict) else None
    if not isinstance(points, list) or not points:
        return None
    try:
        xs = [float(point[0]) for point in points]
        ys = [float(point[1]) for point in points]
    except (TypeError, ValueError, IndexError):
        return None
    return min(xs), min(ys), max(xs), max(ys)


def _text(block: Mapping[str, object]) -> str:
    text = " ".join(str(block.get("content") or "").replace("\u00ad", "").split())
    return _HYPHEN_BREAK.sub("", text)  # "pem- berontakan" left by a line break


def _alnum(text: str) -> str:
    return re.sub(r"[\W_]+", "", text.lower())


def _key(text: str) -> str:
    return re.sub(r"[\W\d_]+", " ", text.lower()).strip()


def _is_number_only(text: str) -> bool:
    """Page numbers and chapter numerals: only digits, roman numerals and separators."""
    tokens = text.replace("|", " ").split()
    return bool(tokens) and all(_NUMBER_TOKEN.fullmatch(t) or (t.isupper() and _ROMAN.fullmatch(t)) for t in tokens)


def _zone(block: Mapping[str, object], height: float) -> bool:
    box = _box(block)
    if not box or height <= 0:
        return False
    centre = (box[1] + box[3]) / 2 / height
    return centre <= _HEADER_ZONE or centre >= _FOOTER_ZONE


def _running_keys(pages: Mapping[int, Mapping[str, object]]) -> set[str]:
    """Texts repeated at the top or bottom of many pages (book/chapter title, author): running headers."""
    seen: dict[str, set[int]] = defaultdict(set)
    for index, page in pages.items():
        height = float(page.get("height") or 0)  # pyright: ignore[reportArgumentType]
        for block in _blocks(page):
            key = _key(_text(block))
            if 6 <= len(key) <= 100 and _zone(block, height):
                seen[key].add(index)
    needed = max(5, len(pages) // 20)
    return {key for key, where in seen.items() if len(where) >= needed}


def _table_html(table: Mapping[str, object]) -> str:
    html = str(table.get("html") or "")
    return html.removeprefix("<html>").removeprefix("<body>").removesuffix("</html>").removesuffix("</body>")


def _block_item(block: Mapping[str, object], height: float, running: set[str], page: int) -> _Item | None:
    kind = str(block.get("class", "text"))
    text = _text(block)
    if kind in SKIPPED_CLASSES or not _alnum(text):
        return None
    if _key(text) in running and _zone(block, height):
        return None
    if kind in _HEADING_LEVEL:
        # A "heading" that starts lowercase or runs on is a pull quote or a body line the model mislabelled.
        if _is_number_only(text) or not (text[0].islower() or len(text) > _MAX_HEADING):
            return _Item(f"h{_HEADING_LEVEL[kind]}", text, page)
        kind = "text"
    elif _is_number_only(text):
        return None
    if kind == "footnote":
        return _Item("note", text, page)
    if kind in ("figure_title", "vision_footnote"):
        return _Item("caption", text, page)
    if kind == "image" and len(text) <= 40:  # watermark or photo credit
        return None
    return _Item("p", text, page)


def _drop_repeats(items: list[_Item]) -> list[_Item]:
    """Drop a paragraph whose text is contained in another block of the page (a pull quote repeats the body)."""
    norms = [_alnum(item.text) for item in items]
    kept: list[_Item] = []
    for n, item in enumerate(items):
        repeated = item.kind == "p" and len(norms[n]) >= 40 and any(
            m != n and norms[n] in norms[m] and (len(norms[m]) > len(norms[n]) or m < n) for m in range(len(items))
        )
        if not repeated:
            kept.append(item)
    return kept


def _page_items(page: Mapping[str, object], index: int, running: set[str]) -> list[_Item]:
    blocks = _blocks(page)
    if not blocks:
        # No layout was detected: the page still carries raw OCR lines.
        results = page.get("results")
        lines = [str(r.get("text", "")).strip() for r in results if isinstance(r, dict)] if isinstance(results, list) else []
        text = " ".join(line for line in lines if line)
        return [_Item("p", text, index)] if _alnum(text) else []
    height = float(page.get("height") or 0)  # pyright: ignore[reportArgumentType]
    ordered = sorted(blocks, key=lambda block: int(block.get("order_index", 0)))  # pyright: ignore[reportArgumentType]
    tables = [t for t in page.get("tables") or [] if isinstance(t, dict) and _table_html(t)]  # pyright: ignore[reportGeneralTypeIssues]
    table_by_layout = {table.get("layout_id"): table for table in tables}
    table_boxes = [box for box in map(_box, tables) if box]

    def inside_table(block: Mapping[str, object]) -> bool:
        box = _box(block)
        if block.get("class") != "text" or not box:
            return False
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        return any(t[0] <= cx <= t[2] and t[1] <= cy <= t[3] for t in table_boxes)

    entries: list[tuple[float, _Item]] = []  # (top edge, item) in reading order
    placed: set[object] = set()
    for block in ordered:
        if inside_table(block):  # its text is already in the table HTML
            continue
        top = (_box(block) or (0.0, 0.0, 0.0, 0.0))[1]
        table = table_by_layout.get(block.get("layout_id")) if block.get("class") == "table" else None
        if table is not None:
            placed.add(block.get("layout_id"))
            entries.append((top, _Item("html", _table_html(table), index)))
        elif item := _block_item(block, height, running, index):
            entries.append((top, item))
    # A table the layout model did not label as a block goes before the first block starting below its top.
    for table in tables:
        if table.get("layout_id") in placed:
            continue
        top = (_box(table) or (0.0, 0.0, 0.0, 0.0))[1]
        position = next((i for i, (block_top, _) in enumerate(entries) if block_top > top), len(entries))
        entries.insert(position, (top, _Item("html", _table_html(table), index)))
    return _drop_repeats([item for _, item in entries])


def _continues(previous: _Item, item: _Item) -> bool:
    return (
        previous.kind == "p"
        and item.kind == "p"
        and previous.page < item.page
        and not _TERMINAL.search(previous.text)
        and item.text[:1].islower()
    )


def _render(items: list[_Item]) -> str:
    parts: list[str] = []
    n = 0
    while n < len(items):
        item = items[n]
        if item.kind == "note":
            end = n
            while end < len(items) and items[end].kind == "note":
                end += 1
            notes = (note for it in items[n:end] for note in _NOTE_BREAK.split(it.text))
            parts.append('<div class="ocr-footnotes">' + "".join(f"<p>{escape(note)}</p>" for note in notes) + "</div>")
            n = end
            continue
        n += 1
        if item.kind == "html":
            parts.append(item.text)
        elif item.kind == "caption":
            parts.append(f'<p class="ocr-caption"><em>{escape(item.text)}</em></p>')
        elif item.kind in ("h1", "h2"):
            parts.append(f"<{item.kind}>{escape(item.text)}</{item.kind}>")
        else:
            parts.append(f"<p>{escape(item.text)}</p>")
    return "".join(parts)


def build_document_html(pages: Mapping[int, Mapping[str, object]]) -> str:
    running = _running_keys(pages)
    out: list[_Item] = []
    notes: list[_Item] = []
    for index in sorted(pages):
        for item in _page_items(pages[index], index, running):
            if item.kind == "note":
                notes.append(item)
                continue
            if item.kind in ("h1", "h2") and notes:  # footnotes close the section they belong to
                out.extend(notes)
                notes = []
            if out and _continues(out[-1], item):
                previous = out[-1]
                joined = previous.text[:-1] if previous.text[-1:] == "-" else previous.text + " "
                out[-1] = _Item("p", joined + item.text, item.page)
            else:
                out.append(item)
    out.extend(notes)
    return _render(out)
