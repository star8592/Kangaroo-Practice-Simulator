#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOL=ROOT/"private/solutions"

total=0
for sample in (1,2):
    exam=ROOT/f"private/exams/au-amc-pre-a-sample-{sample}.json"
    data=json.loads(exam.read_text())
    qs=data.get("questions") or []
    assert len(qs)==25, (sample,len(qs))
    assert data.get("profile",{}).get("studentReady") is True
    for i,q in enumerate(qs,1):
        total+=1
        assert q.get("questionNo")==i
        zh=str(q.get("stem") or "").strip()
        en=str(q.get("stemEn") or "").strip()
        assert zh and "请根据官方 AMC Pre-A 样题图" not in zh, q["id"]
        assert en and "using the official AMC Pre-A question image" not in en, q["id"]
        for k in ("assetUrlZh","assetUrlEn"):
            url=q.get(k)
            assert url and url.startswith("/"), (q["id"],k)
            assert (ROOT/"public"/url.lstrip("/")).exists(), (q["id"],url)
        expected_mode="choice" if i<=20 else "integer"
        assert q.get("answerMode")==expected_mode, (q["id"],q.get("answerMode"),expected_mode)
        sp=SOL/f"{q['id']}.json"
        assert sp.exists(), q["id"]
        s=json.loads(sp.read_text())
        v=s.get("verification") or {}
        assert s.get("quality")=="verified"
        assert v.get("officialAnswerMatched") is True
        assert v.get("solverAgreement") is True
        assert float(v.get("confidence",0))>=0.65
        assert str(v.get("derivedAnswer"))==str(q.get("answer")), (q["id"],v.get("derivedAnswer"),q.get("answer"))
        scenes=s.get("scenes") or []
        assert 2<=len(scenes)<=12
        assert all(str(x.get("narration") or "").strip() for x in scenes)

# Two independently checked regression answers.
s2=json.loads((ROOT/"private/exams/au-amc-pre-a-sample-2.json").read_text())
assert s2["questions"][9]["answer"]=="E", "Sample 2 Q10 triple-overlap answer must be E=4"
assert s2["questions"][18]["answer"]=="A", "Sample 2 Q19 square-opposite face must be circle=A"
assert "A、B、C、D、E、F" in json.loads((ROOT/"private/exams/au-amc-pre-a-sample-1.json").read_text())["questions"][19]["stem"]
assert all(x in s2["questions"][18]["stem"] for x in ("♣","♦","♥","♠","□","○"))
assert all(x in s2["questions"][18]["stemEn"] for x in ("♣","♦","♥","♠","□","○"))

print(f"PRE_A_GRADE1_READY=PASS questions={total} verified={total} assets={total*2}")
