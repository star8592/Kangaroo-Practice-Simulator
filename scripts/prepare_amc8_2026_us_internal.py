#!/usr/bin/env python3
"""Prepare an internal-only, visually faithful bilingual 2026 US AMC8 draft.

Reads locally held reference PDFs; never downloads or commits question text,
images, or a new commercial license. Source PDF pixels preserve formulas,
diagrams, English stems and option labels. Draft Chinese overlay remains
independently reviewable and is explicitly NOT commercial-ready.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/mnt/disk1/Research/AMC8/2025-2026-source-reference/2026-MAA-booklet-scan-reference.pdf")
KEY = Path("/mnt/disk1/Research/AMC8/2025-2026-source-reference/2026-LIVE-answer-key-reference.pdf")
ZH = ROOT / "private/drafts/maa-amc8-2026-us-zh-draft.json"
BUNDLE = ROOT / "private/exams/maa-amc8-2026-us-reference-internal.json"
ASSETS = ROOT / "public/local-assets/maa-amc/archive-amc8/2026-us-internal"
EXAM_ID = "maa-amc8-2026-us-reference-internal"
ENGLISH_SHA = "70daec35c1ab2c0bfd16c97925a475d26dbb6c3cc31899bf3f91beee7d4b588f"
REFERENCE_ANSWER_SHA256 = ("15030752bdf9f61f69e8131901ec37f6"
                           "a9d85b90851debff9179e89091dca593")
NS = "{http://www.w3.org/1999/xhtml}"
EXPECTED_DISTRIBUTION = {2: 5, 3: 4, 4: 3, 5: 4, 6: 4, 7: 4, 8: 1}
DPI = 170


def run(args: list[str]) -> None:
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def preflight() -> dict:
    if not SRC.is_file() or sha256(SRC) != ENGLISH_SHA:
        raise RuntimeError("SOURCE_SHA256_CHANGED_OR_MISSING")
    if not KEY.is_file() or sha256(KEY) != REFERENCE_ANSWER_SHA256:
        raise RuntimeError("ANSWER_SOURCE_SHA256_CHANGED_OR_MISSING")
    data = json.loads(ZH.read_text(encoding="utf-8"))
    translations = data.get("zh")
    if not isinstance(translations, dict) or sorted(map(int, translations)) != list(range(1, 26)):
        raise RuntimeError("TRANSLATION_COVERAGE_INVALID")
    if any(not isinstance(translations[str(n)], str) or len(translations[str(n)]) < 10 for n in range(1, 26)):
        raise RuntimeError("TRANSLATION_MISSING_TEXT")
    return translations


def original_positions() -> list[tuple[int, int, float]]:
    with tempfile.TemporaryDirectory(prefix="amc8-2026-layout-") as temp:
        xml = Path(temp) / "bbox.html"
        run(["pdftotext", "-bbox-layout", str(SRC), str(xml)])
        doc = ET.parse(xml).getroot()
    found = {}
    for pg, page in enumerate(doc.iter(NS + "page"), 1):
        if pg == 1:
            continue
        for word in page.iter(NS + "word"):
            token = "".join(word.itertext()).strip()
            num = token[:-1] if token.endswith(".") else token
            if not num.isdigit() or int(num) not in range(1, 26):
                continue
            x, y = float(word.attrib["xMin"]), float(word.attrib["yMin"])
            h = float(word.attrib["yMax"]) - y
            # The original MAA booklet has a stable left-margin question
            # number column (Q1..9 x=86.3pt, Q10..25 x=80.5pt).
            if not (79 <= x <= 88 and 9.9 <= h <= 11.2 and 62 <= y <= 735):
                continue
            n = int(num)
            found.setdefault(n, []).append((pg, y))
    if sorted(found) != list(range(1, 26)) or any(len(v) != 1 for v in found.values()):
        raise RuntimeError("QUESTION_START_LOCATION_UNVERIFIED")
    positions = [(n, found[n][0][0], found[n][0][1]) for n in range(1, 26)]
    distribution = {pg: sum(p == pg for _, p, _ in positions) for pg in range(2, 9)}
    if distribution != EXPECTED_DISTRIBUTION:
        raise RuntimeError("QUESTION_DISTRIBUTION_MISMATCH")
    if any((positions[i][1], positions[i][2]) <= (positions[i - 1][1], positions[i - 1][2]) for i in range(1, 25)):
        raise RuntimeError("QUESTION_START_ORDER_INVALID")
    return positions


def answers() -> list[str]:
    text = subprocess.run(
        ["pdftotext", "-layout", str(KEY), "-"],
        check=True, stdout=subprocess.PIPE, text=True,
    ).stdout
    found = {int(n): a for n, a in re.findall(r"(?<!\d)(\d{1,2})\.\s*([A-E])\b", text)}
    if sorted(found) != list(range(1, 26)):
        raise RuntimeError("ANSWER_KEY_NOT_25_COMPLETE")
    return [found[n] for n in range(1, 26)]


def verified_math_results(keys: list[str]) -> dict[int, dict]:
    # Independent numerical verifier is written separately from the PDF
    # extraction and official answer-key parser.
    from verify_amc8_2026_independent_math import independently_calculate
    calculations = independently_calculate()
    if sorted(calculations) != list(range(1, 26)):
        raise RuntimeError("INDEPENDENT_MATH_QUESTION_COVERAGE_INVALID")
    discrepancies = [n for n in range(1, 26)
                     if keys[n-1] != calculations[n]["answer"]]
    if discrepancies:
        raise RuntimeError(f"INDEPENDENT_MATH_ANSWER_MISMATCH: {discrepancies}")
    return calculations


def original_crops(positions: list[tuple[int, int, float]], target: Path) -> list[dict]:
    target.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="amc8-2026-pixels-") as temp:
        prefix = Path(temp) / "source"
        run(["pdftoppm", "-f", "2", "-l", "8", "-r", str(DPI), "-png", str(SRC), str(prefix)])
        pages = {n: Path(temp) / f"source-{n}.png" for n in range(2, 9)}
        if any(not p.is_file() for p in pages.values()):
            raise RuntimeError("PDF_RENDER_MISSING_PAGE")
        results = []
        for i, (n, pg, y) in enumerate(positions):
            image = Image.open(pages[pg]).convert("RGB")
            sx, sy = image.width / 612, image.height / 792
            top = max(0, round((y - 13) * sy))
            next_y = positions[i + 1][2] if i + 1 < 25 and positions[i + 1][1] == pg else 753
            bottom = min(image.height, round((next_y - 8 if next_y != 753 else 748) * sy))
            box = (round(54 * sx), top, round(572 * sx), bottom)
            if bottom - top < round(63 * sy):
                raise RuntimeError(f"Q{n}: CROP_TOO_SHORT")
            out = target / f"q{n:02}.png"
            crop = image.crop(box)
            # Trim excessive empty space below last problems (especially Q25)
            # without touching any original letter, formula, answer or figure.
            ink = crop.convert("L").point(lambda value: 255 if value < 220 else 0)
            content = ink.getbbox()
            if not content:
                raise RuntimeError(f"Q{n}: EMPTY_SOURCE_CROP")
            trim_bottom = min(crop.height, content[3] + round(11 * sy))
            if trim_bottom < round(55 * sy):
                raise RuntimeError(f"Q{n}: SUSPICIOUS_TRIM")
            crop.crop((0, 0, crop.width, trim_bottom)).save(out, optimize=True)
            if out.stat().st_size < 3500:
                raise RuntimeError(f"Q{n}: IMAGE_TOO_SMALL")
            results.append({
                "questionNo": n, "sourcePdfPage": pg,
                "cropPdfPoints": [54, round(y - 13, 2), 572, round(next_y - 8 if next_y != 753 else 748, 2)],
                "pngSha256": sha256(out), "bytes": out.stat().st_size,
            })
    if len(list(target.glob("q*.png"))) != 25:
        raise RuntimeError("CROP_COUNT_MISMATCH")
    return results


def make_bundle(zh: dict, keys: list[str], crops: list[dict], math_checks: dict[int, dict]) -> dict:
    profile = {
        "id": EXAM_ID, "name": "2026 MAA AMC 8 · US original booklet · Internal bilingual draft",
        "nameZh": "2026 AMC 8 美国版原卷 · 中英双语校对草稿",
        "nameEn": "2026 AMC 8 US original booklet — internal bilingual draft",
        "grades": "Grade 8 and below", "gradesZh": "8年级及以下", "gradesEn": "Grade 8 and below",
        "durationSeconds": 2400, "questionCount": 25, "initialScore": 0, "maxScore": 25,
        "wrongPenaltyMode": "fixed", "wrongPenaltyValue": 0, "blankScoreValue": 0,
        "country": "MAA AMC US", "year": 2026, "language": "zh-en-stacked",
        "sourceLabel": "Original 2026 MAA AMC8 booklet; internal bilingual research, no redistribution",
        "sourceLabelZh": "2026 MAA AMC 8 美国原卷内部双语校对草稿，禁止商用发布",
        "studentReady": False, "competitionId": "maa-amc", "formatId": "maa-amc8",
        "paperType": "past", "gradeBand": "7-8", "timingMode": "official",
        "rightsPolicy": {"rightsClass": "educational-share", "license": None,
                         "publicQuestionDisplay": False, "commercialUse": False},
        "rulesSummaryZh": "原卷25题，限时40分钟；每题答对1分，答错或空题0分；禁止计算器。",
        "rulesSummaryEn": "25 multiple-choice questions, 40 minutes, one point correct; no calculator.",
    }
    questions = []
    for n in range(1, 26):
        url = f"/local-assets/maa-amc/archive-amc8/2026-us-internal/q{n:02}.png"
        questions.append({
            "id": f"maa-amc8-2026-us-q{n:02}", "year": 2026, "level": "AMC 8",
            "grades": "Grade 8 and below", "language": "zh/en",
            "questionNo": n, "points": 1, "answerMode": "choice", "concept": "official_original",
            "stem": zh[str(n)], "stemEn": "Original English wording, options and diagrams are shown in the source image below.",
            "choices": [{"key": k, "label": f"参见原卷的 {k} 选项"} for k in "ABCDE"],
            "choicesEn": [{"key": k, "label": f"Choice {k} in the original source image"} for k in "ABCDE"],
            "answer": keys[n - 1], "solution": "参考答案：" + keys[n - 1] + "；详细解法待校对。",
            "sourceFile": str(SRC), "assetUrl": url, "assetUrlEn": url,
            "assetUrlZh": url, "studentAssetUrl": url, "studentAssetUrlEn": url,
            "studentAssetUrlZh": url, "verified": False, "examReady": False,
            "review": {
                "translationStatus": "machine-draft-human-review-required",
                "independentMathAnswerVerified": True,
                "independentMathProofMethod": math_checks[n]["method"],
                "visualStatus": "source-pdf-pixels-cropped-mathematical-visual-review-pending",
                "verified": False, "visualVerified": False, "needsReview": True,
                "notes": "Do not mark ready or issue paid license before Q-by-Q verification.",
            },
            "sourceMeta": {
                "sourcePdfSha256": ENGLISH_SHA, "sourcePdfPage": crops[n - 1]["sourcePdfPage"],
                "sourcePngSha256": crops[n - 1]["pngSha256"],
                "answerKeySha256": REFERENCE_ANSWER_SHA256, "edition": "US",
                "translationStatus": "draft", "internalOnly": True,
            },
        })
    return {"profile": profile, "questions": questions,
            "internalAudit": {"sourcePdfSha256": ENGLISH_SHA,
                              "answerKeySha256": REFERENCE_ANSWER_SHA256, "questionCrops": crops,
                              "readyForPaidRelease": False,
                              "originalityComparedIndependently": False,
                              "rightsVerified": False,
                              "mathAnswersIndependentlyVerified": 25,
                              "translationFullyReviewed": False}}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-local-draft", action="store_true")
    args = parser.parse_args()
    translations = preflight()
    positions = original_positions()
    key = answers()
    checks = verified_math_results(key)
    if not args.write_local_draft:
        print("AMC8_2026_PREFLIGHT_PASS questions=25 answers=25 independent_math=25 pages=2..8")
        return
    crops = original_crops(positions, ASSETS)
    bundle = make_bundle(translations, key, crops, checks)
    BUNDLE.parent.mkdir(parents=True, exist_ok=True)
    BUNDLE.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("AMC8_2026_INTERNAL_DRAFT_READY: 25 English source crops + 25 Chinese drafts + 25 reference answers")
    print("BUNDLE", BUNDLE)
    print("ORIGINAL_PIXEL_ASSETS", ASSETS)
    print("MARKETPLACE_READY=false / rightsVerified=false / translationReviewed=false")


if __name__ == "__main__":
    main()
