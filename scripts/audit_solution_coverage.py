#!/usr/bin/env python3
import argparse
import glob
import hashlib
import json
import os
import re
from collections import Counter

ANSWER_ONLY = re.compile(r"^(官方答案|official answer)\s*[:：/]", re.I)
IMAGE_ONLY = re.compile(r"(请查看下方官方原题图|see.*official.*problem)", re.I)

def classify_solution(value):
    text = " ".join((value or "").split())
    if not text:
        return "missing"
    if ANSWER_ONLY.search(text) or len(text) < 18:
        return "answer_only"
    return "reasoning"

def source_hash(q):
    payload = json.dumps({
        "stem": q.get("stem"),
        "answer": q.get("answer"),
        "asset": q.get("assetUrl") or q.get("assetUrlZh"),
        "solution": q.get("solution"),
    }, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:16]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="private/exams")
    ap.add_argument("--queue-out", default="")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    stats = Counter()
    queue = []
    for path in sorted(glob.glob(os.path.join(args.root, "*.json"))):
        try:
            bundle = json.load(open(path, encoding="utf-8"))
        except Exception:
            stats["broken_exam_files"] += 1
            continue
        exam_id = bundle.get("profile", {}).get("id") or os.path.basename(path).removesuffix(".json")
        for q in bundle.get("questions", []):
            stats["questions"] += 1
            state = classify_solution(q.get("solution"))
            stats[f"solution_{state}"] += 1
            asset = q.get("assetUrlZh") or q.get("assetUrl") or q.get("studentAssetUrlZh") or q.get("studentAssetUrl")
            if asset:
                stats["with_asset"] += 1
            needs_vision = bool(asset and IMAGE_ONLY.search(q.get("stem") or ""))
            if needs_vision:
                stats["vision_required"] += 1

            if state != "reasoning":
                queue.append({
                    "questionId": q.get("id"),
                    "examId": exam_id,
                    "questionNo": q.get("questionNo"),
                    "concept": q.get("concept"),
                    "officialAnswer": q.get("answer"),
                    "assetUrl": asset,
                    "requiresVision": needs_vision,
                    "solutionState": state,
                    "sourceHash": source_hash(q),
                })
                stats["queued"] += 1
                if args.limit and len(queue) >= args.limit:
                    break
        if args.limit and len(queue) >= args.limit:
            break

    print(json.dumps(stats, ensure_ascii=False, indent=2))
    if args.queue_out:
        os.makedirs(os.path.dirname(args.queue_out) or ".", exist_ok=True)
        with open(args.queue_out, "w", encoding="utf-8") as fh:
            json.dump({"version": 1, "stats": stats, "tasks": queue}, fh, ensure_ascii=False, indent=2)
        print(f"QUEUE={args.queue_out} tasks={len(queue)}")

if __name__ == "__main__":
    main()
