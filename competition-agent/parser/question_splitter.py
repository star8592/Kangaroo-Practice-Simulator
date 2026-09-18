"""Split extracted contest text into question units."""

import re


def split_questions(text: str):
    """Basic splitter, upgraded later with OCR layout models."""
    parts = re.split(r"\n\s*(?:Q)?\d+[\.)]", text)
    return [p.strip() for p in parts if p.strip()]
