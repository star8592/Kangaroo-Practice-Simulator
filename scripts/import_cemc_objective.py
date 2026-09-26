#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "private" / "source-archive" / "cemc" / "manifest.json"
EXAMS = ROOT / "private" / "exams"
CROPS = ROOT / "private" / "source-digitization" / "cemc" / "question-crops"
SUMMARY = ROOT / "private" / "source-registry" / "cemc_objective_import_summary.json"
DPI = 170
SCALE = DPI / 72.0
CHOICES = [{"key": k, "label": k} for k in "ABCDE"]

COMP_META = {
    "Gauss": {
        "format": lambda grade: f"cemc-gauss-{grade}",
        "nameZh": lambda year, grade: f"{year} CEMC Gauss · {grade}年级",
        "nameEn": lambda year, grade: f"{year} CEMC Gauss · Grade {grade}",
        "grades": lambda grade: f"Grade {grade}",
        "gradeBand": lambda grade: "7-8",
    },
    "Pascal": {
        "format": lambda grade: "cemc-pascal",
        "nameZh": lambda year, grade: f"{year} CEMC Pascal · 9年级",
        "nameEn": lambda year, grade: f"{year} CEMC Pascal · Grade 9",
        "grades": lambda grade: "Grade 9",
        "gradeBand": lambda grade: "9-10",
    },
    "Cayley": {
        "format": lambda grade: "cemc-cayley",
        "nameZh": lambda year, grade: f"{year} CEMC Cayley · 10年级",
        "nameEn": lambda year, grade: f"{year} CEMC Cayley · Grade 10",
        "grades": lambda grade: "Grade 10",
        "gradeBand": lambda grade: "9-10",
    },
    "Fermat": {
        "format": lambda grade: "cemc-fermat",
        "nameZh": lambda year, grade: f"{year} CEMC Fermat · 11年级",
        "nameEn": lambda year, grade: f"{year} CEMC Fermat · Grade 11",
        "grades": lambda grade: "Grade 11",
        "gradeBand": lambda grade: "11+",
    },
}


def clean_xml(raw: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", raw)


def question_sequence(pdf: Path, count: int = 25):
    raw = subprocess.check_output(
        ["pdftotext", "-bbox-layout", str(pdf), "-"],
        text=True,
        errors="ignore",
    )
    root = ET.fromstring(clean_xml(raw))
    ns = {"x": "http://www.w3.org/1999/xhtml"}
    occ = {q: [] for q in range(1, count + 1)}
    page_sizes = {}

    for page_no, page in enumerate(root.findall(".//x:page", ns), 1):
        page_sizes[page_no] = (
            float(page.attrib.get("width", "612")),
            float(page.attrib.get("height", "792")),
        )
        for word in page.findall(".//x:word", ns):
            token = (word.text or "").strip()
            m = re.fullmatch(r"(\d{1,2})\.", token)
            if not m:
                continue
            q = int(m.group(1))
            x = float(word.attrib["xMin"])
            y = float(word.attrib["yMin"])
            if 1 <= q <= count and x < 150:
                occ[q].append((page_no, y, x))

    candidates = []
    for first in occ[1]:
        # Page 1 contains contest instructions numbered 1., 2., ...
        if first[0] < 2:
            continue
        seq = [first]
        prev = (first[0], first[1])
        ok = True
        for q in range(2, count + 1):
            possible = [x for x in occ[q] if (x[0], x[1]) > prev]
            if not possible:
                ok = False
                break
            nxt = min(possible, key=lambda x: (x[0], x[1]))
            seq.append(nxt)
            prev = (nxt[0], nxt[1])
        if ok:
            candidates.append(seq)

    if not candidates:
        raise RuntimeError(f"{pdf}: cannot locate ordered Q1..Q{count}")

    seq = min(
        candidates,
        key=lambda x: (x[-1][0] - x[0][0], x[0][0], x[0][1]),
    )
    if len(seq) != count:
        raise RuntimeError(f"{pdf}: question sequence length {len(seq)}")
    return seq, page_sizes


def render_and_crop(pdf: Path, seq, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    first_page = min(x[0] for x in seq)
    last_page = max(x[0] for x in seq)
    crop_meta = []

    with tempfile.TemporaryDirectory(prefix="cemc-crop-") as td:
        prefix = Path(td) / "page"
        subprocess.run(
            [
                "pdftoppm",
                "-png",
                "-r",
                str(DPI),
                "-f",
                str(first_page),
                "-l",
                str(last_page),
                str(pdf),
                str(prefix),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        rendered = sorted(Path(td).glob("page-*.png"))
        pages = {first_page + i: p for i, p in enumerate(rendered)}
        cache = {}

        for i, (page_no, y, x) in enumerate(seq):
            im = cache.setdefault(page_no, Image.open(pages[page_no]).convert("RGB"))
            width, height = im.size
            top = max(0, int((y - 10) * SCALE))
            if i + 1 < len(seq) and seq[i + 1][0] == page_no:
                bottom = int((seq[i + 1][1] - 5) * SCALE)
            else:
                bottom = height - int(28 * SCALE)
            bottom = max(top + 55, min(height, bottom))
            left = int(28 * SCALE)
            right = width - int(24 * SCALE)
            crop_path = out_dir / f"q{i + 1:02}.png"
            im.crop((left, top, right, bottom)).save(crop_path, optimize=True)
            crop_meta.append(
                {
                    "questionNo": i + 1,
                    "page": page_no,
                    "pdfX": x,
                    "pdfY": y,
                    "pixelBox": [left, top, right, bottom],
                    "cropFile": str(crop_path),
                }
            )
    return crop_meta


def ordered_answers(text: str):
    found = []
    pat = re.compile(r"Answer:\s*(?:\(([A-E])\)|(\d{1,3})\b)")
    for m in pat.finditer(text):
        found.append(m.group(1) or m.group(2))
    return found


def parse_answers(record):
    solution = Path(record["solutionFile"]["path"])
    text = subprocess.check_output(
        ["pdftotext", "-layout", str(solution), "-"],
        text=True,
        errors="ignore",
    )
    comp = record["competition"]
    year = int(record["year"])

    if comp == "Gauss":
        grade = str(record["grade"])
        if "Grade 7" not in text or "Grade 8" not in text:
            raise RuntimeError(f"{solution}: missing Grade 7/8 headings")
        if grade == "7":
            section = text.split("Grade 7", 1)[1].split("Grade 8", 1)[0]
        elif grade == "8":
            section = text.split("Grade 8", 1)[1]
        else:
            raise RuntimeError(f"{solution}: unexpected Gauss grade {grade}")
        vals = re.findall(r"Answer:\s*\(([A-E])\)", section)
        if len(vals) != 25:
            raise RuntimeError(f"{solution}: Grade {grade} answer coverage {len(vals)}/25")
        return vals

    vals = ordered_answers(text)
    if len(vals) != 25:
        raise RuntimeError(f"{solution}: answer coverage {len(vals)}/25")

    # 2021 Pascal Q25 had a corrected numeric result ("Answer: 22") while
    # the original paper still presents A-E choices; 22 corresponds to E.
    if comp == "Pascal" and year == 2021 and vals[24] == "22":
        vals[24] = "E"

    if year <= 2021:
        if any(v not in "ABCDE" for v in vals):
            raise RuntimeError(f"{solution}: expected 25 choice answers for {comp} {year}: {vals}")
    else:
        if any(v not in "ABCDE" for v in vals[:20]):
            raise RuntimeError(f"{solution}: Q1-20 must be choice answers")
        if any(not v.isdigit() or not 0 <= int(v) <= 99 for v in vals[20:]):
            raise RuntimeError(f"{solution}: Q21-25 must be 0-99 integer answers")
    return vals


def points_for(q: int) -> int:
    if q <= 10:
        return 5
    if q <= 20:
        return 6
    return 8


def exam_id(record):
    comp = record["competition"].lower()
    year = int(record["year"])
    if comp == "gauss":
        return f"cemc-gauss-{year}-grade-{record['grade']}"
    return f"cemc-{comp}-{year}"


def build_bundle(record):
    comp = record["competition"]
    if comp not in COMP_META:
        return None

    year = int(record["year"])
    grade = str(record["grade"])
    eid = exam_id(record)
    contest = Path(record["contestFile"]["path"])
    answers = parse_answers(record)
    seq, _ = question_sequence(contest)
    crops = render_and_crop(contest, seq, CROPS / eid)
    meta = COMP_META[comp]
    format_id = meta["format"](grade)

    questions = []
    for q in range(1, 26):
        answer_mode = "choice"
        if comp != "Gauss" and year >= 2022 and q >= 21:
            answer_mode = "integer"
        answer = answers[q - 1]
        if answer_mode == "choice" and answer not in "ABCDE":
            raise RuntimeError(f"{eid} Q{q}: invalid choice answer {answer}")
        if answer_mode == "integer" and not answer.isdigit():
            raise RuntimeError(f"{eid} Q{q}: invalid integer answer {answer}")

        questions.append(
            {
                "id": f"{eid}-q{q:02}",
                "year": year,
                "level": comp,
                "grades": meta["grades"](grade),
                "language": "en",
                "questionNo": q,
                "points": points_for(q),
                "answerMode": answer_mode,
                "concept": "official_original",
                "stem": f"{comp} {year} · original question {q}",
                "choices": CHOICES if answer_mode == "choice" else [],
                "answer": answer,
                "solution": f"Official answer: {answer}",
                "sourceFile": str(contest),
                "verified": True,
                "examReady": False,
                "sourceMeta": {
                    "sourceRegistryId": "cemc-official",
                    "sourcePage": record["sourcePage"],
                    "contestUrl": record["contestUrl"],
                    "solutionUrl": record["solutionUrl"],
                    "license": "CC BY-NC 4.0",
                    "attribution": "University of Waterloo Centre for Education in Mathematics and Computing (CEMC)",
                    "contestSha256": record["contestFile"]["sha256"],
                    "solutionSha256": record["solutionFile"]["sha256"],
                    "crop": crops[q - 1],
                    "canonicalSource": {
                        "status": "SOURCE_VERIFIED",
                        "manifest": "cemc-official-pdf-v1",
                        "verificationMethod": "official_pdf_sha256_plus_question_sequence_and_frozen_crop",
                        "sourceSha256": record["contestFile"]["sha256"],
                        "sourceLanguage": "en",
                        "page": crops[q - 1]["page"],
                        "pageSpan": None,
                        "crop": [round(v / SCALE, 3) for v in crops[q - 1]["pixelBox"]],
                    },
                },
                "review": {
                    "translationStatus": "source-verified",
                    "visualStatus": "source-crop",
                    "verified": True,
                    "visualVerified": True,
                    "needsReview": True,
                    "notes": "Official English source digitized without OCR; Chinese localization required before student delivery.",
                },
            }
        )

    rules_zh = (
        "25题，60分钟；1–10题每题5分，11–20题每题6分，21–25题每题8分；答错不倒扣。"
    )
    rules_en = (
        "25 questions in 60 minutes; Q1–10 are worth 5 points each, "
        "Q11–20 6 points each, Q21–25 8 points each; no penalty for incorrect answers."
    )
    if comp != "Gauss" and year >= 2022:
        rules_zh += " 1–20题为选择题，21–25题为0–99整数填答。"
        rules_en += " Q1–20 are multiple choice and Q21–25 use integer answers from 0 to 99."

    profile = {
        "id": eid,
        "name": meta["nameEn"](year, grade),
        "nameZh": meta["nameZh"](year, grade),
        "nameEn": meta["nameEn"](year, grade),
        "grades": meta["grades"](grade),
        "gradesZh": meta["grades"](grade),
        "gradesEn": meta["grades"](grade),
        "durationSeconds": 3600,
        "questionCount": 25,
        "initialScore": 0,
        "maxScore": 150,
        "wrongPenaltyMode": "fixed",
        "wrongPenaltyValue": 0,
        "blankScoreValue": 0,
        "country": "Canada CEMC",
        "year": year,
        "language": "en",
        "sourceLabel": "University of Waterloo CEMC · official past contest · CC BY-NC 4.0",
        "sourceLabelZh": "加拿大滑铁卢大学 CEMC · 官方历年竞赛 · CC BY-NC 4.0",
        "sourceLabelEn": "University of Waterloo CEMC · official past contest · CC BY-NC 4.0",
        "studentReady": False,
        "competitionId": "cemc",
        "formatId": format_id,
        "paperType": "past",
        "gradeBand": meta["gradeBand"](grade),
        "timingMode": "official",
        "formatLabelZh": f"CEMC · {comp}",
        "formatLabelEn": f"CEMC · {comp}",
        "rulesSummaryZh": rules_zh,
        "rulesSummaryEn": rules_en,
        "sourceRegistryId": "cemc-official",
        "rightsPolicy": {
            "rightsClass": "open-noncommercial",
            "license": "CC BY-NC 4.0",
            "publicQuestionDisplay": True,
            "commercialUse": False,
            "attributionRequired": True,
        },
    }
    return {"profile": profile, "questions": questions}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="Rebuild even already-reviewed student-ready bundles")
    args = ap.parse_args()
    data = json.loads(MANIFEST.read_text())
    records = [
        r
        for r in data.get("records", [])
        if r.get("competition") in COMP_META
    ]
    records.sort(key=lambda r: (r["competition"], r["year"], r["grade"]))
    EXAMS.mkdir(parents=True, exist_ok=True)

    imported = []
    total_questions = 0
    student_ready_papers = 0
    for record in records:
        eid = exam_id(record)
        path = EXAMS / f"{eid}.json"
        if path.exists() and not args.force:
            try:
                existing = json.loads(path.read_text())
            except Exception:
                existing = {}
            if (existing.get("profile") or {}).get("studentReady") is True:
                qs = existing.get("questions") or []
                total_questions += len(qs)
                student_ready_papers += 1
                imported.append({
                    "examId": eid,
                    "competition": record["competition"],
                    "year": record["year"],
                    "grade": record["grade"],
                    "questions": len(qs),
                    "formatId": (existing.get("profile") or {}).get("formatId"),
                    "studentReady": True,
                    "status": "preserved-reviewed",
                })
                print(f"PRESERVED {eid} student-ready")
                continue
        bundle = build_bundle(record)
        eid = bundle["profile"]["id"]
        path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n")
        total_questions += len(bundle["questions"])
        imported.append(
            {
                "examId": eid,
                "competition": record["competition"],
                "year": record["year"],
                "grade": record["grade"],
                "questions": len(bundle["questions"]),
                "formatId": bundle["profile"]["formatId"],
                "studentReady": False,
            }
        )
        print(f"IMPORTED {eid} questions=25 source-only")

    summary = {
        "generatedAt": "2026-09-25",
        "sourceRegistryId": "cemc-official",
        "examCount": len(imported),
        "questionCount": total_questions,
        "studentReady": student_ready_papers,
        "status": "mixed-reviewed-and-source-digitized" if student_ready_papers else "source-digitized-awaiting-bilingual-localization",
        "exams": imported,
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(
        f"CEMC_OBJECTIVE_IMPORT_OK exams={len(imported)} "
        f"questions={total_questions} student_ready={student_ready_papers}"
    )


if __name__ == "__main__":
    main()
