"""Run one PDF extraction job in a disposable process."""

from __future__ import annotations

import importlib
import json
import resource
import sys
from pathlib import Path
from typing import Protocol, cast

OCR_REQUIRED_PDF_TYPES = {"scanned", "image_based", "mixed"}


class PdfResult(Protocol):
    pdf_type: str
    markdown: str | None
    page_count: int
    pages_needing_ocr: list[int]
    processing_time_ms: int


class PdfOcrResult(Protocol):
    markdown: str
    page_count: int
    pages_routed_to_ocr: list[int]
    processing_time_ms: int


class PdfInspector(Protocol):
    def process_pdf(self, path: str) -> PdfResult: ...

    def process_pdf_with_ocr(self, path: str, *, mode: str = "auto", offline: bool = False) -> PdfOcrResult: ...


def _write_result(output_path: Path, payload: dict[str, object]) -> None:
    _ = output_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def main() -> int:
    if len(sys.argv) != 5:
        _ = sys.stderr.write("usage: ocr_worker.py PDF_PATH OUTPUT_PATH OFFLINE MEMORY_MB\n")
        return 2

    pdf_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    offline = sys.argv[3] == "1"
    memory_bytes = int(sys.argv[4]) * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))

    try:
        pdf_inspector = cast(PdfInspector, cast(object, importlib.import_module("pdf_inspector")))

        inspection = pdf_inspector.process_pdf(str(pdf_path))
        pdf_type = inspection.pdf_type.lower()
        if pdf_type in OCR_REQUIRED_PDF_TYPES or inspection.pages_needing_ocr:
            result = pdf_inspector.process_pdf_with_ocr(str(pdf_path), mode="auto", offline=offline)
            content = result.markdown
            page_count = result.page_count
            pages_routed_to_ocr = len(result.pages_routed_to_ocr)
            processing_time_ms = result.processing_time_ms
        else:
            content = inspection.markdown or ""
            page_count = inspection.page_count
            pages_routed_to_ocr = 0
            processing_time_ms = inspection.processing_time_ms

        _write_result(
            output_path,
            {
                "status": "ready",
                "content": content,
                "page_count": page_count,
                "pages_routed_to_ocr": pages_routed_to_ocr,
                "processing_time_ms": processing_time_ms,
            },
        )
        return 0
    except Exception as exc:
        _ = sys.stderr.write(f"{type(exc).__name__}: {exc}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
