#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"public"/"grade1-narration"/"v1"
manifest=json.loads((BASE/"manifest.json").read_text())
entries=manifest.get("entries") or []
errors=[]
if manifest.get("questionCount")!=50: errors.append(f"questionCount={manifest.get('questionCount')}")
if manifest.get("sceneCount")!=150: errors.append(f"sceneCount={manifest.get('sceneCount')}")
if len(entries)!=150: errors.append(f"entries={len(entries)}")
qids={}
for e in entries:
    qid=e.get("questionId")
    qids.setdefault(qid,0); qids[qid]+=1
    p=ROOT/"public"/e["url"].lstrip("/")
    if not p.exists(): errors.append(f"missing {p}")
    elif p.stat().st_size<8000: errors.append(f"too-small {p} {p.stat().st_size}")
    if not str(e.get("mp3Sha256","")) or len(e["mp3Sha256"])!=64: errors.append(f"bad sha {qid} {e.get('scene')}")
for qid,count in qids.items():
    if count!=3: errors.append(f"{qid}: scenes={count}")
if len(qids)!=50: errors.append(f"qids={len(qids)}")
if errors:
    print("GRADE1_NARRATION_BUNDLE=FAIL")
    for e in errors[:50]: print(e)
    raise SystemExit(1)
total=sum((ROOT/"public"/e["url"].lstrip("/")).stat().st_size for e in entries)
print(f"GRADE1_NARRATION_BUNDLE=PASS questions={len(qids)} scenes={len(entries)} bytes={total}")
