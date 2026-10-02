#!/usr/bin/env python3
import argparse, glob, json, os, re
from pathlib import Path

def valid_stem(s: str) -> bool:
    if not isinstance(s, str):
        return False
    t = " ".join(s.split())
    if len(t) < 45:
        return False
    if re.fullmatch(r"AMC\s+(8|10|12)(\s+[AB])?\s*·?\s*Question\s+\d+", t, re.I):
        return False
    if t.upper().startswith("AMC ") and "QUESTION " in t.upper() and "?" not in t and len(t) < 100:
        return False
    return True

def bucket(q):
    text = " ".join(str(q.get(k, "")) for k in ("concept", "stemEn", "stem")).lower()
    if any(x in text for x in ["gcd", "lcm", "divis", "prime", "remainder", "integer", "digit"]):
        return "number_theory"
    if any(x in text for x in ["probab", "chance", "random", "coloring", "arrang", "choose", "ways"]):
        return "combinatorics"
    if any(x in text for x in ["triangle", "circle", "rectangle", "angle", "area", "perimeter", "geometry"]):
        return "geometry"
    return "algebra"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--out", default="pilot/manifest.jsonl")
    a = ap.parse_args()
    rows = []
    for f in sorted(glob.glob("../../private/exams/maa-amc*.json")):
        try:
            data = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        for q in data.get("questions", []):
            stem = q.get("stemEn") or q.get("stem") or ""
            if not valid_stem(stem):
                continue
            rows.append({
                "problem_id": q.get("id"),
                "source_file": os.path.relpath(f, "../.."),
                "competition": q.get("level"),
                "year": q.get("year"),
                "question_no": q.get("questionNo"),
                "domain": bucket(q),
                "stem": stem,
                "answer": q.get("answer"),
                "status": "pending",
            })
    order = {"algebra": 0, "number_theory": 1, "combinatorics": 2, "geometry": 3}
    rows.sort(key=lambda r: (order.get(r["domain"], 9), str(r["source_file"]), str(r["problem_id"])))
    quotas = {"algebra": 40, "number_theory": 25, "combinatorics": 20, "geometry": 15}
    picked = []
    for dom, n in quotas.items():
        picked += [r for r in rows if r["domain"] == dom][:n]
    if len(picked) < a.limit:
        used = {r["problem_id"] for r in picked}
        picked += [r for r in rows if r["problem_id"] not in used][:a.limit - len(picked)]
    picked = picked[:a.limit]
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as fh:
        for r in picked:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    counts = {d: sum(r["domain"] == d for r in picked) for d in quotas}
    print(json.dumps({"eligible": len(rows), "selected": len(picked), "domains": counts, "out": str(out)}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
