#!/usr/bin/env python3
"""Build deterministic review/escalation queues from Source Extraction Ensemble v2."""
import argparse
import glob
import json
from collections import Counter
from pathlib import Path

HARD = {
    "formula_sensitive": 10,
    "visual_sensitive": 20,
    "question_or_choices_not_structured": 30,
    "no_ocr_native_text_consensus": 40,
}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1])
    args=ap.parse_args(); root=args.root.resolve()

    verdict_path=root/"private/source-digitization/verified-source-ensemble-v2.json"
    verdict=json.loads(verdict_path.read_text()) if verdict_path.exists() else {"questions":[],"rejected":[]}
    rejected={(x["examId"],x["questionNo"]):x["reason"] for x in verdict.get("rejected",[])}

    rows=[]
    for fn in glob.glob(str(root/"private/source-extraction-v2/*/q*/manifest.json")):
        d=json.loads(Path(fn).read_text())
        key=(d.get("examId"),d.get("questionNo"))
        reason=rejected.get(key)
        if not reason:
            continue
        engines=d.get("engines",{})
        consensus=d.get("consensus",{})
        rows.append({
            "examId":key[0],
            "questionNo":key[1],
            "priority":HARD.get(reason,50),
            "reason":reason,
            "consensus":consensus.get("status"),
            "engines":{
                name:{
                    "status":e.get("status"),
                    "meanScore":e.get("meanScore"),
                    "comparisonFields":e.get("comparisonFields"),
                }
                for name,e in engines.items()
            },
            "sourceFile":d.get("sourceFile"),
            "sourceSha256":d.get("sourceSha256"),
            "page":d.get("page"),
            "crop":d.get("crop"),
            "evidence":d.get("evidence"),
            "manifest":str(Path(fn).relative_to(root)),
        })

    rows.sort(key=lambda x:(x["priority"],x["examId"],x["questionNo"]))
    out=root/"private/source-digitization/source-ensemble-review-queue.json"
    out.write_text(json.dumps({
        "summary":{
            "questions":len(rows),
            "reasons":dict(Counter(x["reason"] for x in rows)),
            "consensus":dict(Counter(x["consensus"] for x in rows)),
        },
        "questions":rows,
    },ensure_ascii=False,indent=2))
    print(json.dumps({
        "questions":len(rows),
        "reasons":dict(Counter(x["reason"] for x in rows)),
        "output":str(out),
    },ensure_ascii=False))

if __name__=="__main__":
    main()
