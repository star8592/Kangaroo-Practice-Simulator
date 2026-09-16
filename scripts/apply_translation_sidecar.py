#!/usr/bin/env python3
"""Merge private zh/en translations into a local bilingual exam bundle.

Translation sidecars are intentionally kept out of the public repository. They are
matched by questionNo and only update localization/review fields.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return value


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("bundle", type=Path)
    ap.add_argument("sidecar", type=Path)
    ap.add_argument("--output", type=Path)
    args = ap.parse_args()

    bundle = load(args.bundle)
    sidecar = load(args.sidecar)
    rows = sidecar.get("questions", [])
    if not isinstance(rows, list):
        raise SystemExit("sidecar.questions must be an array")
    by_no = {int(row["questionNo"]): row for row in rows if isinstance(row, dict) and "questionNo" in row}

    changed = 0
    for q in bundle.get("questions", []):
        if not isinstance(q, dict):
            continue
        no = int(q.get("questionNo", -1))
        src = by_no.get(no)
        if not src:
            continue
        localized = src.get("localized", {})
        if localized.get("zh") and localized.get("en"):
            q["localized"] = localized
            q.setdefault("review", {})["translationStatus"] = src.get("review", {}).get("translationStatus", "reviewed")
            q["review"]["needsReview"] = src.get("review", {}).get("needsReview", False)
            q["examReady"] = False
            changed += 1

    bundle.setdefault("localization", {})
    bundle["localization"].update({"studentLanguages": ["zh", "en"], "sourceFallback": False})
    out = args.output or args.bundle
    out.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"changed": changed, "output": str(out)}, ensure_ascii=False))
    return 0 if changed else 2


if __name__ == "__main__":
    raise SystemExit(main())
