"""PDF extraction stage for CompetitionBank-Agent.

This module keeps source extraction separate from translation.
It first attempts text extraction and leaves OCR fallback hooks.
"""

from pathlib import Path


def extract_pdf_metadata(pdf_path: str) -> dict:
    path = Path(pdf_path)
    return {
        "file": path.name,
        "suffix": path.suffix.lower(),
        "ready_for_ocr": True,
    }


def extract_text(pdf_path: str) -> str:
    """Placeholder for pdftotext/OCR integration."""
    return ""
