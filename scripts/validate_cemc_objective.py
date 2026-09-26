#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMS = ROOT / "private" / "exams"
SUMMARY = ROOT / "private" / "source-registry" / "cemc_objective_import_summary.json"


def fail(msg: str):
    raise SystemExit(f"CEMC_OBJECTIVE=FAIL {msg}")


def bilingual_ready(q: dict) -> bool:
    loc = q.get('localized') or {}
    review = q.get('review') or {}
    return bool(
        (loc.get('zh') or {}).get('stem')
        and (loc.get('en') or {}).get('stem')
        and q.get('examReady') is True
        and review.get('translationStatus') == 'reviewed'
        and review.get('visualVerified') is True
        and review.get('needsReview') is not True
    )


def main():
    files = sorted(EXAMS.glob("cemc-*.json"))
    if len(files) != 49:
        fail(f"expected 49 objective papers, found {len(files)}")

    questions = 0
    ready_papers = 0
    ready_questions = 0
    by_comp = Counter()
    ids = set()
    for path in files:
        data = json.loads(path.read_text())
        p = data.get("profile") or {}
        qs = data.get("questions") or []
        if p.get("competitionId") != "cemc":
            fail(f"{path.name}: competitionId")
        if p.get("questionCount") != 25 or len(qs) != 25:
            fail(f"{path.name}: expected 25 questions")
        if p.get("maxScore") != 150 or p.get("durationSeconds") != 3600:
            fail(f"{path.name}: official format mismatch")
        if p.get("rightsPolicy", {}).get("license") != "CC BY-NC 4.0":
            fail(f"{path.name}: missing license")
        if p.get("studentReady") is True:
            if p.get("rightsPolicy", {}).get("publicQuestionDisplay") is not True:
                fail(f"{path.name}: ready paper lacks public-display rights")
            ready_papers += 1
        elif p.get("studentReady") is not False:
            fail(f"{path.name}: studentReady must be explicit boolean")
        comp = qs[0].get("level") if qs else ""
        by_comp[comp] += 1
        questions += len(qs)

        for i, q in enumerate(qs, 1):
            if q.get("questionNo") != i:
                fail(f"{path.name}: question numbering")
            if q.get("id") in ids:
                fail(f"duplicate question id {q.get('id')}")
            ids.add(q.get("id"))
            if q.get("verified") is not True:
                fail(f"{q.get('id')}: source not verified")
            if p.get("studentReady") is True:
                if not bilingual_ready(q):
                    fail(f"{q.get('id')}: ready paper contains non-ready question")
                ready_questions += 1
            else:
                if q.get("examReady") is not False:
                    fail(f"{q.get('id')}: source-only paper must await localization")
            meta = q.get("sourceMeta") or {}
            crop = (meta.get("crop") or {}).get("cropFile")
            if not crop or not Path(crop).exists():
                fail(f"{q.get('id')}: crop missing")
            if meta.get("license") != "CC BY-NC 4.0":
                fail(f"{q.get('id')}: license missing")
            mode = q.get("answerMode")
            ans = str(q.get("answer", ""))
            if mode == "choice" and ans not in "ABCDE":
                fail(f"{q.get('id')}: invalid choice answer {ans}")
            if mode == "integer" and (not ans.isdigit() or not 0 <= int(ans) <= 99):
                fail(f"{q.get('id')}: invalid integer answer {ans}")

    if questions != 1225:
        fail(f"expected 1225 questions, found {questions}")
    expected = {"Gauss": 20, "Pascal": 9, "Cayley": 10, "Fermat": 10}
    if dict(by_comp) != expected:
        fail(f"paper distribution {dict(by_comp)}")

    summary = json.loads(SUMMARY.read_text())
    if summary.get("examCount") != 49 or summary.get("questionCount") != 1225:
        fail("summary mismatch")
    print(f"CEMC_OBJECTIVE=PASS papers={len(files)} questions={questions} ready_papers={ready_papers} ready_questions={ready_questions} by_comp={dict(by_comp)}")


if __name__ == "__main__":
    main()
