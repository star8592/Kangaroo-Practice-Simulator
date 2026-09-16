#!/usr/bin/env python3
"""Build source-language-free student assets from PDF question crops.

The source PDF remains untouched. We rasterize each question crop, mask ordinary
source-language words, and preserve numbers, mathematical symbols and short labels.
"""
from __future__ import annotations
import argparse, json, re
from pathlib import Path
import fitz
from PIL import Image, ImageDraw

SAFE_TOKENS = {"K","X","cm","mm","m","kg","g","l","L","ml","°"}


def should_mask(token: str, line_words: int) -> bool:
    token = token.strip()
    if not token:
        return False
    letters = re.findall(r"[A-Za-zÀ-ÿ]", token)
    if not letters:
        return False
    if token in SAFE_TOKENS and line_words <= 2:
        return False
    if len(letters) == 1:
        if token.isupper() and line_words <= 2:
            return False
        return True
    return True


def render_student_asset(page: fitz.Page, crop: fitz.Rect, out: Path, scale: float = 2.4) -> int:
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=crop, alpha=False)
    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    draw = ImageDraw.Draw(image)
    words = page.get_text("words", clip=crop)
    line_counts: dict[tuple[int, int], int] = {}
    for item in words:
        key = (int(item[5]), int(item[6]))
        line_counts[key] = line_counts.get(key, 0) + 1
    masked = 0
    for x0, y0, x1, y1, word, block_no, line_no, *_ in words:
        if not should_mask(str(word), line_counts.get((int(block_no), int(line_no)), 1)):
            continue
        left = max(0, int((x0 - crop.x0) * scale) - 2)
        top = max(0, int((y0 - crop.y0) * scale) - 2)
        right = min(image.width, int((x1 - crop.x0) * scale) + 2)
        bottom = min(image.height, int((y1 - crop.y0) * scale) + 2)
        draw.rectangle((left, top, right, bottom), fill="white")
        masked += 1
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, optimize=True)
    return masked


def localized_ready(q: dict) -> bool:
    loc = q.get("localized", {})
    return bool(loc.get("zh", {}).get("stem") and loc.get("en", {}).get("stem"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("bundle", type=Path)
    ap.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--scale", type=float, default=2.4)
    args = ap.parse_args()
    bundle = json.loads(args.bundle.read_text(encoding="utf-8"))
    exam_id = str(bundle["profile"]["id"])
    root = args.repo_root.resolve()
    out_dir = root / "public" / "local-assets" / exam_id / "student"
    docs: dict[str, fitz.Document] = {}
    total_masked = 0

    for q in bundle.get("questions", []):
        meta = q.get("sourceMeta") or {}
        pdf_path = str(q.get("sourceFile", ""))
        if not pdf_path or not meta.get("crop") or not meta.get("page"):
            raise RuntimeError(f"Missing source metadata for question {q.get('questionNo')}")
        doc = docs.setdefault(pdf_path, fitz.open(pdf_path))
        page = doc[int(meta["page"]) - 1]
        crop = fitz.Rect(*meta["crop"])
        qno = int(q["questionNo"])
        out = out_dir / f"q{qno:02d}.png"
        total_masked += render_student_asset(page, crop, out, args.scale)
        q["studentAssetUrl"] = f"/local-assets/{exam_id}/student/q{qno:02d}.png"
        q.setdefault("review", {})["visualStatus"] = "diagram_only"
        q["examReady"] = localized_ready(q)

    for doc in docs.values():
        doc.close()
    bundle.setdefault("localization", {})
    bundle["localization"].update({"studentLanguages": ["zh", "en"], "sourceFallback": False})
    bundle["profile"]["studentReady"] = all(bool(q.get("examReady")) for q in bundle.get("questions", []))
    args.bundle.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "examId": exam_id,
        "questions": len(bundle.get("questions", [])),
        "maskedWords": total_masked,
        "studentReady": bundle["profile"]["studentReady"],
        "assets": str(out_dir),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
