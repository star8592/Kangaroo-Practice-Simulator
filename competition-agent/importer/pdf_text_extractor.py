"""
Real PDF text extraction adapter.

Pipeline:
PDF -> text extraction -> normalized pages -> question parser

Keeps extraction independent from question parsing so different PDF sources
can be handled consistently.
"""

from pathlib import Path
import json


def extract_text(pdf_path: str):
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(pdf_path)

    try:
        import pypdf
        reader = pypdf.PdfReader(str(path))
        pages = []
        for index, page in enumerate(reader.pages, start=1):
            pages.append({
                "page": index,
                "text": page.extract_text() or ""
            })
        return pages
    except Exception as exc:
        return [{
            "page": 0,
            "text": "",
            "error": str(exc),
            "needs_ocr": True
        }]


def save_extraction(pdf_path: str, output: str):
    data = {
        "source": pdf_path,
        "pages": extract_text(pdf_path)
    }
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return output


if __name__ == "__main__":
    import sys
    save_extraction(sys.argv[1], sys.argv[2])
