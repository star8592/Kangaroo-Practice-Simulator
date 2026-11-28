"""Real R79 scorer with synthetic audio -> strict PG18 archive -> owner read.
Called only by disposable test_rust_voucher_api.sh. No external endpoints."""
import hashlib,json,os,secrets,subprocess,sys,tempfile,time,urllib.request,urllib.error,wave
from pathlib import Path
accent=Path(sys.argv[1]).resolve(strict=True)
binary=Path(sys.argv[2]).resolve(strict=True)
subprocess.run(["node","-e","require(process.argv[1])",str(accent/"frontend/node_modules/typescript")],check=True,stdout=subprocess.DEVNULL)
out=Path(sys.argv[3]).resolve()
assert out.parent.name.startswith("socthink-rust-voucher-api.") and out.parent.parent==Path("/tmp")
origin=os.environ["WUHAN_TICKET_TEST_ORIGIN"];assert origin.startswith("http://127.0.0.1:")
owner=os.environ["WUHAN_TICKET_OWNER_ID"];session=os.environ["WUHAN_TICKET_OWNER_SESSION"];other=os.environ["WUHAN_TICKET_OTHER_SESSION"]
def request(base,path,data=None,headers=None):
    req=urllib.request.Request(base+path,data=data,headers=headers or {})
    try:r=urllib.request.urlopen(req,timeout=135)
    except urllib.error.HTTPError as e:r=e
    with r:
        assert "no-store" in r.headers.get("Cache-Control","")
        body=r.read()
        return r.status,json.loads(body) if r.status==200 else None
def read(id,cookie=session):
    return request(origin,"/api/platform/research/wuhan/reports/"+id,headers={"Cookie":"socthink_parent_session="+cookie})
with tempfile.TemporaryDirectory(prefix="wuhan-oral-preview-",dir="/tmp") as store,tempfile.TemporaryDirectory(prefix="wuhan-r79-live-synthetic-") as tmp:
    env={k:v for k,v in os.environ.items() if not k.startswith("WUHAN_")}
    env.update(WUHAN_ORAL_RESEARCH_PREVIEW="1",WUHAN_ORAL_PREVIEW_TOKEN=secrets.token_hex(32),NODE_ENV="test",WUHAN_ORAL_PREVIEW_STORE=store,WUHAN_RESEARCH_TICKET_MODE="1",WUHAN_RESEARCH_ARCHIVE_ORIGIN=origin,WUHAN_RESEARCH_ARCHIVE_KEY=os.environ["SOCTHINK_RESEARCH_ARCHIVE_KEY"],WUHAN_RESEARCH_TICKET_KEY=os.environ["SOCTHINK_RESEARCH_TICKET_KEY"])
    p=subprocess.Popen([str(binary)],cwd=accent,env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
    try:
        line=p.stdout.readline().strip();assert line.startswith("WUHAN_RESEARCH_LISTEN=http://127.0.0.1:"),line
        base=line.split("=",1)[1]
        status,t=request(origin,"/api/platform/research/wuhan/tickets/WH01",b"",{"Origin":"http://localhost:3000","Sec-Fetch-Site":"same-origin","Cookie":"socthink_parent_session="+session})
        assert status==200
        status,r=request(base,"/research/ticket-attempts/WH01",json.dumps({"ticket":t["ticket"]}).encode(),{"Content-Type":"application/json"})
        assert status==200
        aid=r["report"]["attempt_id"];token=r["attempt_access_token"];assert aid==t["attempt_id"]
        route="/research/reports/"+aid
        def exam(path,data=None,mime="application/json"):
            return request(base,route+path,data,{"Authorization":"Bearer "+token,"Content-Type":mime})
        for task,spoken in [("answer-gift-budget","Eighteen pounds."),("answer-poster-deadline","By Friday afternoon."),("answer-train-platform",None)]:
            wav=Path(tmp)/(task+".wav")
            if spoken is None:
                with wave.open(str(wav),"wb") as f:f.setparams((1,2,16000,0,"NONE","not compressed"));f.writeframes(b"\0"*(16000*2*4))
            else:subprocess.run(["espeak-ng","-v","en-us","-s","145","-w",str(wav),spoken],check=True)
            status,c=exam("/tasks/"+task,wav.read_bytes(),"audio/wav")
            assert status==200,(task,status)
            print("R79_REAL_AUDIO",json.dumps({"task":task,"fixture":spoken or "4s digital silence","status":c["status"],"practice_content":c.get("practice_content"),"reason":c.get("reason")},ensure_ascii=False),flush=True)
            assert c["official_score"] is False and c["reference_content_score"] is None
            if task=="answer-gift-budget":assert c["status"]=="reference_match" and c["practice_content"]["earned"]==1
            if task=="answer-poster-deadline":
                # ASR disagreement must abstain instead of inventing a grade.
                assert c["status"] in ("known_mismatch","needs_review"),c
                assert (c["practice_content"] is None if c["status"]=="needs_review" else c["practice_content"]["earned"]==0)
            if spoken is None:assert c["status"]=="unanswered" and c["practice_content"]["earned"]==0
        fluency_test=os.environ.get("SOCTHINK_TEST_R81_FLUENCY_PAGE")=="1"
        if fluency_test:
            wav=Path(tmp)/"reading.wav"
            subprocess.run(["espeak-ng","-v","en-us","-s","145","-w",str(wav),"Trees also slow rainwater as it reaches the ground."],check=True)
            raw=Path(tmp)/"reading.pcm"
            subprocess.run(["ffmpeg","-nostdin","-v","error","-i",str(wav),"-ac","1","-ar","16000","-f","s16le",str(raw)],check=True)
            with wave.open(str(wav),"wb") as f:
                f.setparams((1,2,16000,0,"NONE","not compressed"));f.writeframes(raw.read_bytes())
            status,c=exam("/tasks/read-trees",wav.read_bytes(),"audio/wav")
            assert status==200,(status,c)
            diag=c["diagnosis"]
            print("R81_ACTUAL_READING_DIAG",json.dumps(diag,ensure_ascii=False),flush=True)
            assert diag["status"] in ("reference_text_matched","asr_disagreement","reference_text_differs") and diag["pronunciation_score"] is None
            assert diag["fluency_evidence"] is not None,diag
            if diag["status"]=="asr_disagreement":assert diag["fluency_evidence"]["recording_words_per_minute"] is None
            elif diag["status"]=="reference_text_matched":assert diag["fluency_evidence"]["recording_words_per_minute"]==152,diag
            print("R81_ACTUAL_READING_EVIDENCE",json.dumps(diag["fluency_evidence"]),flush=True)
        retell_test=os.environ.get("SOCTHINK_TEST_R83_RETELL_PAGE")=="1"
        if retell_test:
            wav=Path(tmp)/"retell.wav"
            subprocess.run(["espeak-ng","-v","en-us","-s","145","-w",str(wav),"They planted twenty young trees. They picked up rubbish."],check=True)
            status,c=exam("/tasks/retell-river-cleanup",wav.read_bytes(),"audio/wav")
            assert status==200 and c["status"]=="partial_reference",c
            e=c["retell_coverage"]
            assert e["confirmed_indices"]==[1,3] and e["total_groups"]==6 and c["reference_content_score"] is None and c["practice_content"] is None
            print("R83_REAL_RETELL_COVERAGE",json.dumps(e),flush=True)
        status,report=exam("/finalize",b"")
        assert status==200 and report["finalized"] and report["submitted"]==(3+int(fluency_test)+int(retell_test)) and report["total_score"] is None and report["billable"] is False
        assert read(aid)==(200,report) and read(aid,other)[0]==404
        assert exam("/archive-status")[1]["archive_status"]=="archived"
        if fluency_test:
            import copy,hmac
            for field,value in [("recording_words_per_minute",999),("speech_activity_percent",101),("internal_pause_count",4),("active_speech_words_per_minute",9999)]:
                invalid=copy.deepcopy(report)
                d=next(x for x in invalid["items"] if x["task_id"]=="read-trees")["candidate"]["diagnosis"]
                d["fluency_evidence"][field]=value
                raw=json.dumps({"owner_id":owner,"report":invalid},separators=(",",":")).encode()
                sig=hmac.new(bytes.fromhex(os.environ["SOCTHINK_RESEARCH_ARCHIVE_KEY"]),b"wuhan-research-archive-v1"+bytes(1)+raw,hashlib.sha256).hexdigest()
                code,_=request(origin,"/internal/research/wuhan/archive",raw,{"Content-Type":"application/json","x-research-signature":sig})
                assert code==400,(field,code)
            assert read(aid)==(200,report)
            print("R81_SIGNED_INVALID_FLUENCY_HTTP_REJECTED 4 cases",flush=True)
        if retell_test:
            import copy,hmac
            for field,value in [("confirmed_indices",[1,1]),("confirmed_indices",[6]),("confirmed_indices",[]),("total_groups",99),("bank_sha256","0"*64),("schema_version",2)]:
                invalid=copy.deepcopy(report)
                d=next(x for x in invalid["items"] if x["kind"]=="retell")["candidate"]
                d["retell_coverage"][field]=value
                raw=json.dumps({"owner_id":owner,"report":invalid},separators=(",",":")).encode()
                sig=hmac.new(bytes.fromhex(os.environ["SOCTHINK_RESEARCH_ARCHIVE_KEY"]),b"wuhan-research-archive-v1"+bytes(1)+raw,hashlib.sha256).hexdigest()
                code,_=request(origin,"/internal/research/wuhan/archive",raw,{"Content-Type":"application/json","x-research-signature":sig})
                assert code==400,(field,code)
            assert read(aid)==(200,report)
            print("R83_SIGNED_INVALID_RETELL_HTTP_REJECTED 6 cases",flush=True)
        out.write_text(json.dumps(report,ensure_ascii=False))
        print(f"R79_REAL_SCORER_ARCHIVE_PASS {report['submitted']} recorded tasks; 4 short answers unsubmitted; exact owner read; no official grade",flush=True)
    finally:
        p.terminate()
        try:p.wait(timeout=10)
        except subprocess.TimeoutExpired:p.kill();p.wait()
