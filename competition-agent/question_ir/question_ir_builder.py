"""
Question IR builder.

Convert reconstructed PDF layout blocks into a stable intermediate
representation for competition questions.

The IR keeps source information, text, assets and math placeholders
separate so translation and teaching layers do not destroy the original
problem structure.
"""

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class QuestionIR:
    question_id: str
    source: dict[str, Any] = field(default_factory=dict)
    content: dict[str, Any] = field(default_factory=dict)
    assets: list[dict[str, Any]] = field(default_factory=list)
    math: dict[str, Any] = field(default_factory=dict)
    translation: dict[str, Any] = field(default_factory=lambda: {
        "language": "zh-CN",
        "status": "pending"
    })

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_question_ir(question_id: str, blocks: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a question object from native PDF layout blocks."""
    text_parts = []
    assets = []

    for block in blocks:
        if block.get("type") == "text":
            text_parts.append(block.get("text", ""))
        elif block.get("type") in {"image", "vector"}:
            assets.append(block)

    question = QuestionIR(
        question_id=question_id,
        source={"type": "pdf_native"},
        content={"en": "\n".join(text_parts).strip()},
        assets=assets,
        math={"latex": None},
    )

    return question.to_dict()
