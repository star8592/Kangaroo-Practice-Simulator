#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"public"/"grade1-narration"/"v1"
bundle=json.loads((ROOT/"data/verified-solutions/grade1-v1.json").read_text())
manifest=json.loads((BASE/"manifest.json").read_text())
solutions=bundle.get("solutions") or {}
entries=manifest.get("entries") or []
errors=[]
expected_scenes=sum(len((s or {}).get("scenes") or []) for s in solutions.values())
if manifest.get("questionCount")!=len(solutions): errors.append(f"questionCount={manifest.get('questionCount')} expected={len(solutions)}")
if manifest.get("sceneCount")!=expected_scenes: errors.append(f"sceneCount={manifest.get('sceneCount')} expected={expected_scenes}")
if len(entries)!=expected_scenes: errors.append(f"entries={len(entries)} expected={expected_scenes}")
seen={}
for e in entries:
 qid=e.get("questionId"); scene=e.get("scene"); seen[(qid,scene)]=seen.get((qid,scene),0)+1
 p=ROOT/"public"/str(e.get("url") or "").lstrip("/")
 if qid not in solutions: errors.append(f"unknown qid {qid}")
 if not p.exists(): errors.append(f"missing {p}")
 elif p.stat().st_size<8000: errors.append(f"too-small {p} {p.stat().st_size}")
 if len(str(e.get("mp3Sha256") or ""))!=64: errors.append(f"bad sha {qid} {scene}")
 elif p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()!=e["mp3Sha256"]: errors.append(f"sha mismatch {qid} {scene}")
for qid,s in solutions.items():
 for idx,_ in enumerate(s.get("scenes") or [],1):
  k=(qid,f"scene-{idx:02d}")
  if seen.get(k)!=1: errors.append(f"{qid}: {k[1]} count={seen.get(k,0)}")
if errors:
 print("GRADE1_NARRATION_BUNDLE=FAIL")
 for e in errors[:80]: print(e)
 raise SystemExit(1)
total=sum((ROOT/"public"/e["url"].lstrip("/")).stat().st_size for e in entries)
print(f"GRADE1_NARRATION_BUNDLE=PASS questions={len(solutions)} scenes={len(entries)} bytes={total}")
