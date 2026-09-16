#!/usr/bin/env python3
"""Generate zh/en localized student images from a private overlay manifest."""
from __future__ import annotations
import argparse, json, subprocess
from pathlib import Path
from typing import Any
from PIL import Image, ImageDraw, ImageFont


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return value


def default_font() -> str:
    return subprocess.check_output(
        ["fc-match", "-f", "%{file}", "Noto Sans CJK SC"], text=True
    ).strip()


def draw_text(draw: ImageDraw.ImageDraw, spec: dict[str, Any], font_path: str) -> None:
    text = str(spec["text"])
    size = int(spec.get("fontSize", 22))
    font = ImageFont.truetype(font_path, size)
    box = spec.get("box")
    if box:
        x0, y0, x1, y1 = [int(x) for x in box]
        bbox = draw.textbbox((0, 0), text, font=font)
        x = x0 + ((x1 - x0) - (bbox[2] - bbox[0])) // 2
        y = y0 + ((y1 - y0) - (bbox[3] - bbox[1])) // 2 - 2
    else:
        x, y = [int(x) for x in spec["xy"]]
    draw.text((x, y), text, font=font, fill=spec.get("fill", "black"))

def render_language(base: Path, out: Path, patches: list[dict[str, Any]], lang: str, font_path: str) -> None:
    image = Image.open(base).convert("RGB")
    draw = ImageDraw.Draw(image)
    for patch in patches:
        if "clear" in patch:
            x0, y0, x1, y1 = [int(x) for x in patch["clear"]]
            draw.rectangle((x0, y0, x1, y1), fill=patch.get("background", "white"))
        spec = patch.get(lang)
        if isinstance(spec, dict) and spec.get("text"):
            draw_text(draw, spec, font_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, optimize=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("bundle", type=Path)
    ap.add_argument("manifest", type=Path)
    ap.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--font")
    ap.add_argument("--verified", action="store_true")
    args = ap.parse_args()

    root = args.repo_root.resolve()
    bundle = load(args.bundle)
    manifest = load(args.manifest)
    exam_id = str(bundle["profile"]["id"])
    if manifest.get("examId") not in (None, exam_id):
        raise SystemExit(f"Manifest examId does not match bundle: {exam_id}")
    font_path = args.font or default_font()
    by_no = {int(q["questionNo"]): q for q in bundle.get("questions", [])}
    changed = 0
    for row in manifest.get("questions", []):
        qno = int(row["questionNo"])
        q = by_no.get(qno)
        if not q:
            raise SystemExit(f"Question {qno} not found in bundle")
        base_url = str(q.get("studentAssetUrl", ""))
        if not base_url:
            raise SystemExit(f"Question {qno} has no studentAssetUrl")
        base = root / "public" / base_url.removeprefix("/local-assets/")
        if not base.exists():
            base = root / "public" / base_url.lstrip("/")
        if not base.exists():
            raise SystemExit(f"Base student asset not found: {base_url}")
        out_dir = root / "public" / "local-assets" / exam_id / "student-localized"
        zh_out = out_dir / f"q{qno:02d}.zh.png"
        en_out = out_dir / f"q{qno:02d}.en.png"
        patches = row.get("patches", [])
        render_language(base, zh_out, patches, "zh", font_path)
        render_language(base, en_out, patches, "en", font_path)
        q["studentAssetUrlZh"] = f"/local-assets/{exam_id}/student-localized/{zh_out.name}"
        q["studentAssetUrlEn"] = f"/local-assets/{exam_id}/student-localized/{en_out.name}"
        review = q.setdefault("review", {})
        review["visualStatus"] = "localized"
        if args.verified:
            review["visualVerified"] = True
        localized = q.get("localized", {})
        bilingual = bool(localized.get("zh", {}).get("stem") and localized.get("en", {}).get("stem"))
        source_verified = bool(q.get("verified") or review.get("verified"))
        q["examReady"] = bool(
            bilingual
            and source_verified
            and review.get("translationStatus") == "reviewed"
            and review.get("visualVerified") is True
            and review.get("needsReview") is not True
        )
        changed += 1

    bundle["profile"]["studentReady"] = all(bool(q.get("examReady")) for q in bundle.get("questions", []))
    args.bundle.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"examId": exam_id, "localizedQuestions": changed, "font": font_path}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
