#!/usr/bin/env python3
import json,glob
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
EXAM=ROOT/"private/exams/kangaroo-grade1-2-official-samples-2006-2026.json"
d=json.loads(EXAM.read_text());qs=d["questions"]
assert len(qs)==63
assert all(q.get("stem","").strip() and q.get("stemEn","").strip() for q in qs)
assert all(q.get("answer") in "ABCDE" for q in qs)
assert all((ROOT/"public"/q["assetUrl"].lstrip("/")).exists() for q in qs)

verified={}
known={"SOURCE","COUNTERS","TENFRAME","NUMBERLINE","BAR","POINT","SEGMENT","CIRCLE","POLYGON","ANGLE","TEXT","EQUATION","DICEPAIR","NET","CUBENET","CUBE","MOVE","ROTATE","MORPH","FOLD","REMOVE","HIDE","SHOW","HIGHLIGHT","IMAGE","SPOT","TRACE","PICK","CUBEFACES","FLIPCARD","CHASE","STEPS"}
unknown=[]
for p in glob.glob(str(ROOT/"private/solutions/mk-g12-*.json")):
    s=json.loads(Path(p).read_text())
    if s.get("quality")!="verified":continue
    qid=s["questionId"];verified[qid]=s
    q=next(x for x in qs if x["id"]==qid)
    v=s["verification"]
    assert v["officialAnswerMatched"] is True
    assert v["derivedAnswer"]==q["answer"]==v["officialAnswer"],qid
    assert float(v["confidence"])>=0.9
    assert 2<=len(s["scenes"])<=12
    for scene in s["scenes"]:
        assert str(scene.get("narration") or "").strip()
        for line in (scene.get("renderSpec") or {}).get("script") or []:
            parts=line.split()
            if parts and parts[0] not in known:unknown.append((qid,parts[0],line))
assert not unknown,unknown
assert len(verified)>=15,len(verified)
audio=sum(bool((s.get("materialization") or {}).get("audioReady")) for s in verified.values())
print(f"KANGAROO_GRADE1_2_PROGRESS=PASS bank=63 bilingual=63 verified={len(verified)} audio_ready={audio} unknown_dsl=0 studentReady={d['profile']['studentReady']}")
