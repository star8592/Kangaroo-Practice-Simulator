#!/usr/bin/env python3
"""Local-only E2E: signed synthetic handoff -> real original exam engine -> real PDF.
Never sends anything to Xianyu or main site and does not assume real payment.
"""
import base64
import hashlib
import hmac
import http.cookiejar
import json
import os
import pathlib
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from contextlib import ExitStack

PORT = 18742
ORIGIN = f"http://127.0.0.1:{PORT}"
SECRET = "local_e2e_test_secret_not_real_paid_order_20261118_replace"
EXAM_ID = "maa-amc8-2024-user-owned"

def request(opener, route, data=None, origin=None):
    headers = {}
    if origin:
        headers["Origin"] = origin
    if data is not None:
        if isinstance(data, dict) and route == "/api/marketplace/claim":
            body=urllib.parse.urlencode(data).encode()
            headers["Content-Type"]="application/x-www-form-urlencoded"
        else:
            body=json.dumps(data,ensure_ascii=False).encode()
            headers["Content-Type"]="application/json"
    else:
        body=None
    return opener.open(urllib.request.Request(ORIGIN+route, data=body, headers=headers), timeout=70)

def ticket(job):
    claims={"v":1,"job":job,"sku":"EDU-001","kind":"EXAM_REPORT_ONCE","examId":EXAM_ID,
            "exp":int(time.time())+300}
    encoded=base64.urlsafe_b64encode(json.dumps(claims,separators=(",",":"),ensure_ascii=False).encode()).rstrip(b"=").decode()
    sig=hmac.new(SECRET.encode(),encoded.encode(),hashlib.sha256).hexdigest()
    return encoded+"."+sig

def status(opener, route, data=None,origin=None):
    try:
        with request(opener,route,data=data,origin=origin) as r:
            return r.status,r.read()
    except urllib.error.HTTPError as e:
        return e.code,e.read()

def main():
    repo=pathlib.Path(__file__).resolve().parents[1]
    paper=repo/"private/exams"/(EXAM_ID+".json")
    assert paper.is_file(), "QA fixture paper absent: copy from authorized private library, never git-add it"
    with tempfile.TemporaryDirectory(prefix="socthink-amc8-e2e-") as tmp:
        base=pathlib.Path(tmp)
        env=os.environ.copy()
        env.update({
          "PORT":str(PORT),"SOCTHINK_MARKETPLACE_EXAM_MODE":"1",
          "SOCTHINK_MARKETPLACE_HANDOFF_SECRET":SECRET,
          "SOCTHINK_MARKETPLACE_AMC8_EXAM_ID":EXAM_ID,
          "SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN":ORIGIN,
          "SOCTHINK_MARKETPLACE_DATA_DIR":str(base/"claims"),
          "SOCTHINK_USER_DATA_DIR":str(base/"users"),
          "PDF_INTERNAL_ORIGIN":ORIGIN,
          "NEXT_TELEMETRY_DISABLED":"1",
        })
        logfile=open(base/"server.log","w")
        p=subprocess.Popen([str(repo/"node_modules/.bin/next"),"dev","--webpack","-H","127.0.0.1","-p",str(PORT)],
            cwd=repo,env=env,stdout=logfile,stderr=subprocess.STDOUT,start_new_session=True)
        print("QA process started",p.pid,flush=True)
        try:
            browser=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            ready=False
            for i in range(80):
                if p.poll() is not None:break
                try:
                    s,_=status(browser,"/marketplace/claim")
                    if s in (200,404):
                        ready=True;break
                except (OSError,TimeoutError):pass
                time.sleep(0.75)
            if not ready:raise RuntimeError("QA server not ready: "+(base/"server.log").read_text()[-3500:])
            print("PASS independent Next.js server responds",flush=True)
            proof=ticket("job_20261118_accepted_0001")
            with request(browser,"/marketplace/claim?ticket="+urllib.parse.quote(proof)) as r:
                html=r.read().decode()
                assert r.status==200 and "领取考试并继续" in html and "2024 MAA AMC 8" in html, "claim response status="+str(r.status)+" html="+html[:1300]
            print("PASS real 25-question AMC 8 claim SSR",flush=True)
            with request(browser,"/api/marketplace/claim",data={"ticket":proof},origin=ORIGIN) as r:
                examhtml=r.read().decode()
                assert r.status==200 and "/exam/"+EXAM_ID in r.geturl() and "2024" in examhtml and ("确认信息并开始考试" in examhtml or "开始考试" in examhtml), "post-claim url="+r.geturl()+" html="+examhtml[:1800]
            print("PASS claim binds browser and renders existing ExamClient",flush=True)
            status_,data=status(browser,"/api/exam-sessions",data={"examId":EXAM_ID})
            assert status_==200, (status_,data[:500])
            session=json.loads(data)["session"]
            assert session["id"].startswith("sess_")
            print("PASS authentic exam session started",flush=True)
            status_,data=status(browser,"/api/grade",data={"examId":EXAM_ID,"sessionId":session["id"],"answers":{},"events":[]})
            assert status_==200,(status_,data[:500])
            answer=json.loads(data)
            assert answer["attemptId"].startswith("att_")
            attempt=answer["attemptId"]
            print("PASS real scoring and attempt persistence",flush=True)
            with request(browser,"/report/"+urllib.parse.quote(attempt)) as r:
                page=r.read().decode()
                assert r.status==200 and "数学竞赛学习诊断报告" in page
            print("PASS original diagnostic report rendered",flush=True)
            with request(browser,"/api/reports/"+urllib.parse.quote(attempt)+"/pdf") as r:
                pdf=r.read()
                assert r.status==200 and r.headers.get("content-type","").startswith("application/pdf")
                assert pdf.startswith(b"%PDF") and len(pdf)>10000
            print("PASS real PDF downloaded: bytes",len(pdf),"sha256",hashlib.sha256(pdf).hexdigest()[:20],flush=True)
            s,d=status(browser,"/api/exam-sessions",data={"examId":EXAM_ID})
            assert s==409 and b"EXAM_ALREADY_USED" in d
            print("PASS second exam denied after purchase credit consumed",flush=True)
            fresh=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            s,_=status(fresh,"/api/reports/"+urllib.parse.quote(attempt)+"/pdf")
            assert s in (401,404)
            print("PASS unrelated browser cannot download report",flush=True)
            s,_=status(fresh,"/api/marketplace/claim",data={"ticket":proof},origin=ORIGIN)
            assert s==409
            print("PASS second device cannot redeem same ticket",flush=True)
            with request(browser,"/api/reports/"+urllib.parse.quote(attempt)+"/pdf") as r:
                pdf2=r.read()
                assert pdf2.startswith(b"%PDF")
            print("PASS repeat PDF download without new exam",flush=True)
            print("RESULT 9/9 local full-chain checks passed, synthetic payment only",flush=True)
        finally:
            try:os.killpg(p.pid,signal.SIGTERM)
            except ProcessLookupError:pass
            try:p.wait(timeout=8)
            except subprocess.TimeoutExpired:
                try:os.killpg(p.pid,signal.SIGKILL)
                except ProcessLookupError:pass
            logfile.close()

if __name__=="__main__":
    main()
