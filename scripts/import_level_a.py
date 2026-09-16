#!/usr/bin/env python3
import argparse, json
from pathlib import Path

ap = argparse.ArgumentParser(description="Build a local Level A mock exam bank from the Math Kangaroo archive")
ap.add_argument("--corpus-root", type=Path, required=True)
ap.add_argument("--output", type=Path, default=Path("private/question-bank.json"))
a = ap.parse_args()
source = a.corpus_root / "99_Metadata" / "sample_questions.jsonl"
rows = [json.loads(line) for line in source.open(encoding="utf-8")]
zh = [r for r in rows if r.get("level") == "A" and r.get("language") == "zh"]
en = {(r.get("year"), r.get("question_no")): r for r in rows if r.get("level") == "A" and r.get("language") == "en"}
selected = []
for points in (3, 4, 5):
    candidates = sorted((r for r in zh if r.get("points") == points), key=lambda r: (r.get("year", 0), r.get("question_no", 0)), reverse=True)
    selected.extend(candidates[:8])
selected.sort(key=lambda r: (r["points"], -r["year"], r["question_no"]))

def choices(raw):
    vals = json.loads(raw) if isinstance(raw, str) else raw
    out = []
    for i, v in enumerate(vals or []):
        key = chr(ord("A") + i)
        label = str(v)
        if label.startswith(key + ")"): label = label[2:].strip()
        out.append({"key": key, "label": label})
    return out

bank = []
for idx, r in enumerate(selected, 1):
    e = en.get((r["year"], r["question_no"]))
    bank.append({
        "id": f"A-{r['year']}-{r['question_no']}-{idx}",
        "year": r["year"], "level": "A", "grades": "1-2", "language": "zh",
        "questionNo": idx, "points": int(r["points"]), "concept": r.get("concept", ""),
        "stem": r.get("question", ""), "stemEn": e.get("question", "") if e else "",
        "choices": choices(r.get("options_json", "[]")), "choicesEn": choices(e.get("options_json", "[]")) if e else [],
        "answer": r.get("answer", ""), "solution": r.get("solution", ""),
        "sourceFile": r.get("source_file", ""), "verified": False,
    })
a.output.parent.mkdir(parents=True, exist_ok=True)
a.output.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {len(bank)} questions -> {a.output}")
print("distribution", {p: sum(q["points"] == p for q in bank) for p in (3,4,5)})
