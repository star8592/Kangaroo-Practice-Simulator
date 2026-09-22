#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, shutil
from pathlib import Path

from extract_austria_paper import crop_questions

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--exam", action="append", default=[])
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    root = args.root.resolve()
    if not args.exam:
        raise SystemExit("--exam is required")

    changed = []
    for exam_id in args.exam:
        path = root / "private" / "exams" / f"{exam_id}.json"
        if not path.exists():
            raise SystemExit(f"missing bundle: {path}")
        bundle = json.loads(path.read_text(encoding="utf-8"))
        qs = bundle.get("questions") or []
        if not qs:
            continue

        source = Path(str(qs[0].get("sourceFile") or ""))
        if not source.exists():
            raise SystemExit(f"missing source PDF: {source}")

        preview = root / "private" / "source-digitization" / "recrop-preview" / exam_id
        out_dir = (root / "public" / "local-assets" / exam_id) if args.apply else preview
        if preview.exists() and not args.apply:
            shutil.rmtree(preview)

        rows = crop_questions(source, out_dir, len(qs))
        by_no = {int(r["questionNo"]): r for r in rows}
        dirty = False

        for q in qs:
            qno = int(q["questionNo"])
            row = by_no[qno]
            meta = q.get("sourceMeta")
            if not isinstance(meta, dict):
                meta = {}
            old = {
                "page": meta.get("page"),
                "crop": meta.get("crop"),
                "rawText": meta.get("rawText"),
            }
            new = {
                "page": row["page"],
                "crop": row["crop"],
                "rawText": row["rawText"],
            }

            if old != new:
                changed.append({
                    "examId": exam_id,
                    "questionNo": qno,
                    "old": old,
                    "new": new,
                    "asset": q.get("assetUrl"),
                    "mode": "apply" if args.apply else "dry-run",
                })
                if args.apply:
                    canonical = meta.get("canonicalSource")
                    meta.update(new)
                    if canonical is not None:
                        meta["canonicalSource"] = canonical
                    q["sourceMeta"] = meta
                    dirty = True

        if dirty and args.apply:
            path.write_text(
                json.dumps(bundle, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    for row in changed:
        print(json.dumps(row, ensure_ascii=False))
    print(json.dumps({
        "examCount": len(args.exam),
        "changedQuestions": len(changed),
        "mode": "apply" if args.apply else "dry-run",
    }, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
