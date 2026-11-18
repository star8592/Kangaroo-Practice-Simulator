#!/usr/bin/env python3
"""Local-only bilingual 2026 original-image review PDF, Pillow renderer.

No network, no browser and no commercial publication; preserves source
mathematics/diagrams as PDF pixels and a separate draft Chinese overlay.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from amc8_2026_editing import UNACCEPTABLE_STEM_MARKERS, private_crop_directory

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "private/exams/maa-amc8-2026-us-reference-internal.json"
CROPS = ROOT / "private/assets/maa-amc8-2026-us-internal"
OUTPUT = ROOT / "private/drafts/maa-amc8-2026-us-bilingual-internal-review.pdf"
MATH_LEDGER = ROOT / "private/drafts/maa-amc8-2026-us-math-independent-ledger.json"
FONT = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
PAGESIZE = (1240, 1754)
MARGIN = 68
MAX_CONTENT_W = PAGESIZE[0] - 2 * MARGIN


def wrap_zh(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for ch in text:
        if draw.textbbox((0, 0), current + ch, font=font)[2] <= width:
            current += ch
        else:
            if current:
                lines.append(current)
            current = ch
    if current:
        lines.append(current)
    return lines


def build() -> None:
    if private_crop_directory(ROOT) != CROPS.resolve():
        raise RuntimeError("PRIVATE_SOURCE_DIRECTORY_MISMATCH")
    if not FONT.is_file() or not DRAFT.is_file():
        raise RuntimeError("LOCAL_CJK_FONT_OR_DRAFT_MISSING")
    data = json.loads(DRAFT.read_text(encoding="utf-8"))
    profile, questions = data["profile"], data["questions"]
    math = json.loads(MATH_LEDGER.read_text(encoding="utf-8"))
    calculations = math.get("calculations", {})
    if (math.get("matches_private_reference_key") != 25 or
            set(calculations) != {str(n) for n in range(1, 26)} or
            any(calculations[str(n)]["answer"] != questions[n - 1]["answer"] for n in range(1, 26))):
        raise RuntimeError("PRIVATE_MATH_AUDIT_NOT_25_REFERENCE_MATCHED")
    if len(questions) != 25 or profile["rightsPolicy"]["commercialUse"] is not False:
        raise RuntimeError("NOT_A_REVIEW_ONLY_25Q_BUNDLE")
    if any(q["examReady"] is not False or q["review"]["needsReview"] is not True for q in questions):
        raise RuntimeError("DRAFT_ILLEGALLY_MARKED_READY")
    if any(marker in q["stem"] for q in questions for marker in UNACCEPTABLE_STEM_MARKERS):
        raise RuntimeError("EDITORIAL_COMMENT_LEAKED_IN_REVIEW_PDF_STEM")
    if any(len(q.get("choices", [])) != 5 or any(not x.get("label") or x.get("label", "").startswith("参见原卷的") for x in q["choices"]) for q in questions):
        raise RuntimeError("NOT_A_COMPLETE_BILINGUAL_OPTION_DRAFT")
    title_font = ImageFont.truetype(str(FONT), 39)
    body_font = ImageFont.truetype(str(FONT), 28)
    note_font = ImageFont.truetype(str(FONT), 22)
    pages: list[Image.Image] = []
    review_panels = 0
    for n, q in enumerate(questions, 1):
        source = CROPS / f"q{n:02}.png"
        if not source.is_file():
            raise RuntimeError(f"Q{n} SOURCE_CROP_MISSING")
        page = Image.new("RGB", PAGESIZE, "#ffffff")
        draw = ImageDraw.Draw(page)
        draw.text((MARGIN, 46), f"2026 AMC 8 美国原卷 · 第 {n:02d} / 25 题",
                  font=title_font, fill="#16324f")
        draw.text((MARGIN, 104), "中文参考译文（待校对） · 下方为原始英文题目、公式、图形和选项",
                  font=note_font, fill="#6a7684")
        y = 153
        lines = wrap_zh(draw, "中文：" + q["stem"], body_font, MAX_CONTENT_W)
        for line in lines:
            draw.text((MARGIN, y), line, font=body_font, fill="#20334a")
            y += 43
        y += 18
        for option in q["choices"]:
            option_text = str(option["key"]) + ".  " + str(option["label"])
            for option_line in wrap_zh(draw, option_text, note_font, MAX_CONTENT_W):
                draw.text((MARGIN + 10, y), option_line, font=note_font, fill="#28465e")
                y += 34
            y += 4
        y += 18
        editor_note = q["review"].get("reviewerNotes", "")
        if editor_note:
            for line in wrap_zh(draw, "审校备注（不属于题目）： " + editor_note, note_font, MAX_CONTENT_W):
                draw.text((MARGIN, y), line, font=note_font, fill="#8a5d16")
                y += 34
            y += 12
        src = Image.open(source).convert("RGB")
        max_h = PAGESIZE[1] - y - 185
        if max_h <= 200:
            raise RuntimeError(f"Q{n} NO_VERTICAL_SPACE")
        factor = min(MAX_CONTENT_W / src.width, max_h / src.height, 1)
        resized = src.resize((round(src.width * factor), round(src.height * factor)), Image.Resampling.LANCZOS)
        page.paste(resized, (MARGIN, y))
        review_top = max(y + resized.height + 42, 875)
        if review_top + 250 <= PAGESIZE[1] - 172:
            review_panels += 1
            draw.rounded_rectangle(
                (MARGIN, review_top, PAGESIZE[0] - MARGIN, review_top + 245),
                radius=14, fill="#f5f8fb", outline="#ccd7e3", width=2,
            )
            draw.text(
                (MARGIN + 25, review_top + 16), "逐题校对工作区（仅审核人员填写）",
                font=body_font, fill="#24435f",
            )
            draw.text(
                (MARGIN + 25, review_top + 67),
                "[ ] 译文准确    [ ] 5个选项一致    [ ] 公式与根号范围    [ ] 图形尺寸与标注",
                font=note_font, fill="#334e69",
            )
            draw.text(
                (MARGIN + 25, review_top + 103),
                "[ ] 解题过程单独复核    [ ] 原卷版本与年份确认",
                font=note_font, fill="#334e69",
            )
            draw.text(
                (MARGIN + 25, review_top + 144),
                "待改问题：____________________________________________________________",
                font=note_font, fill="#61748a",
            )
            draw.text(
                (MARGIN + 25, review_top + 189),
                "审核人：________________  日期：________________   本题尚未签核",
                font=note_font, fill="#61748a",
            )
        # Reviewer-only answer checkpoint, not part of student-facing questions.
        draw.text(
            (MARGIN, PAGESIZE[1] - 143),
            f"数学核验答案：{q['answer']}  ·  中文/图形终审：待签核",
            font=note_font, fill="#285a48",
        )
        draw.line((MARGIN, PAGESIZE[1] - 85, PAGESIZE[0] - MARGIN, PAGESIZE[1] - 85),
                  fill="#d4dce4", width=2)
        draw.text((MARGIN, PAGESIZE[1] - 72),
                  "本机内部校对 · 数学已核算 · 中英选项/图形/授权待审 · 禁止销售",
                  font=note_font, fill="#748092")
        pages.append(page)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(OUTPUT, format="PDF", save_all=True, append_images=pages[1:],
                  resolution=150.0, title="AMC8 2026 US bilingual internal review")
    print(f"AMC8_BILINGUAL_REVIEW_PDF_READY pages=25 path={OUTPUT}")
    print(f"PDF_BYTES={OUTPUT.stat().st_size}")
    print(f"REVIEWER_CHECKLIST_PANELS={review_panels}/25; HUMAN_APPROVED=NO")


if __name__ == "__main__":
    build()
