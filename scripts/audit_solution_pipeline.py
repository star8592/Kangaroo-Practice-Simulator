#!/usr/bin/env python3
import argparse, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOL=ROOT/"private/solutions"
PUB=ROOT/"public"

def scene_directable(s):
    spec=s.get("renderSpec") or {}
    script=spec.get("script") or []
    visual=s.get("visual") or {}
    return bool(script) or visual.get("type") in {"source-image","number-line","fraction-bar","solid3d"}

def audio_ok(qid,s):
    url=s.get("audioUrl")
    if not url or not url.startswith("/"): return False
    p=PUB/url.lstrip("/")
    return p.exists() and p.stat().st_size>1000

def video_ok(qid):
    p=PUB/"generated-solutions"/qid/f"{qid}.mp4"
    return p.exists() and p.stat().st_size>10000

rows=[]
for p in sorted(SOL.glob("*.json")):
    if p.name=="queue.json": continue
    try:d=json.loads(p.read_text())
    except Exception:
        rows.append({"questionId":p.stem,"stage":"INVALID_JSON"}); continue
    qid=d.get("questionId") or p.stem
    scenes=d.get("scenes") or []
    v=d.get("verification") or {}
    math_ok=(d.get("quality")=="verified" and v.get("officialAnswerMatched") is True and
             v.get("solverAgreement") is True and isinstance(v.get("confidence"),(int,float)) and
             v.get("confidence",0)>=0.65 and 2<=len(scenes)<=12)
    directed=sum(scene_directable(s) for s in scenes)
    interactive=bool(math_ok and scenes and directed==len(scenes))
    audio=bool(interactive and all(audio_ok(qid,s) for s in scenes))
    video=bool(audio and video_ok(qid))
    if video: stage="VIDEO_READY"
    elif audio: stage="VOICE_READY"
    elif interactive: stage="VERIFIED_DIRECTOR"
    elif math_ok: stage="VERIFIED_MATH"
    else: stage="NOT_VERIFIED"
    rows.append({"questionId":qid,"stage":stage,"scenes":len(scenes),"directedScenes":directed,
                 "audioScenes":sum(audio_ok(qid,s) for s in scenes),"video":video_ok(qid)})

from collections import Counter
counts=Counter(r["stage"] for r in rows)
payload={"total":len(rows),"counts":dict(sorted(counts.items())),"rows":rows}
ap=argparse.ArgumentParser()
ap.add_argument("--write",action="store_true")
ap.add_argument("--show",type=int,default=12)
args=ap.parse_args()
print("SOLUTION_PIPELINE_AUDIT",json.dumps(payload["counts"],ensure_ascii=False,sort_keys=True))
for r in rows[:max(0,args.show)]:
    print(r["stage"],r["questionId"],f'{r["directedScenes"]}/{r["scenes"]} directed',f'{r["audioScenes"]}/{r["scenes"]} audio',"video="+str(r["video"]).lower())
if args.write:
    out=SOL/"_meta"; out.mkdir(parents=True,exist_ok=True)
    (out/"pipeline-status.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
    print("WROTE",out/"pipeline-status.json")
