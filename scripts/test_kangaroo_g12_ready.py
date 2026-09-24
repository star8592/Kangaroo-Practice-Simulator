#!/usr/bin/env python3
import json, os
from pathlib import Path

ROOT=Path(os.environ.get("KPS_ROOT") or Path(__file__).resolve().parents[1])
EXAM=ROOT/"private/exams/kangaroo-grade1-2-official-samples-2006-2026.json"
SOL=ROOT/"private/solutions"
PUB=ROOT/"public"
GEN=PUB/"generated-solutions"

assert EXAM.exists(), EXAM
exam=json.loads(EXAM.read_text())
questions=exam.get("questions") or []
assert len(questions)==63, f"expected 63 questions, got {len(questions)}"

expected_ids=[]
for year in range(2006,2027):
    for points in (3,4,5):
        expected_ids.append(f"mk-g12-{year}-{points}pt")
actual_ids=[q.get("id") for q in questions]
assert actual_ids==expected_ids, "question ids/order do not match 2006-2026 x 3/4/5pt"

verified=assets=audio_scenes=v2=manifests=0
for q in questions:
    qid=q["id"]
    answer=str(q.get("answer") or "").strip()
    assert answer in {"A","B","C","D","E"}, (qid,answer)
    assert str(q.get("stem") or "").strip(), f"{qid}: empty stem"

    asset=q.get("assetUrlZh") or q.get("assetUrl") or q.get("studentAssetUrlZh")
    assert asset and asset.startswith("/local-assets/kangaroo/grade-1-2/samples/"), (qid,asset)
    ap=PUB/asset.lstrip("/")
    assert ap.exists() and ap.stat().st_size>1000, f"{qid}: missing/bad asset {ap}"
    assets+=1

    sp=SOL/f"{qid}.json"
    assert sp.exists(), f"{qid}: solution missing"
    s=json.loads(sp.read_text())
    assert s.get("questionId")==qid
    assert s.get("quality")=="verified", f"{qid}: not verified"
    ver=s.get("verification") or {}
    assert ver.get("officialAnswerMatched") is True, f"{qid}: officialAnswerMatched"
    assert ver.get("solverAgreement") is True, f"{qid}: solverAgreement"
    assert isinstance(ver.get("confidence"),(int,float)) and ver["confidence"]>=0.65, f"{qid}: confidence"
    assert str(ver.get("officialAnswer"))==answer, (qid,ver.get("officialAnswer"),answer)
    assert str(ver.get("derivedAnswer"))==answer, (qid,ver.get("derivedAnswer"),answer)
    verified+=1

    assert int(s.get("solutionStandardVersion") or 0)>=2, f"{qid}: not V2"
    mat=s.get("materialization") or {}
    assert mat.get("audioReady") is True, f"{qid}: audio not ready"
    assert mat.get("voiceProfile")=="warm-teacher-v1", f"{qid}: voice profile"
    assert mat.get("playbackProfile")=="continuous-auto-v1", f"{qid}: playback profile"
    assert mat.get("visualReasoningRequired") is True, f"{qid}: visual reasoning flag"
    v2+=1

    scenes=s.get("scenes") or []
    assert len(scenes)==3, f"{qid}: expected 3 scenes, got {len(scenes)}"
    for scene in scenes:
        assert str(scene.get("narration") or "").strip(), f"{qid}: empty narration"
        vis=scene.get("visual") or {}
        spec=scene.get("renderSpec") or {}
        assert vis.get("type")=="source-image" or bool(spec.get("script")), f"{qid}: undirectable scene"
        url=scene.get("audioUrl")
        assert url and url.startswith(f"/generated-solutions/{qid}/"), f"{qid}: bad audio url"
        wav=PUB/url.lstrip("/")
        assert wav.exists() and wav.stat().st_size>1000, f"{qid}: missing audio {wav}"
        assert isinstance(scene.get("audioDurationMs"),(int,float)) and scene["audioDurationMs"]>500, f"{qid}: bad audio duration"
        audio_scenes+=1

    mp=GEN/qid/"manifest.json"
    assert mp.exists(), f"{qid}: manifest missing"
    m=json.loads(mp.read_text())
    assert m.get("questionId")==qid
    assert int(m.get("solutionStandardVersion") or 0)>=2, f"{qid}: manifest not V2"
    assert m.get("voiceProfile")=="warm-teacher-v1"
    assert m.get("playbackProfile")=="continuous-auto-v1"
    assert m.get("visualReasoningRequired") is True
    assert len(m.get("scenes") or [])==3
    manifests+=1

assert verified==63
assert assets==63
assert audio_scenes==189
assert v2==63
assert manifests==63
print(f"KANGAROO_G12_READY=PASS questions=63 verified={verified} assets={assets} audio_scenes={audio_scenes} v2={v2} manifests={manifests}")
