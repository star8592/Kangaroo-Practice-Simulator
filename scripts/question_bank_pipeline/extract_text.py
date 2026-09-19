"""
Question bank PDF text extraction stage.

Priority:
1. Extract native PDF text first.
2. Preserve page boundaries.
3. Keep source metadata for later question parsing.
4. OCR should only be used by a later stage for image-only PDFs.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def extract_pdf_text(pdf_path: str) -> dict[str, Any]:
    path = Path(pdf_path)
    pages: list[dict[str, Any]] = []

    try:
        import fitz  # pymupdf
    except ImportError as exc:
        raise RuntimeError("需要安装 pymupdf 才能解析PDF文本") from exc

    document = fitz.open(path)

    for index, page in enumerate(document):
        pages.append(
            {
                "page": index + 1,
                "text": page.get_text("text"),
            }
        )

    return {
        "source": path.name,
        "pages": pages,
    }


def save_extraction(pdf_path: str, output_path: str) -> None:
    result = extract_pdf_text(pdf_path)
    Path(output_path).write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract PDF native text")
    parser.add_argument("pdf")
    parser.add_argument("output")
    args = parser.parse_args()

    save_extraction(args.pdf, args.output)
    print(f"saved: {args.output}")
