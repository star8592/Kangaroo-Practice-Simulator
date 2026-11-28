"""Actual localhost Rust + PG18 strict archive HTTP test with synthetic accounts."""
import hashlib,hmac,json,os,secrets,urllib.request,urllib.error
from pathlib import Path
origin=os.environ["WUHAN_TICKET_TEST_ORIGIN"]
assert origin.startswith("http://127.0.0.1:")
owner,other=(os.environ["WUHAN_TICKET_"+x+"_ID"] for x in ("OWNER","OTHER"))
session=os.environ["WUHAN_TICKET_OWNER_SESSION"]
contract=json.loads((Path(__file__).resolve().parents[1]/"backend/socthink-core/src/wuhan-research-report-contract.json").read_text())
def call(path,body=None,headers=None):
    req=urllib.request.Request(origin+path,data=body,headers=headers or {})
    try:r=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as e:r=e
    with r:
        assert "no-store" in r.headers.get("Cache-Control","")
        return r.status,json.load(r)
def signed(path,data,key,domain,header):
    b=json.dumps(data,separators=(",",":")).encode()
    sig=hmac.new(bytes.fromhex(os.environ[key]),domain+b,hashlib.sha256).hexdigest()
    return call(path,b,{"Content-Type":"application/json",header:sig})
def archive(report,account=owner):
    return signed("/internal/research/wuhan/archive",{"owner_id":account,"report":report},
        "SOCTHINK_RESEARCH_ARCHIVE_KEY",b"wuhan-research-archive-v1\0","x-research-signature")
def report(aid,paper):
    tasks=next(p["tasks"] for p in contract["papers"] if p["paperId"]==paper)
    return {"attempt_id":aid,"paper_id":paper,"finalized":True,"billable":False,"official_score":False,
        "report_status":"research","total_score":None,"total_tasks":18,"submitted":0,
        "choice_correct":0,"choice_incorrect":0,"choice_unsubmitted":8,
        "items":[{"task_id":t["taskId"],"kind":t["kind"],"state":"not_submitted","candidate":None} for t in tasks],
        "rubric_sha256":contract["rubricSha256"],"report_evidence_sha256":secrets.token_hex(32)}
def read(aid):
    return call("/api/platform/research/wuhan/reports/"+aid,headers={"Cookie":"socthink_parent_session="+session})
assert archive(report(secrets.token_hex(16),"WH01"))[0]==409
status,t=call("/api/platform/research/wuhan/tickets/WH01",b"",{"Origin":"http://localhost:3000","Sec-Fetch-Site":"same-origin","Cookie":"socthink_parent_session="+session})
assert status==200
r=report(t["attempt_id"],"WH01")
assert archive(r)[0]==409
status,c=signed("/internal/research/wuhan/claim-ticket",{"ticket":t["ticket"],"paper_id":"WH01"},"SOCTHINK_RESEARCH_TICKET_KEY",b"wuhan-research-ticket-v1\0","x-research-ticket-signature")
assert status==200 and c["attempt_id"]==r["attempt_id"]
assert archive(r,other)[0]==409
assert archive(report(r["attempt_id"],"WH02"))[0]==409
assert read(r["attempt_id"])[0]==404
assert archive(r)[1]["code"]=="archived"
assert archive(r)[1]["code"]=="already_archived"
assert read(r["attempt_id"])==(200,r)
print("WUHAN_STRICT_ARCHIVE_REAL_HTTP_PASS unissued; unclaimed; cross-account; wrong-paper; claimed archive; idempotent; owner read")
