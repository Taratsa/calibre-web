"""Generated cover for books without one: a plain typographic card with the title and the publisher.

Pure rendering (Pillow only, no other ``cps`` module) so the web layer, tasks and scripts can all use it.
Style follows the site design system: neutral light canvas, near-black type, no colour, square corners.
"""

from __future__ import annotations

import contextlib
import hashlib
import html
import os
import re
from functools import lru_cache
from io import BytesIO
from uuid import uuid4

from PIL import Image, ImageDraw, ImageFont

ASPECT = (2, 3)  # width : height, the same ratio the frontend reserves for every cover
DEFAULT_HEIGHT = 1020

_FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "fonts")
_FONT_BOLD = "open-sans-bold.woff"
_FONT_REGULAR = "open-sans-regular.woff"

_CANVAS = "#f2f2f2"
_INK = "#111111"
_MUTED = "#5c5c5c"
_RULE = "#c4c4c4"

_ELLIPSIS = "…"
_SOFT_BREAK = re.compile(r"(?<=[-–—/])")


def size_for(height: int | None) -> tuple[int, int]:
    """(width, height) of a 2:3 card; both even, like the resized real covers."""
    height = int(height or DEFAULT_HEIGHT)
    width = height * ASPECT[0] // ASPECT[1]
    return width + width % 2, height + height % 2


@lru_cache(maxsize=64)
def _font(name: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(os.path.join(_FONT_DIR, name), size)
    except OSError:
        return ImageFont.load_default(size)


def clean_text(value: str | None) -> str:
    """Titles and publishers come out of Calibre with HTML entities and slug underscores."""
    text = html.unescape(value or "").replace("_", " ")
    return re.sub(r"\s+", " ", text).strip()


def _text_x(font, line: str, margin: int) -> int:
    """Left edge for ``line``: glyphs such as ``j`` or ``J`` overhang to the left, so shift them back inside the margin."""
    return margin - min(0, font.getbbox(line)[0])


def _hard_split(text: str, font, max_width: float) -> list[str]:
    """Split a single unbreakable token into pieces that each fit."""
    pieces: list[str] = []
    current = ""
    for char in text:
        if current and font.getlength(current + char) > max_width:
            pieces.append(current)
            current = char
        else:
            current += char
    if current:
        pieces.append(current)
    return pieces


def _wrap(text: str, font, max_width: float) -> list[str]:
    """Greedy wrap. Breaks at spaces, after hyphens and slashes, and inside tokens that are wider than a line."""
    lines: list[str] = []
    line = ""
    for index, word in enumerate(text.split(" ")):
        for part_index, part in enumerate(p for p in _SOFT_BREAK.split(word) if p):
            joiner = " " if part_index == 0 and index > 0 and line else ""
            if font.getlength(line + joiner + part) <= max_width:
                line += joiner + part
                continue
            if line:
                lines.append(line)
                line = ""
            if font.getlength(part) <= max_width:
                line = part
                continue
            *full, line = _hard_split(part, font, max_width)
            lines.extend(full)
    if line:
        lines.append(line)
    return lines


def _ellipsize(line: str, font, max_width: float) -> str:
    line = line.rstrip()
    while line and font.getlength(line + _ELLIPSIS) > max_width:
        line = line[:-1].rstrip()
    return line + _ELLIPSIS


def _clamp_lines(lines: list[str], max_lines: int, font, max_width: float) -> list[str]:
    if len(lines) <= max_lines:
        return lines
    kept = lines[:max_lines]
    kept[-1] = _ellipsize(kept[-1] + " " + " ".join(lines[max_lines:]), font, max_width)
    return kept


def _fit_title(
    text: str, max_width: float, max_height: float, width: int
) -> tuple[ImageFont.FreeTypeFont, list[str], int]:
    """Largest type size whose wrapped title fits the box; truncated with an ellipsis at the smallest size."""
    largest = max(10, round(width * 0.115))
    smallest = max(8, round(width * 0.062))
    step = max(1, round(width * 0.004))
    for size in range(largest, smallest - 1, -step):
        font = _font(_FONT_BOLD, size)
        lines = _wrap(text, font, max_width)
        line_height = round(size * 1.22)
        if len(lines) * line_height <= max_height:
            return font, lines, line_height
    font = _font(_FONT_BOLD, smallest)
    line_height = round(smallest * 1.22)
    lines = _wrap(text, font, max_width)
    return font, _clamp_lines(lines, max(1, int(max_height // line_height)), font, max_width), line_height


def render(
    title: str | None, publisher: str | None = None, height: int | None = None, fmt: str = "jpeg"
) -> tuple[bytes, str]:
    """Render the card. Returns ``(bytes, mimetype)``; ``fmt`` is ``"jpeg"`` or ``"webp"``."""
    width, height = size_for(height)
    margin = round(width * 0.09)
    inner = width - 2 * margin

    image = Image.new("RGB", (width, height), _CANVAS)
    draw = ImageDraw.Draw(image)

    # Short bar above the title: the one fixed graphic element of the template.
    bar_height = max(2, round(width * 0.012))
    draw.rectangle((margin, margin, margin + round(width * 0.14), margin + bar_height - 1), fill=_INK)

    # Publisher block, anchored to the bottom edge.
    publisher_text = clean_text(publisher)
    bottom = height - margin
    if publisher_text:
        size = max(8, round(width * 0.05))
        font = _font(_FONT_REGULAR, size)
        line_height = round(size * 1.3)
        lines = _clamp_lines(_wrap(publisher_text, font, inner), 2, font, inner)
        top = bottom - len(lines) * line_height
        for number, line in enumerate(lines):
            draw.text((_text_x(font, line, margin), top + number * line_height), line, font=font, fill=_MUTED)
        rule_y = top - round(width * 0.04)
        draw.rectangle((margin, rule_y, width - margin, rule_y + max(1, round(width * 0.003)) - 1), fill=_RULE)
        bottom = rule_y

    title_top = margin + bar_height + round(width * 0.08)
    title_box = bottom - round(width * 0.05) - title_top
    title_text = clean_text(title) or "—"
    font, lines, line_height = _fit_title(title_text, inner, title_box, width)
    for number, line in enumerate(lines):
        draw.text((_text_x(font, line, margin), title_top + number * line_height), line, font=font, fill=_INK)

    out = BytesIO()
    if fmt == "webp":
        image.save(out, "WEBP", quality=88, method=4)
        return out.getvalue(), "image/webp"
    image.save(out, "JPEG", quality=90, optimize=True)
    return out.getvalue(), "image/jpeg"


def cache_name(title: str, publisher: str, height: int, fmt: str) -> str:
    """File name for a rendered card, derived from the inputs and nothing else.

    The Rust backend computes the same name to serve a card Flask has already rendered (it never renders one itself), so
    the recipe is a contract between the two: UTF-8 of ``title \\0 publisher \\0 height \\0 fmt``, SHA-256, first 32 hex
    digits, extension ``webp`` or ``jpg``. A retitled book or an edited publisher gets a new name; the old file is left
    for the cache owner to prune.
    """
    digest = hashlib.sha256(f"{title}\x00{publisher}\x00{height}\x00{fmt}".encode()).hexdigest()[:32]
    return f"{digest}.{'webp' if fmt == 'webp' else 'jpg'}"


def render_persisted(
    title: str | None, publisher: str | None, height: int, fmt: str, cache_dir: str
) -> tuple[bytes, str]:
    """``render`` once per card, kept on disk: a crawler asks for the same few thousand cards over and over, and each
    render costs ~60 ms of Pillow. Returns ``(bytes, mimetype)``. A failed write only costs a future re-render."""
    mimetype = "image/webp" if fmt == "webp" else "image/jpeg"
    path = os.path.join(cache_dir, cache_name(title or "", publisher or "", height, fmt))
    try:
        with open(path, "rb") as cached:
            return cached.read(), mimetype
    except FileNotFoundError:
        pass
    data, mimetype = render(title, publisher, height, fmt)
    temporary = f"{path}.{os.getpid()}.{uuid4().hex}.tmp"
    try:
        with open(temporary, "wb") as out:
            out.write(data)
        os.replace(temporary, path)
    except OSError:
        with contextlib.suppress(OSError):
            os.unlink(temporary)
    return data, mimetype
