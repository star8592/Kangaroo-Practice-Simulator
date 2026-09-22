#!/usr/bin/env python3
"""Apply Stage-1 SOURCE_VERIFIED records to private exam bundles.

This changes only the canonical source layer (stem/choices/sourceMeta provenance).
It never changes localized text, translation review flags, examReady, answers, or
student delivery gates.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

MANIFESTS = [
    "verified-official-html.json",
    "verified-official-html-visual.json",
    "verified-official-pdf.json",
    "verified-official-pdf-manual.json",
    "verified-portugal-pdf-region.json",
    "verified-germany-pdf-region.json",
    "verified-austria-pdf-region.json",
    "verified-austria-legacy-pdf.json",
    "verified-maa-pdf.json",
    "verified-portugal-dual-pdf.json",
    "verified-source-ensemble-v2.json",
]

CHOICE_MARKER = re.compile(r"(?<!\w)\(?([ABCDE])\)\s*")


def load_verified(root: Path):
    rows = {}
    for name in MANIFESTS:
        p = root / "private/source-digitization" / name
        if not p.exists():
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        for row in data.get("questions", []):
            if row.get("verificationStatus") != "SOURCE_VERIFIED":
                continue
            key = (row.get("examId"), int(row.get("questionNo")))
            rows[key] = (name, row)
    return rows


def strip_question_no(text: str, qno: int) -> str:
    s = (text or "").strip()
    return re.sub(rf"^\s*0*{qno}\s*[.\)\-:]\s*", "", s, count=1).strip()


def is_generic_choices(choices):
    return bool(
        len(choices or []) == 5
        and all(str(c.get("label", "")).strip() == str(c.get("key", "")).strip() for c in choices)
    )


def split_inline_choices(text: str):
    marks = list(CHOICE_MARKER.finditer(text))
    if [m.group(1) for m in marks] != list("ABCDE"):
        return None
    stem = text[: marks[0].start()].strip()
    choices = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        label = text[m.end() : end].strip()
        choices.append({"key": "ABCDE"[i], "label": label})
    if not stem or any(not c["label"] for c in choices):
        return None
    return stem, choices


def canonical_source(row: dict):
    qno = int(row["questionNo"])
    text = strip_question_no(str(row.get("sourceText") or ""), qno)
    choices = row.get("choices") or []

    inline = split_inline_choices(text)
    if inline and (not choices or is_generic_choices(choices)):
        text, choices = inline
    elif inline:
        text = inline[0]

    if len(choices) != 5 or is_generic_choices(choices):
        # Generic visual choices may be intentionally image-bound. Keep the
        # bundle's existing choices rather than inventing labels.
        usable_choices = None
    else:
        usable_choices = [
            {"key": str(c.get("key", "")).strip(), "label": str(c.get("label", "")).strip()}
            for c in choices
        ]
        if [c["key"] for c in usable_choices] != list("ABCDE") or any(not c["label"] for c in usable_choices):
            usable_choices = None

    return text, usable_choices


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--exam-id")
    ap.add_argument("--report", type=Path)
    args = ap.parse_args()
    root = args.root.resolve()

    verified = load_verified(root)
    exams_dir = root / "private/exams"
    changed_files = []
    changed_questions = 0
    skipped_missing_bundle = 0
    skipped_missing_question = 0
    no_content_change = 0
    report_rows = []

    by_exam = {}
    for (exam_id, qno), value in verified.items():
        if args.exam_id and exam_id != args.exam_id:
            continue
        by_exam.setdefault(exam_id, {})[qno] = value

    for exam_id, rows in sorted(by_exam.items()):
        path = exams_dir / f"{exam_id}.json"
        if not path.exists():
            skipped_missing_bundle += len(rows)
            for qno in rows:
                report_rows.append({"examId": exam_id, "questionNo": qno, "status": "BUNDLE_MISSING"})
            continue

        bundle = json.loads(path.read_text(encoding="utf-8"))
        questions = {
            int(q["questionNo"]): q
            for q in bundle.get("questions", [])
            if isinstance(q, dict) and "questionNo" in q
        }
        file_changed = False

        for qno, (manifest_name, row) in sorted(rows.items()):
            q = questions.get(qno)
            if not q:
                skipped_missing_question += 1
                report_rows.append({"examId": exam_id, "questionNo": qno, "status": "QUESTION_MISSING"})
                continue

            stem, choices = canonical_source(row)
            if not stem:
                report_rows.append({"examId": exam_id, "questionNo": qno, "status": "EMPTY_CANONICAL"})
                continue

            before_stem = q.get("stem")
            before_choices = q.get("choices")
            q["stem"] = stem
            if choices is not None:
                q["choices"] = choices

            meta = q.get("sourceMeta")
            if not isinstance(meta, dict):
                meta = {}
            meta["canonicalSource"] = {
                "status": "SOURCE_VERIFIED",
                "manifest": manifest_name,
                "verificationMethod": row.get("verificationMethod"),
                "sourceSha256": row.get("sourceSha256"),
                "sourceLanguage": row.get("sourceLanguage"),
                "page": row.get("page"),
                "pageSpan": row.get("pageSpan"),
                "crop": row.get("crop"),
            }
            q["sourceMeta"] = meta

            content_changed = before_stem != q["stem"] or before_choices != q.get("choices")
            if content_changed:
                changed_questions += 1
                file_changed = True
                status = "CONTENT_UPDATED"
            else:
                no_content_change += 1
                # Provenance may still be newly attached.
                file_changed = True
                status = "PROVENANCE_UPDATED"

            report_rows.append({
                "examId": exam_id,
                "questionNo": qno,
                "status": status,
                "manifest": manifest_name,
                "choicesUpdated": choices is not None,
            })

        if file_changed:
            changed_files.append(str(path.relative_to(root)))
            if args.apply:
                path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = {
        "mode": "apply" if args.apply else "dry-run",
        "verifiedRecords": len(verified),
        "targetExams": len(by_exam),
        "changedFiles": changed_files,
        "changedFileCount": len(changed_files),
        "changedQuestions": changed_questions,
        "provenanceOnly": no_content_change,
        "skippedMissingBundle": skipped_missing_bundle,
        "skippedMissingQuestion": skipped_missing_question,
        "questions": report_rows,
    }
    report_path = args.report or (root / "private/source-digitization/source-promotion-report.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in (
        "mode", "verifiedRecords", "targetExams", "changedFileCount",
        "changedQuestions", "provenanceOnly", "skippedMissingBundle", "skippedMissingQuestion",
    )}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
