"""
PDF question extractor foundation.

Pipeline stage:
PDF -> extracted text -> question blocks -> questions.en.json

This module intentionally keeps extraction separate from translation.
The translation stage is handled by the bilingual pipeline.
"""

from pathlib import Path
import re


def extract_questions_from_text(text: str):
    """Split plain text into numbered question blocks."""
    pattern = r"(?m)^(?:Question\s*)?(\d+)[\.)、 ]"
    matches = list(re.finditer(pattern, text))
    if not matches:
        return []

    questions = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        questions.append({
            "number": int(match.group(1)),
            "stem": body,
            "language": "en",
            "translationStatus": "pending"
        })
    return questions


def extract_pdf_placeholder(pdf_path: str):
    """Reserved entry for pdftotext/OCR integration."""
    return {
        "source": str(Path(pdf_path)),
        "questions": []
    }


if __name__ == "__main__":
    print("pdf question extractor ready")
