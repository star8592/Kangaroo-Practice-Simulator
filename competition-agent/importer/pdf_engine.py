"""
PDF extraction engine foundation.

Pipeline:
PDF -> text extractor -> OCR fallback -> question parser

The module keeps extraction logic separated so scanned competition
papers can later plug into OCR engines without changing dataset format.
"""

from pathlib import Path


def extract_text(pdf_path: str) -> str:
    """Extract text from a PDF.

    Placeholder interface for pdftotext/pdfplumber integration.
    Returns empty text when extraction is unavailable so callers can
    decide whether to trigger OCR.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(pdf_path)
    return ""


def need_ocr(text: str) -> bool:
    """Determine whether OCR fallback is required."""
    return len(text.strip()) == 0


def process_pdf(pdf_path: str) -> dict:
    text = extract_text(pdf_path)
    return {
        "file": str(pdf_path),
        "text": text,
        "ocr_required": need_ocr(text)
    }
