#!/usr/bin/env python3
import argparse
import hashlib
import http.cookiejar
import json
import secrets
import time
import urllib.error
import urllib.request
from pathlib import Path

def request(opener, url, method="GET", payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json"}, method=method)
    try:
        with opener.open(req) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        try:
            body = json.load(exc)
        except Exception:
            body = {"error": str(exc)}
        return exc.code, body

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:3000")
    parser.add_argument("--data-root", default=str(Path(__file__).resolve().parents[1]))
    args=parser.parse_args()
    root=Path(args.data_root).resolve()
    users_file=root/"private/users/users.json"
    attempts_file=root/"private/users/exam-attempts.jsonl"
    sessions_file=root/"private/users/exam-sessions.json"
    exam_id="au-amc-pre-a-sample-1"
    exam_file=root/f"private/exams/{exam_id}.json"
    base=args.base.rstrip("/")

    uid="prebuilt_"+secrets.token_hex(6)
    username=uid
    candidate="PBR"+secrets.token_hex(4).upper()
    pin=secrets.token_hex(4)
    salt=secrets.token_hex(16)
    key=hashlib.scrypt(pin.encode(),salt=salt.encode(),n=16384,r=8,p=1,dklen=32).hex()

    users=json.loads(users_file.read_text()) if users_file.exists() else []
    users.append({
        "id":uid,"username":username,"candidateNo":candidate,"name":"Prebuilt Smoke",
        "grade":1,"pinHash":"scrypt$"+salt+"$"+key,"createdAt":int(time.time()*1000),
        "active":True,"role":"student"
    })
    users_file.parent.mkdir(parents=True,exist_ok=True)
    users_file.write_text(json.dumps(users,ensure_ascii=False,indent=2))

    jar=http.cookiejar.CookieJar()
    client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    try:
        code,login=request(client,base+"/api/auth/login","POST",{"username":username,"pin":pin})
        assert code==200 and login.get("user",{}).get("id")==uid,(code,login)

        code,exam=request(client,base+f"/api/exams/{exam_id}")
        assert code==200,(code,exam)
        questions=exam["questions"]
        profile=exam["profile"]
        assert len(questions)==25,len(questions)
        assert profile["competitionId"]=="australian-amc"
        assert profile["formatId"]=="australian-amc-pre-a"
        assert profile["maxScore"]==100

        code,start=request(client,base+"/api/exam-sessions","POST",{"examId":exam_id})
        assert code==200,(code,start)
        session_id=start["session"]["id"]
        bank=json.loads(exam_file.read_text())
        answers={q["id"]:q["answer"] for q in bank["questions"]}
        code,graded=request(client,base+"/api/grade","POST",{
            "examId":exam_id,"sessionId":session_id,"answers":answers,"lang":"zh","events":[]
        })
        assert code==200 and graded.get("score")==100,(code,graded)

        code,analytics=request(client,base+"/api/student/analytics")
        assert code==200 and analytics.get("overview",{}).get("examAttempts",0)>=1,(code,analytics)

        code,arithmetic=request(client,base+"/api/arithmetic/sessions")
        assert code==200 and "sessions" in arithmetic,(code,arithmetic)

        print("PREBUILT_RUNTIME_SMOKE=PASS auth=true questions=25 score=100 analytics=true arithmetic=true")
    finally:
        if users_file.exists():
            current=json.loads(users_file.read_text())
            users_file.write_text(json.dumps([u for u in current if u.get("id")!=uid],ensure_ascii=False,indent=2))
        if attempts_file.exists():
            kept=[]
            for line in attempts_file.read_text().splitlines():
                if not line.strip():
                    continue
                item=json.loads(line)
                if item.get("userId")!=uid:
                    kept.append(line)
            attempts_file.write_text(("\n".join(kept)+"\n") if kept else "")
        if sessions_file.exists():
            current=json.loads(sessions_file.read_text())
            sessions_file.write_text(json.dumps([x for x in current if x.get("userId")!=uid],ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
