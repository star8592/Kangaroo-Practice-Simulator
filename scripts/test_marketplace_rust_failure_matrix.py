#!/usr/bin/env python3
"""Adversarial HTTP QA against the loopback Rust market-claim handler.
No real orders, no main site, no network outside localhost.
"""
import base64, hashlib, hmac, http.cookiejar, json, os, pathlib
import signal, subprocess, tempfile, time, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT=pathlib.Path(__file__).resolve().parents[1]
PORT=18843
URL=f"http://127.0.0.1:{PORT}"
EXAM="maa-amc8-2024-user-owned"
SECRET="local_rust_http_qa_only_not_a_real_production_key_20261118"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None

def ticket(job, **patch):
    data={"v":1,"job":job,"sku":"EDU-001","kind":"EXAM_REPORT_ONCE","examId":EXAM,
          "exp":int(time.time())+300}
    data.update(patch)
    encoded=base64.urlsafe_b64encode(json.dumps(data,separators=(",",":")).encode()).rstrip(b"=").decode()
    sig=hmac.new(SECRET.encode(),encoded.encode(),hashlib.sha256).hexdigest()
    return encoded+"."+sig

def post(value, origin=URL, cookie="", extra=None):
    headers={"Content-Type":"application/x-www-form-urlencoded"}
    if origin is not None:headers["Origin"]=origin
    if cookie:headers["Cookie"]=cookie
    if extra:headers.update(extra)
    data=urllib.parse.urlencode({"ticket":value}).encode()
    req=urllib.request.Request(URL+"/api/marketplace/claim",method="POST",
                               headers=headers,data=data)
    opener=urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(req,timeout=16) as response:
            return response.status,response.headers, response.read()
    except urllib.error.HTTPError as ex:
        return ex.code,ex.headers,ex.read()

def main():
    binary=ROOT/"backend/socthink-core/target/debug/socthink-catalog-api"
    assert binary.is_file(),"Build Rust binary before QA"
    with tempfile.TemporaryDirectory(prefix="socthink-rust-matrix-") as t:
        base=pathlib.Path(t)
        env=os.environ.copy()
        env.update({"SOCTHINK_CATALOG_SNAPSHOT":str(ROOT/"backend/socthink-core/tests/fixtures/catalog.json"),
            "SOCTHINK_RUST_BIND":f"127.0.0.1:{PORT}",
            "SOCTHINK_MARKETPLACE_EXAM_MODE":"1",
            "SOCTHINK_MARKETPLACE_HANDOFF_SECRET":SECRET,
            "SOCTHINK_MARKETPLACE_AMC8_EXAM_ID":EXAM,
            "SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN":URL,
            "SOCTHINK_MARKETPLACE_DATA_DIR":str(base/"claims"),
            "SOCTHINK_USER_DATA_DIR":str(base/"users")})
        counter=0
        def check(label,condition):
            nonlocal counter
            assert condition,label
            counter+=1
            print("PASS",label,flush=True)
        def spawn():
            log=open(base/"rust.log","a")
            proc=subprocess.Popen([str(binary)],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            for _ in range(50):
                try:
                    with urllib.request.urlopen(URL+"/healthz",timeout=1) as r:
                        if r.status==200:return proc,log
                except OSError:time.sleep(.1)
            raise RuntimeError("Rust not ready: "+(base/"rust.log").read_text()[-1600:])
        def stop(proc,log):
            try:os.killpg(proc.pid,signal.SIGTERM)
            except ProcessLookupError:pass
            proc.wait(timeout=8);log.close()
        rust,log=spawn()
        try:
            code,headers,_=post(ticket("job_owner001"))
            check("first claim redirects",code==303)
            cookie=headers.get("Set-Cookie","").split(";",1)[0]
            check("HttpOnly cookie",bool(cookie) and "HttpOnly" in headers.get("Set-Cookie",""))
            code,_,_=post(ticket("job_owner001"))
            check("second browser rejected",code==409)
            code,_,_=post(ticket("job_owner001"),cookie=cookie)
            check("original browser recovers",code==303)
            tests=[
              ("expired ticket",ticket("job_expired001",exp=int(time.time())-1),400),
              ("wrong SKU",ticket("job_sku001",sku="EDU-999"),400),
              ("wrong exam",ticket("job_exam001",examId="unknown"),400),
              ("wrong service",ticket("job_kind001",kind="UNLIMITED"),400),
              ("unsupported version",ticket("job_ver001",v=2),400),
              ("far-future expiry",ticket("job_future001",exp=int(time.time())+90000),400),
              ("unsafe job ID",ticket("../escape_01"),400),
            ]
            for label,proof,want in tests:
                code,_,_=post(proof)
                check(label,code==want)
            code,_,_=post(ticket("job_noorigin01"),origin=None)
            check("missing Origin denied",code==403)
            code,_,_=post(ticket("job_badorg001"),origin="https://other.example")
            check("foreign Origin denied",code==403)
            code,_,_=post(ticket("job_xsite001"),extra={"Sec-Fetch-Site":"cross-site"})
            check("cross-site request denied",code==403)
            actual=ticket("job_tampered001")
            bad=actual[:-1]+("0" if actual[-1]!="0" else "1")
            code,_,_=post(bad)
            check("HMAC forgery denied",code==400)
            code,_,_=post("x"*2600)
            check("oversized form rejected",code==413)
            codes=[]
            def parallel(_):
                return post(ticket("job_concurrent001"))[0]
            with ThreadPoolExecutor(max_workers=12) as pool:
                codes=list(pool.map(parallel,range(12)))
            check("12 competing first claims only one succeeds",codes.count(303)==1 and codes.count(409)==11)
            grant_dir=base/"claims"/"grants"
            files=list(grant_dir.glob("*.json"))
            check("grant files are private",len(files)>=2 and all((x.stat().st_mode & 0o077)==0 for x in files))
            key=hashlib.sha256(("job_corrupt001|EDU-001|"+EXAM).encode()).hexdigest()
            corrupt=grant_dir/(key+".json")
            corrupt.write_text("{corrupt json")
            code,_,_=post(ticket("job_corrupt001"))
            check("corrupted grant fails closed",code==503)
            corrupt.unlink()
            grant_dir.chmod(0o500)
            try:
                code,_,_=post(ticket("job_storagefail001"))
                check("unwritable grant directory does not issue entitlement",code==503)
            finally:
                grant_dir.chmod(0o700)
            with urllib.request.urlopen(URL+"/v1/catalog/resources?limit=1",timeout=8) as response:
                check("existing Rust catalogue remains available",response.status==200)
            stop(rust,log)
            rust,log=spawn()
            code,_,_=post(ticket("job_owner001"),cookie=cookie)
            check("restart preserves original buyer entitlement",code==303)
            code,_,_=post(ticket("job_owner001"))
            check("restart does not allow claim theft",code==409)
            print(f"RUST_FAULT_MATRIX={counter}/{counter} PASS",flush=True)
        finally:
            stop(rust,log)

if __name__=="__main__":
    main()
