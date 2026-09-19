"""
Native PDF reader for competition papers.

Priority:
1. Extract native PDF text layer.
2. Preserve page/block metadata.
3. Leave OCR as fallback only.

This module intentionally does not rasterize pages first.
"""

from dataclasses import dataclass, asdict
from pathlib import Path
import json


@dataclass
class PdfBlock:
    page: int
    text: str
    bbox: list | None = None


def extract_native_pdf(pdf_path: str):
    path = Path(pdf_path)
    result = {
        "source": str(path),
        "type": "pdf_native",
        "pages": [],
        "needs_ocr": False,
    }

    try:
        import fitz
    except ImportError:
        result["error"] = "PyMuPDF not installed"
        result["needs_ocr"] = True
        return result

    doc = fitz.open(path)
    total_text = 0

    for index, page in enumerate(doc):
        blocks = page.get_text("blocks")
        page_blocks = []
        for block in blocks:
            text = block[4].strip()
            if text:
                total_text += len(text)
                page_blocks.append(asdict(PdfBlock(
                    page=index + 1,
                    text=text,
                    bbox=list(block[:4])
                )))

        result["pages"].append({
            "page": index + 1,
            "blocks": page_blocks,
        })

    if total_text < 50:
        result["needs_ocr"] = True

    return result


def save_native_extract(pdf_path: str, output: str):
    data = extract_native_pdf(pdf_path)
    Path(output).write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


if __name__ == "__main__":
    import sys
    save_native_extract(sys.argv[1], sys.argv[2])
