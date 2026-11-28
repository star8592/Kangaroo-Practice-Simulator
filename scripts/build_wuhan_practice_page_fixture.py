"""Generate disposable synthetic SSR fixture, not a scored report or model run."""
import json,secrets,sys
from pathlib import Path
dest=Path(sys.argv[1]).resolve()
assert dest.parent==Path("/tmp") and dest.name.startswith("wuhan-r72-synthetic-")
root=Path(__file__).resolve().parents[1]
contract=json.loads((root/"backend/socthink-core/src/wuhan-research-report-contract.json").read_text())
aid=secrets.token_hex(16);rev="a"*64
items=[];answer=0;read=0
for t in contract["papers"][0]["tasks"]:
    kind=t["kind"];task=t["taskId"]
    row={"task_id":task,"kind":kind,"state":"not_submitted","candidate":None}
    scope={"attempt_id":aid,"paper_id":"WH01","task_id":task,"audio_sha256":"c"*64}
    if kind=="answer":
        status=["reference_match","known_mismatch","unanswered","needs_review","not_submitted","reference_match","not_submitted"][answer]
        answer+=1
        if status!="not_submitted":
            p={"reference_match":{"earned":1,"possible":1,"basis":"automatic_content_match"},"known_mismatch":{"earned":0,"possible":1,"basis":"automatic_known_mismatch"},"unanswered":{"earned":0,"possible":1,"basis":"no_answer_audio"},"needs_review":None}[status]
            row.update(state=status,candidate={"scope":scope,"status":status,"official_score":False,"human_review_required":True,"reference_content_score":None,"machine_rule_revision":rev,"practice_content":p,"evidence_quote":"Synthetic fixture." if status!="unanswered" else None,"secondary_evidence_quote":"Fixture second transcript." if status=="reference_match" else None})
    elif kind=="read" and read==0:
        read+=1
        row.update(state="asr_disagreement",candidate={"scope":scope,"diagnosis":{"status":"asr_disagreement","primary_text":"This is a fixture.","secondary_text":"This is fixture.","primary_text_edits":[],"secondary_text_edits":[{"operation":"deletion","expected":"a","recognized":None}],"timing":{"duration_ms":2000,"speech_ms":1000},"pronunciation_score":None,"human_review_required":True,"official_score":False}})
    items.append(row)
assert answer==7 and len(items)==18
report={"attempt_id":aid,"paper_id":"WH01","finalized":True,"billable":False,"official_score":False,"report_status":"research","total_score":None,"total_tasks":18,"submitted":sum(x["candidate"] is not None for x in items),"choice_correct":0,"choice_incorrect":0,"choice_unsubmitted":8,"items":items,"rubric_sha256":contract["rubricSha256"],"report_evidence_sha256":"b"*64}
dest.write_text(json.dumps(report,ensure_ascii=False))
