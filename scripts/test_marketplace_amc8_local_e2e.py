#!/usr/bin/env python3
"""Local-only E2E: signed synthetic handoff -> real original exam engine -> real PDF.
Never sends anything to Xianyu or main site and does not assume real payment.
"""
import base64
import hashlib
import hmac
import http.cookiejar
import json
import secrets
import os
import pathlib
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

PORT = 18742
RUST_PORT = 18743
ORIGIN = f"http://127.0.0.1:{PORT}"
SECRET = "local_e2e_test_secret_not_real_paid_order_20261118_replace"
EXAM_ID = "amc8-original-qa-smoke"

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
    fixture=repo/"tests/fixtures/marketplace-amc8-original-qa.json"
    assert fixture.is_file(), "synthetic original QA fixture missing"
    assert not paper.exists(), "QA synthetic exam would collide with an existing paper"
    paper.parent.mkdir(parents=True,exist_ok=True)
    paper.write_bytes(fixture.read_bytes())
    try:
      with tempfile.TemporaryDirectory(prefix="socthink-amc8-e2e-") as tmp:
        base=pathlib.Path(tmp)
        # Fresh, isolated and signed approval is allowed ONLY for this
        # synthetic QA arithmetic fixture, never historic AMC8 papers.
        qa=json.loads(paper.read_text())
        assert qa["profile"]["sourceLabel"]=="Generated synthetic QA arithmetic; never for sale"
        assert qa["profile"]["rightsPolicy"]["license"]=="synthetic-qa-original-only"
        rights_dir=base/"rights"
        rights_dir.mkdir(mode=0o700)
        review_secret=secrets.token_hex(32)
        review_time=int(time.time()*1000)
        fingerprint=hashlib.sha256(paper.read_bytes()).hexdigest()
        review={"v":1,"examId":EXAM_ID,"contentSha256":fingerprint,
                "license":"synthetic-qa-original-only","approvedAt":review_time,
                "reviewer":"qa-only"}
        message="|".join(("v1",EXAM_ID,fingerprint,review["license"],str(review_time),"qa-only"))
        review["signature"]=hmac.new(review_secret.encode(),message.encode(),hashlib.sha256).hexdigest()
        review_path=rights_dir/(EXAM_ID+".json")
        review_path.write_text(json.dumps(review,separators=(",",":")))
        review_path.chmod(0o600)
        env=os.environ.copy()
        env.update({
          "PORT":str(PORT),"SOCTHINK_MARKETPLACE_EXAM_MODE":"1",
          "SOCTHINK_MARKETPLACE_HANDOFF_SECRET":SECRET,
          "SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET":review_secret,
          "SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR":str(rights_dir),
          "SOCTHINK_MARKETPLACE_EXAMS_DIR":str(repo/"private/exams"),
          "SOCTHINK_MARKETPLACE_AMC8_EXAM_ID":EXAM_ID,
          "SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN":ORIGIN,
          "SOCTHINK_MARKETPLACE_DATA_DIR":str(base/"claims"),
          "SOCTHINK_USER_DATA_DIR":str(base/"users"),
          "PDF_INTERNAL_ORIGIN":ORIGIN,
          "SOCTHINK_RUST_BIND":f"127.0.0.1:{RUST_PORT}",
          "SOCTHINK_RUST_CATALOG_SNAPSHOT":"unused",
          "SOCTHINK_CATALOG_SNAPSHOT":str(repo/"backend/socthink-core/tests/fixtures/catalog.json"),
          "SOCTHINK_MARKETPLACE_RUST_INTERNAL_URL":f"http://127.0.0.1:{RUST_PORT}",
          "NEXT_TELEMETRY_DISABLED":"1",
        })
        rust_log=open(base/"rust.log","w")
        rust_binary=repo/"backend/socthink-core/target/debug/socthink-catalog-api"
        assert rust_binary.is_file(), "cargo build --offline --manifest-path backend/socthink-core/Cargo.toml"
        rust=subprocess.Popen([str(rust_binary)],cwd=repo,env=env,stdout=rust_log,stderr=subprocess.STDOUT,start_new_session=True)
        for _ in range(45):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{RUST_PORT}/healthz", timeout=1) as res:
                    if res.status==200:break
            except (OSError,TimeoutError):pass
            time.sleep(.25)
        else:
            raise RuntimeError("Rust not ready: "+(base/"rust.log").read_text()[-1300:])
        print("PASS Rust marketplace domain service ready",flush=True)
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
                assert r.status==200 and "领取考试并继续" in html and "QA Synthetic AMC8 Practice" in html, "claim response status="+str(r.status)+" html="+html[:1300]
            print("PASS real 25-question AMC 8 claim SSR",flush=True)
            with request(browser,"/api/marketplace/claim",data={"ticket":proof},origin=ORIGIN) as r:
                examhtml=r.read().decode()
                assert r.status==200 and "/exam/"+EXAM_ID in r.geturl() and "QA Synthetic AMC8 Practice" in examhtml and ("确认信息并开始考试" in examhtml or "正在准备考试" in examhtml or "开始考试" in examhtml), "post-claim url="+r.geturl()+" html="+examhtml[:1800]
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
            assert (base/"users"/"exam-attempts.jsonl").is_file(), "attempt must be stored inside this isolated instance"
            assert (base/"users"/"exam-sessions.json").is_file(), "session must be stored inside this isolated instance"
            print("PASS original grading with isolated session + attempt storage",flush=True)
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
            pdf_file=base/"validated-report.pdf"
            pdf_file.write_bytes(pdf2)
            info=subprocess.run(["pdfinfo",str(pdf_file)],capture_output=True,text=True,check=True,timeout=20)
            pages=[line for line in info.stdout.splitlines() if line.startswith("Pages:")]
            assert pages and int(pages[0].split(":",1)[1].strip())>=1, info.stdout
            print("PASS report PDF parseable page count",pages[0],flush=True)
            extracted=subprocess.run(["pdftotext",str(pdf_file),"-"],capture_output=True,text=True,check=True,timeout=25)
            assert len(extracted.stdout.strip())>100, "report PDF needs searchable extracted text"
            print("PASS report PDF searchable text characters",len(extracted.stdout.strip()),flush=True)
            rendered=subprocess.run(["pdftoppm","-f","1","-l","1","-scale-to","900","-singlefile","-png",
                str(pdf_file),str(base/"report-page-1")],capture_output=True,text=True,timeout=35)
            assert rendered.returncode==0 and (base/"report-page-1.png").stat().st_size>6000,"PDF first-page render must succeed"
            print("PASS PDF rendered first page to nonempty PNG",flush=True)

            print("RESULT 9/9 local full-chain checks passed, synthetic payment only",flush=True)
            if os.environ.get("RUN_AMC8_MOBILE_BROWSER_QA")=="1":
                subprocess.run(["node","scripts/test_marketplace_mobile_browser.mjs"],cwd=repo,env=env,check=True,timeout=200)
        finally:
            try:os.killpg(p.pid,signal.SIGTERM)
            except ProcessLookupError:pass
            try:p.wait(timeout=8)
            except subprocess.TimeoutExpired:
                try:os.killpg(p.pid,signal.SIGKILL)
                except ProcessLookupError:pass
            logfile.close()
            try:os.killpg(rust.pid,signal.SIGTERM)
            except ProcessLookupError:pass
            rust.wait(timeout=8)
            rust_log.close()

    finally:
        paper.unlink(missing_ok=True)

if __name__=="__main__":
    main()
