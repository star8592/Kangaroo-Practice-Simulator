#!/usr/bin/env python3
"""Compare two independent OCR runs on identical locally held source media.

Never silently choose a winner or overwrite its source. Produces a private
human-review queue for symbols, numerical differences and possible omissions.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from collections import Counter
from evaluate_ocr_engines import math_canonical_text, digits, edit_distance


def read_run(path: Path) -> tuple[dict, dict]:
    path=path.expanduser().resolve(strict=True)
    manifest=json.loads((path/"manifest.json").read_text(encoding="utf8"))
    by_key={}
    for item in manifest["items"]:
        if item.get("ocrStatus") != "transcribed_needs_review":
            continue
        name=item.get("ocrTextFile")
        if not name:
            raise ValueError("Missing transcript pointer")
        textpath=(path/name).resolve(strict=True)
        if not textpath.is_relative_to(path):
            raise ValueError("Unsafe OCR transcript path")
        raw=textpath.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=item.get("transcriptSha256"):
            raise ValueError("Changed or corrupt OCR transcription: "+item["id"])
        by_key[item["id"]]={"sha256":item["sha256"],"text":raw.decode("utf8"),
                              "timeSeconds":item["timeSeconds"]}
    return manifest,by_key


def compare(a_path: Path, b_path: Path) -> dict:
    a,asrc=read_run(a_path)
    b,bsrc=read_run(b_path)
    if a["inputSha256"]!=b["inputSha256"]:
        raise ValueError("Cannot compare OCR runs of different originals")
    if a.get("ocrBackend")==b.get("ocrBackend"):
        raise ValueError("Must use different OCR engines")
    questions_a=json.loads((a_path/"question-candidates.json").read_text(encoding="utf8"))
    questions_b=json.loads((b_path/"question-candidates.json").read_text(encoding="utf8"))
    count_a=Counter(x["sourceItemId"] for x in questions_a["questions"])
    count_b=Counter(x["sourceItemId"] for x in questions_b["questions"])
    output=[]
    common=sorted(set(asrc)&set(bsrc))
    for item_id in sorted(set(asrc)|set(bsrc)):
        x,y=asrc.get(item_id),bsrc.get(item_id)
        if not x or not y:
            output.append({
                "itemId":item_id,"status":"missing_engine_result",
                "priority":"high","requiresSourceImageReview":True,
            })
            continue
        if x["sha256"]!=y["sha256"]:
            raise ValueError(f"Source frame differs across models: {item_id}")
        cx=math_canonical_text(x["text"])
        cy=math_canonical_text(y["text"])
        edits=edit_distance(cx,cy)
        numeric_match=(digits(cx)==digits(cy))
        qa,qb=count_a[item_id],count_b[item_id]
        priority=("high" if (not numeric_match or qa != qb) else
                  "medium" if edits else "none")
        output.append({
            "itemId":item_id, "sourceEvidenceSha256":x["sha256"],
            "videoTimeSeconds":x["timeSeconds"],
            "canonicalEditDistance":edits,
            "numericSequenceEqual":numeric_match,
            "questionCountByEngine":{a["ocrBackend"]:qa,b["ocrBackend"]:qb},
            "questionCountEqual":qa==qb,
            "needsManualReview":priority!="none",
            "priority":priority,
            "acceptedTranscript":None,
            "status":"candidate_conflict" if priority!="none" else "normalized_agreement",
        })
    return {
        "schemaVersion":1,
        "inputSha256":a["inputSha256"],
        "sourcePlatform":a.get("sourcePlatform"),
        "engines":[a["ocrBackend"],b["ocrBackend"]],
        "comparedItemCount":len(common),
        "highPriorityCount":sum(x["priority"]=="high" for x in output),
        "mediumPriorityCount":sum(x["priority"]=="medium" for x in output),
        "items":output,
        "reviewStatus":"awaiting_evidence_comparison",
        "commercialRedistributionAllowed":False,
        "warning":"Disagreement is not proof of which engine is right. Compare source image before accepting an answer.",
    }


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("first",type=Path,help="first OCR asset directory (manifest.json)")
    ap.add_argument("second",type=Path,help="second OCR asset directory")
    ap.add_argument("--out",type=Path,required=True)
    args=ap.parse_args()
    data=compare(args.first,args.second)
    dest=args.out.expanduser().resolve()
    if not any(x in dest.parts for x in ("private","tmp")):
        raise ValueError("Review manifests must stay private")
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    dest.chmod(0o600)
    print(json.dumps({"compared":data["comparedItemCount"],"high":data["highPriorityCount"],
                     "medium":data["mediumPriorityCount"],"saved":str(dest)},ensure_ascii=False))

if __name__=="__main__":
    main()
