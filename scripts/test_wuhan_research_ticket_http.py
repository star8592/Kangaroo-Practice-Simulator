"""Synthetic, local HTTP acceptance; fixture-owned parent data only."""
import concurrent.futures,hashlib,hmac,json,os,time,urllib.request,urllib.error
from pathlib import Path
origin=os.environ["WUHAN_TICKET_TEST_ORIGIN"]
assert origin.startswith("http://127.0.0.1:")
key=bytes.fromhex(os.environ["SOCTHINK_RESEARCH_TICKET_KEY"])
owner,other=(os.environ["WUHAN_TICKET_"+x+"_ID"] for x in ("OWNER","OTHER"))
a,b=(os.environ["WUHAN_TICKET_"+x+"_SESSION"] for x in ("OWNER","OTHER"))
parents=Path(os.environ["SOCTHINK_USER_DATA_DIR"])/"parents.json"
assert parents.parent.name=="users" and parents.parent.parent.name.startswith("socthink-rust-voucher-api.")
def req(path,body=b"",headers=None):
    q=urllib.request.Request(origin+path,data=body,method="POST",headers=headers or {})
    try:r=urllib.request.urlopen(q,timeout=10)
    except urllib.error.HTTPError as e:r=e
    with r:
        assert "no-store" in r.headers.get("Cache-Control","")
        return r.status,json.load(r)
def issue(p="WH01",token=a,body=b"",source="http://localhost:3000"):
    h={"Origin":source,"Sec-Fetch-Site":"same-origin"}
    if token:h["Cookie"]="socthink_parent_session="+token
    return req("/api/platform/research/wuhan/tickets/"+p,body,h)
def claim(t,p="WH01",bad=False,extra=None,body=None):
    raw=body or json.dumps({"ticket":t,"paper_id":p},separators=(",",":")).encode()
    sig=hmac.new(key,b"wuhan-research-ticket-v1\0"+raw,hashlib.sha256).hexdigest()
    return req("/internal/research/wuhan/claim-ticket",raw,{"Content-Type":"application/json","x-research-ticket-signature":"0"*64 if bad else sig,**(extra or {})})
assert issue(token=None)[0]==401
assert issue(source="https://foreign.example")[0]==403
assert issue("WH99")[0]==400
assert issue(body=json.dumps({"owner_id":other}).encode())[0]==400
status,t=issue();assert status==200 and t["billable"] is False and 0<t["expires_in"]<=120
assert len(t["ticket"])==64 and len(t["attempt_id"])==32 and "owner_id" not in t
assert claim(t["ticket"],"WH02")[0]==404
assert claim(t["ticket"],bad=True)[0]==401
assert claim(t["ticket"],extra={"Cookie":"not-allowed"})[0]==403
assert claim(t["ticket"],body=json.dumps({"ticket":t["ticket"],"paper_id":"WH01","owner_id":other}).encode())[0]==400
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(lambda _:claim(t["ticket"]),range(2)))
assert sorted(x[0] for x in results)==[200,404]
r=next(x[1] for x in results if x[0]==200)
assert r=={"attempt_id":t["attempt_id"],"owner_id":owner,"paper_id":"WH01","billable":False}
assert claim(t["ticket"])[0]==404
status,t=issue("WH10",b);assert status==200
assert claim(t["ticket"],"WH10")[1]["owner_id"]==other
status,t=issue();assert status==200
old=parents.read_bytes()
try:
    rows=json.loads(old)
    next(p for p in rows if p["id"]==owner)["sessionVersion"]=2
    parents.write_text(json.dumps(rows))
    assert claim(t["ticket"])[0]==404
    assert issue()[0]==401
finally:parents.write_bytes(old)
import base64
def b64(x):return base64.urlsafe_b64encode(x).rstrip(b"=")
secret=(parents.parent/"parent-session-secret.txt").read_text().strip().encode()
body=b64(json.dumps({"uid":other,"ver":1,"exp":int(time.time())+4},separators=(",",":")).encode())
short=(body+b"."+b64(hmac.new(secret,body,hashlib.sha256).digest())).decode()
status,t=issue(token=short);assert status==200 and t["expires_in"]<=4
time.sleep(4.1)
assert claim(t["ticket"])[0]==404
for _ in range(3):assert issue()[0]==200
assert issue()[0]==429
print("WUHAN_RESEARCH_TICKET_HTTP_PASS auth; same-origin; no owner injection; signed claim; paper scope; concurrent one-use; session version; expiry; pending cap")
