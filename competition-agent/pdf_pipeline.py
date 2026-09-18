#!/usr/bin/env python3
"""PDF processing pipeline placeholder.

Next stages:
PDF -> text extraction -> OCR fallback -> question parser.
"""

from pathlib import Path


def inspect_pdf(path: str):
    p = Path(path)
    return {
        "file": str(p),
        "exists": p.exists(),
        "type": "pdf"
    }


if __name__ == "__main__":
    import sys
    print(inspect_pdf(sys.argv[1]))
