"""
Native PDF layout reconstruction.

This module converts extracted PDF blocks (text + bounding boxes)
into a logical reading order before question parsing.

The pipeline prefers born-digital PDF structure and keeps OCR as fallback.
"""

from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass
class Block:
    text: str
    bbox: List[float]
    page: int


def sort_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Restore approximate reading order using page and coordinates."""
    return sorted(
        blocks,
        key=lambda b: (
            b.get("page", 0),
            b.get("bbox", [0, 0])[1],
            b.get("bbox", [0, 0])[0],
        ),
    )


def reconstruct_page(blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
    ordered = sort_blocks(blocks)
    return {
        "blocks": ordered,
        "text": "\n".join(
            b.get("text", "") for b in ordered if b.get("text")
        ),
        "source_type": "pdf_native",
    }
