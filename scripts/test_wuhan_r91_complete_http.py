"""Isolated real model report -> signed completion API. Synthetic accounts only."""
import hashlib,hmac,json,os,secrets,urllib.request,urllib.error,copy
from pathlib import Path
base=os.environ["WUHAN_TICKET_TEST_ORIGIN"];assert base.startswith("http://127.0.0.1:")
owner=os.environ["WUHAN_TICKET_OWNER_ID"];session=os.environ["WUHAN_TICKET_OWNER_SESSION"]
other=os.environ["WUHAN_TICKET_OTHER_SESSION"];lease=os.environ["WUHAN_R91_LEASE"]
fixture=Path(os.environ["WUHAN_R91_FIXTURE_OUTPUT"]).resolve()
assert fixture.parent==Path("/tmp") and fixture.name.startswith("wuhan-r91-synthetic-")
report=json.loads(fixture.read_text());aid=report["attempt_id"]
manifest=os.environ["WUHAN_R91_MANIFEST"]
key=bytes.fromhex(os.environ["SOCTHINK_RESEARCH_ARCHIVE_KEY"])
def call(path,body=None,headers=None):
    req=urllib.request.Request(base+path,data=body,headers=headers or {})
    try:r=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as e:r=e
    with r:
        assert "no-store" in r.headers.get("Cache-Control","")
        return r.status,json.load(r)
def submit(data,sign=True,domain=b"wuhan-research-async-complete-v1\0"):
    b=json.dumps(data,separators=(",",":")).encode()
    headers={"Content-Type":"application/json"}
    if sign:headers["x-research-signature"]=hmac.new(key,domain+b,hashlib.sha256).hexdigest()
    return call("/internal/research/wuhan/complete-scoring",b,headers)
def read(token):
    return call("/api/platform/research/wuhan/reports/"+aid,headers={"Cookie":"socthink_parent_session="+token})
payload=dict(owner_id=owner,lease_id=lease,manifest_sha256=manifest,report=report)
assert read(session)[0]==202
assert read(other)[0]==404
assert submit(payload,False)[0]==401
assert submit(payload,domain=b"wuhan-research-archive-v1\0")[0]==401
assert submit(dict(payload,lease_id="00000000-0000-0000-0000-000000000000"))[0]==409
assert submit(dict(payload,manifest_sha256="f"*64))[0]==409
bad=copy.deepcopy(payload);bad["report"]["total_score"]=100
assert submit(bad)[0]==400
assert read(session)[0]==202
assert submit(payload)==(200,dict(code="completed",attempt_id=aid,billable=False))
assert read(session)==(200,report)
assert read(other)[0]==404
assert submit(payload)[0]==409
print("R91_REAL_REPORT_ATOMIC_HTTP_PASS")
