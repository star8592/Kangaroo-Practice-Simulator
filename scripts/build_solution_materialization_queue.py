#!/usr/bin/env python3
import json
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
META=ROOT/"private/solutions/_meta"
STATUS=META/"pipeline-status.json"
ATT=ROOT/"private/users/exam-attempts.jsonl"
EXAMS=ROOT/"private/exams"

if not STATUS.exists():
    raise SystemExit("run npm run solution:audit first")
status=json.loads(STATUS.read_text())
stage={r["questionId"]:r["stage"] for r in status.get("rows",[])}

stats=defaultdict(lambda:{"attempts":0,"wrong":0,"blank":0,"correct":0,"dwellMs":0,"changes":0,"flags":0})
if ATT.exists():
    for line in ATT.read_text().splitlines():
        if not line.strip(): continue
        try:a=json.loads(line)
        except: continue
        for q in a.get("questions") or []:
            qid=q.get("questionId")
            if not qid: continue
            s=stats[qid]; s["attempts"]+=1
            if q.get("correct") is False:s["wrong"]+=1
            elif q.get("correct") is None:s["blank"]+=1
            else:s["correct"]+=1
            s["dwellMs"]+=max(0,q.get("dwellMs") or 0)
            s["changes"]+=max(0,q.get("answerChanges") or 0)
            s["flags"]+=max(0,q.get("flagCount") or 0)

meta={}
seen=set()
for p in EXAMS.glob("*.json"):
    if "before-bilingual" in p.name: continue
    try:b=json.loads(p.read_text())
    except: continue
    prof=b.get("profile") or {}
    for q in b.get("questions") or []:
        qid=q.get("id")
        if not qid or qid in seen: continue
        seen.add(qid)
        meta[qid]={
            "examId":prof.get("id"),"competitionId":prof.get("competitionId","unknown"),
            "formatId":prof.get("formatId",""),"year":prof.get("year"),
            "questionNo":q.get("questionNo",0),"concept":q.get("concept",""),
            "sourceAsset":q.get("studentAssetUrl") or q.get("assetUrlZh") or q.get("assetUrl"),
        }

rows=[]
for qid,stg in stage.items():
    if stg not in {"VERIFIED_DIRECTOR","VOICE_READY"}: continue
    s=stats[qid]; m=meta.get(qid,{})
    demand=s["wrong"]*100+s["blank"]*75+s["flags"]*20+s["changes"]*8+min(30,round(s["dwellMs"]/60000))
    tie=(15 if m.get("competitionId")=="maa-amc" else 0)+min(25,m.get("questionNo") or 0)+max(0,(m.get("year") or 2000)-2000)/10
    # Voice-ready items need only the cheap video pass, so finish them before starting a new TTS job at equal demand.
    finish_bonus=12 if stg=="VOICE_READY" else 0
    priority=round(demand+tie+finish_bonus,2)
    rows.append({"questionId":qid,"stage":stg,"priority":priority,"telemetry":dict(s),**m})

rows.sort(key=lambda r:(-r["priority"],r["questionId"]))
payload={
    "generatedAt":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    "policy":"Only already-verified director storyboards enter this local queue. Student demand ranks local TTS/video work; local software never generates mathematical reasoning.",
    "total":len(rows),"queue":rows,
}
META.mkdir(parents=True,exist_ok=True)
out=META/"materialization-queue.json"
out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
print("MATERIALIZATION_QUEUE=PASS total="+str(len(rows)))
for r in rows[:15]:
    t=r["telemetry"]
    print(r["priority"],r["stage"],r["questionId"],f"wrong={t['wrong']} blank={t['blank']} attempts={t['attempts']}")
print("WROTE",out)
