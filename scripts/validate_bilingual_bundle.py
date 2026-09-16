#!/usr/bin/env python3
"""Validate bilingual exam bundles before they are exposed to students.

The validator is intentionally independent from the web app. It checks the local JSON
bundle produced by the translation pipeline and blocks source-language fallbacks.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from typing import Any

DIGIT_RE = re.compile(r"(?<!\w)\d+(?:[.,]\d+)?(?:%|°)?")
MATH_RE = re.compile(r"[+\-×÷=<>≤≥°%]")
SOURCE_HINTS = {
    "pt": ("qual", "quantos", "figura", "abaixo", "resposta", "mostra", "cada"),
    "de": ("welche", "abbildung", "antwort", "zeigt", "wie viele"),
    "fr": ("quelle", "figure", "réponse", "combien", "montre"),
}


def load_questions(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    raise ValueError("Expected a question array or an object containing questions[]")


def choice_keys(q: dict[str, Any], section: str, lang: str | None = None) -> list[str]:
    if section == "source":
        rows = q.get("source", {}).get("choices", [])
    else:
        rows = q.get("localized", {}).get(lang or "", {}).get("choices", [])
    return [str(x.get("key", "")) for x in rows if isinstance(x, dict)]


def visible_text(q: dict[str, Any], lang: str) -> str:
    loc = q.get("localized", {}).get(lang, {})
    bits = [str(loc.get("stem", "")), str(loc.get("solution", ""))]
    bits.extend(str(x.get("label", "")) for x in loc.get("choices", []) if isinstance(x, dict))
    return " ".join(bits)


def nums(text: str) -> list[str]:
    return DIGIT_RE.findall(text)


def validate(q: dict[str, Any], assets_root: Path | None) -> list[str]:
    errors: list[str] = []
    qid = str(q.get("id", "<missing-id>"))
    source = q.get("source", {})
    localized = q.get("localized", {})
    src_lang = str(source.get("language", ""))
    src_text = str(source.get("stem", "")) + " " + " ".join(
        str(x.get("label", "")) for x in source.get("choices", []) if isinstance(x, dict)
    )

    for lang in ("zh", "en"):
        loc = localized.get(lang)
        if not isinstance(loc, dict) or not str(loc.get("stem", "")).strip():
            errors.append(f"{qid}: missing {lang} stem")
            continue
        if choice_keys(q, "localized", lang) != choice_keys(q, "source"):
            errors.append(f"{qid}: {lang} choice keys differ from source")
        if sorted(nums(visible_text(q, lang))) != sorted(nums(src_text)):
            errors.append(f"{qid}: {lang} numeric tokens differ from source")
        src_math = MATH_RE.findall(src_text)
        dst_math = MATH_RE.findall(visible_text(q, lang))
        if len(dst_math) + 1 < len(src_math):
            errors.append(f"{qid}: {lang} may have lost mathematical symbols")

    answer = str(q.get("answer", ""))
    keys = choice_keys(q, "source")
    if answer not in keys:
        errors.append(f"{qid}: answer {answer!r} is not a source choice key")

    for lang in ("zh", "en"):
        text = visible_text(q, lang).lower()
        hits = [w for w in SOURCE_HINTS.get(src_lang, ()) if w in text]
        if len(hits) >= 2:
            errors.append(f"{qid}: {lang} contains likely {src_lang} residue: {hits[:4]}")

    review = q.get("review", {})
    visual = q.get("visual", {})
    visual_status = review.get("visualStatus")
    if visual_status == "diagram_only" and not visual.get("diagramOnly"):
        errors.append(f"{qid}: diagram_only visual has no diagramOnly asset")
    if visual_status == "localized":
        if not visual.get("localizedZh") or not visual.get("localizedEn"):
            errors.append(f"{qid}: localized visual requires zh and en assets")

    if assets_root:
        for field in ("diagramOnly", "localizedZh", "localizedEn"):
            value = visual.get(field)
            if value:
                candidate = assets_root / str(value).lstrip("/")
                if not candidate.exists() or candidate.stat().st_size == 0:
                    errors.append(f"{qid}: missing/empty asset {field}: {candidate}")

    gate_ok = (
        not errors
        and review.get("translationStatus") == "reviewed"
        and review.get("verified") is True
        and review.get("needsReview") is not True
    )
    if bool(q.get("examReady")) != gate_ok:
        errors.append(f"{qid}: examReady={q.get('examReady')} but computed gate={gate_ok}")
    return errors


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("bundle", type=Path)
    ap.add_argument("--assets-root", type=Path)
    args = ap.parse_args()
    questions = load_questions(args.bundle)
    errors: list[str] = []
    for q in questions:
        errors.extend(validate(q, args.assets_root))
    report = {"questions": len(questions), "errors": len(errors), "ok": not errors}
    print(json.dumps(report, ensure_ascii=False))
    for error in errors:
        print("ERROR", error)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
