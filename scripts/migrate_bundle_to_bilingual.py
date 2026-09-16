#!/usr/bin/env python3
"""Convert a legacy local exam bundle into the bilingual question contract.

This does not translate text. It preserves source metadata and creates explicit zh/en
slots so that translation can be applied deterministically later.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from typing import Any

CHOICE_RE = re.compile(r"\(([A-E])\)\s*([^()]+?)(?=\s*\([A-E]\)|$)")


def source_text(q: dict[str, Any]) -> str:
    meta = q.get("sourceMeta")
    if isinstance(meta, dict) and str(meta.get("rawText", "")).strip():
        return str(meta["rawText"]).strip()
    return str(q.get("stem", "")).strip()


def infer_choices(q: dict[str, Any], raw: str) -> list[dict[str, str]]:
    existing = q.get("choices")
    if isinstance(existing, list) and any(str(x.get("label", "")).strip() not in "ABCDE" for x in existing if isinstance(x, dict)):
        return [{"key": str(x.get("key", "")), "label": str(x.get("label", ""))} for x in existing if isinstance(x, dict)]
    found = [{"key": m.group(1), "label": m.group(2).strip()} for m in CHOICE_RE.finditer(raw)]
    if found:
        return found
    return [{"key": c, "label": c} for c in "ABCDE"]


def migrate_question(q: dict[str, Any]) -> dict[str, Any]:
    raw = source_text(q)
    choices = infer_choices(q, raw)
    src_lang = str(q.get("language") or "unknown")
    asset = q.get("assetUrl")
    return {
        "id": q.get("id"),
        "year": q.get("year"),
        "level": q.get("level"),
        "grades": q.get("grades"),
        "questionNo": q.get("questionNo"),
        "points": q.get("points"),
        "concept": q.get("concept", ""),
        "answer": q.get("answer"),
        "source": {
            "language": src_lang,
            "stem": raw,
            "choices": choices,
            "sourcePdf": q.get("sourceFile", ""),
            "sourceCrop": asset or ""
        },
        "localized": {
            "zh": {"stem": "", "choices": [], "solution": ""},
            "en": {"stem": "", "choices": [], "solution": ""}
        },
        "visual": {
            "sourceCrop": asset or "",
            "diagramOnly": "",
            "localizedZh": "",
            "localizedEn": ""
        },
        "review": {
            "translationStatus": "missing",
            "visualStatus": "source_only",
            "verified": bool(q.get("verified", False)),
            "needsReview": False,
            "notes": ""
        },
        "examReady": False,
        "legacy": {"solution": q.get("solution", ""), "sourceMeta": q.get("sourceMeta")}
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input", type=Path)
    ap.add_argument("output", type=Path)
    args = ap.parse_args()
    data = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("questions"), list):
        raise SystemExit("Expected legacy bundle object with questions[]")
    out = {
        "profile": data.get("profile", {}),
        "questions": [migrate_question(q) for q in data["questions"]],
        "localization": {"studentLanguages": ["zh", "en"], "sourceFallback": False}
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"questions": len(out["questions"]), "output": str(args.output)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
