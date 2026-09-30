#!/usr/bin/env python3
import json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BUNDLE=ROOT/"data"/"verified-solutions"/"grade1-v1.json"
b=json.loads(BUNDLE.read_text())
errors=[]
sol=b.get("solutions") or {}
expected_exams={
  "au-amc-pre-a-sample-1":25,
  "au-amc-pre-a-sample-2":25,
  "kangaroo-grade1-2-official-samples-2006-2026":63,
}
if b.get("version")!=1: errors.append("bundle version must be 1")
if b.get("scope")!="gradeBand:1-2": errors.append("bundle scope mismatch")
if b.get("examQuestionCounts")!=expected_exams: errors.append(f"exam coverage mismatch {b.get('examQuestionCounts')}")
if b.get("questionCount")!=113 or len(sol)!=113: errors.append(f"questionCount bundle={b.get('questionCount')} solutions={len(sol)}")
if sum(k.startswith("au-amc-pre-a-s1-q") for k in sol)!=25: errors.append("Pre-A sample 1 coverage != 25")
if sum(k.startswith("au-amc-pre-a-s2-q") for k in sol)!=25: errors.append("Pre-A sample 2 coverage != 25")
if sum(k.startswith("mk-g12-") for k in sol)!=63: errors.append("Kangaroo G1-2 coverage != 63")
for qid,s in sol.items():
    v=s.get("verification") or {}; scenes=s.get("scenes") or []
    if s.get("version")!=1 or s.get("quality")!="verified": errors.append(f"{qid}: bad quality/version")
    if v.get("officialAnswerMatched") is not True or v.get("solverAgreement") is not True: errors.append(f"{qid}: verification flags")
    if float(v.get("confidence") or 0)<0.65: errors.append(f"{qid}: confidence")
    if not str(v.get("derivedAnswer") or "").strip(): errors.append(f"{qid}: missing derived answer")
    if not 2<=len(scenes)<=12: errors.append(f"{qid}: scenes={len(scenes)}")
    for scene in scenes:
        if not str(scene.get("id") or "").strip() or not str(scene.get("title") or "").strip() or not str(scene.get("narration") or "").strip(): errors.append(f"{qid}: incomplete scene")
        if not isinstance(scene.get("visual"),dict) or not str(scene["visual"].get("type") or "").strip(): errors.append(f"{qid}: invalid visual")
if errors:
    print("GRADE1_SOLUTION_BUNDLE=FAIL")
    for e in errors[:80]: print(e)
    raise SystemExit(1)
print(f"GRADE1_SOLUTION_BUNDLE=PASS exams={len(expected_exams)} questions={len(sol)}")
