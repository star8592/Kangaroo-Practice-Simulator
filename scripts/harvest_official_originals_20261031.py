#!/usr/bin/env python3
"""Seven-lane official-original PDF bulk sweep. Read-only archive; no OCR, no uploads."""
from __future__ import annotations
import argparse
from bs4 import BeautifulSoup
from collections import Counter, defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
from urllib.parse import urljoin, urlparse, unquote
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(os.environ["SOCTHINK_RAW_ARCHIVE_DIR"]).expanduser().resolve()
UTC = lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
ALLOWED = ("cemc.uwaterloo.ca","cbseacademic.nic.in","www.i.u-tokyo.ac.jp",
           "www.math.nagoya-u.ac.jp","www.ipa.go.jp","www.cambridgeenglish.org",
           "www.onetcenter.org","ielts.org","www.ielts.org")
SOURCES=[]
for i in (13,14,24,25,27,29):
    SOURCES.append(("cemc"+str(i),"math-competition" if i!=29 else "career",
       "https://cemc.uwaterloo.ca/resources/past-contests?contest_category="+str(i),"University of Waterloo CEMC",None))
for y in (2024,2025,2026,2027):
    sy=f"{y-1}-{str(y)[-2:]}"
    for cl in ("X","XII"):
        SOURCES.append(("cbse"+cl+str(y),"school",
              f"https://cbseacademic.nic.in/SQP_CLASS{cl}_{sy}.html","CBSE (India)",y))
SOURCES += [
    ("tokyo","university","https://www.i.u-tokyo.ac.jp/edu/entra/examarchive_e.shtml","University of Tokyo",None),
    ("nagoya","university","https://www.math.nagoya-u.ac.jp/en/admission/gs/exam.html","Nagoya University",None),
    ("ipa2024","professional","https://www.ipa.go.jp/shiken/mondai-kaiotu/2024r06.html","IPA Japan",2024),
    ("ipa2025","professional","https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html","IPA Japan",2025),
    ("ipafe2024","career","https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/2024r06.html","IPA Japan",2024),
    ("ipafe2025","career","https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/2025r07.html","IPA Japan",2025),
    ("ipafe2026","career","https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/2026r08.html","IPA Japan",2026),
    ("onet","interest","https://www.onetcenter.org/IP.html","O*NET Resource Center",None),
    ("cambridgekey","language","https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/preparation/","Cambridge English",None),
    ("cambridgepet","language","https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/preparation/","Cambridge English",None),
    ("ieltsacademic","language","https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test","IELTS",None),
    ("ieltsgeneral","language","https://ielts.org/take-a-test/preparation-resources/sample-test-questions/general-training-test","IELTS",None),
]
CORE_SUBJECTS=re.compile(r'mathematic|science|social science|physics|chemistry|biology|computer science|information pract|english|hindi|economics|accountancy|business studies|history|geography|political science|psychology|informatics|french|german|sanskrit',re.I)
PAST_YEARS=re.compile(r'(?<!\d)(2024|2025|2026|2027)(?!\d)')
OLD_RE = re.compile(r'(20(?:2[0-3]|1\d))')
def get(url,timeout=22,limit=2_300_000):
    host=urlparse(url).hostname or ""
    if host not in ALLOWED:raise ValueError("unlisted source host: "+host)
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; AcademicArchiveResearch/1.0)"})
    with urlopen(req,timeout=timeout) as f:
        dest=urlparse(f.geturl()).hostname
        if dest not in ALLOWED: raise ValueError("redirect outside official allowlist")
        body=f.read(limit+1)
        if len(body)>limit:raise ValueError("response exceeds per-file safety limit")
        return body
def enumerate_page(source):
    sid,domain,page,owner,forcedyear=source
    try:
        html=get(page)
        soup=BeautifulSoup(html,"html.parser")
        out=[]
        for a in soup.find_all("a",href=True):
            u=urljoin(page,a["href"])
            parsed=urlparse(u)
            if parsed.scheme!="https" or parsed.hostname not in ALLOWED:continue
            if not parsed.path.lower().endswith(".pdf"):continue
            row=a.find_parent("tr")
            rowtext=(row.get_text(" ",strip=True) if row else "")[:240]
            href=unquote(parsed.path)
            name=(href.rsplit("/",1)[-1])
            title=a.get_text(" ",strip=True)[:90]
            if sid.startswith("cemc"):
                if re.search(r'results?|scores?|honou?r|statistics|ranking',name,re.I):continue
                if not re.search(r'202[456]',rowtext+" "+name):continue
                match=PAST_YEARS.search(name) or PAST_YEARS.search(rowtext)
                if not match:continue
                year=int(match.group(1))
                kind="solution" if re.search(r'sol|answer|key|commentary',name,re.I) else "original_paper"
            elif sid.startswith("cbse"):
                if not row or not CORE_SUBJECTS.search(rowtext):continue
                year=forcedyear
                kind="official_sample_scheme" if re.search(r'(^|[-_])MS([.\-_]|$)|marking|solution',name,re.I) else "official_sample_paper"
            elif sid=="tokyo":
                m=re.search(r'(?:ay)?(20(?:24|25|26|27)|(?:24|25|26|27))',name,re.I)
                if not m:continue
                year=int(m.group(1))
                year=2000+year if year<100 else year
                kind="original_paper" if "purpose" not in name.lower() else "exam_commentary"
            elif sid=="nagoya":
                m=re.search(r'exam-(?:mc|dc)-(202[4567])',name,re.I)
                if not m:continue
                year=int(m.group(1))
                kind="original_paper" if re.search(r'day\d',name,re.I) else "explanation"
            elif sid.startswith("ipa"):
                year=forcedyear
                if not year:continue
                kind="original_paper" if ("問題冊子" in (rowtext+" "+title) or re.search(r'qs|question|mondai|exam',name,re.I)) else "solution_or_commentary"
            elif sid=="onet":
                year=None
                kind="original_assessment_instrument"
                if not any(z in (rowtext+" "+title+" "+name).lower() for z in ("interest","score","career","profiler")):continue
            else:
                year=None
                kind="official_sample_paper" if not re.search(r'answer|key|tapescript|mark',name,re.I) else "official_sample_solution"
            if year is not None and year not in (2024,2025,2026,2027):continue
            if OLD_RE.search(name) and not PAST_YEARS.search(name) and year is None:continue
            # The actual source page, not just a guess derived from a year in the URL, is retained.
            out.append({"source_id":sid,"domain":domain,"source_page":page,"source_owner":owner,
                        "url":u,"exam_year":year,"kind":kind,"label":rowtext[:120] or title,
                        "source_file":name,"discovered_at":UTC(),"status":"discovered"})
        urls={e["url"]:e for e in out}
        return sid,list(urls.values()),None
    except Exception as e:
        return sid,[],str(type(e).__name__)+":"+str(e)[:170]
def discover():
    all_entries=[]
    errors={}
    with ThreadPoolExecutor(max_workers=4) as p:
        for sid,items,err in p.map(enumerate_page,SOURCES):
            all_entries.extend(items)
            if err:errors[sid]=err
            print("DISCOVERED",sid,len(items),err or "",flush=True)
    # URL duplicates across sources (keep first, original source retained)
    dedup={}
    for e in all_entries: dedup.setdefault(e["url"],e)
    return list(dedup.values()),errors
def existing_urls():
    old=ROOT/"manifest.json"
    if not old.exists():return {}
    x=json.loads(old.read_text(encoding="utf-8"))
    return {i["url"]:i for i in x.get("items",[]) if i.get("sha256")}
def retrieve(e,known):
    e=dict(e)
    e["commercial_redistribution_verified"]=False
    e["public_sale_enabled"]=False
    e["ocr_performed"]=False
    e["is_original_exam"]=e["kind"]=="original_paper"
    if e["url"] in known:
        old=known[e["url"]]
        e.update(status="already_archived_in_original_batch",sha256=old["sha256"],size_bytes=old["size_bytes"],stored_relpath=None,
                 note="Original manifest stores the single existing copy; no duplicate downloaded")
        return e
    suffix=hashlib.sha256(e["url"].encode()).hexdigest()[:12]
    filename=re.sub(r"[^a-zA-Z0-9._-]","_",e["source_file"])[:105]
    if not filename.lower().endswith(".pdf"):filename+=".pdf"
    year=str(e["exam_year"]) if e["exam_year"] else "year-agnostic"
    rel=Path(e["domain"])/year/e["source_id"]/(suffix+"_"+filename)
    path=ROOT/rel
    e["stored_relpath"]=str(rel)
    try:
        if path.is_file():
            raw=path.read_bytes()
            if len(raw)<800 or not raw.startswith(b"%PDF"):raise ValueError("Existing invalid file")
            e["status"]="existing_same_url"
        else:
            time.sleep(0.15)
            raw=get(e["url"],timeout=30,limit=18*1024*1024)
            if not raw.startswith(b"%PDF") or len(raw)<800:raise ValueError("Not valid PDF")
            path.parent.mkdir(parents=True,exist_ok=True)
            tmp=path.with_suffix(".partial")
            with open(tmp,"wb") as f: f.write(raw)
            tmp.chmod(0o600)
            os.replace(tmp,path)
            e["status"]="downloaded"
        e["sha256"]=hashlib.sha256(raw).hexdigest()
        e["size_bytes"]=len(raw)
        e["verified_at"]=UTC()
        try:
            r=subprocess.run(["pdfinfo",str(path)],capture_output=True,text=True,timeout=5)
            m=re.search(r"^Pages:\s*(\d+)",r.stdout,re.M)
            if m:e["pages"]=int(m.group(1))
        except Exception:pass
    except Exception as ex:
        e["status"]="failed"
        e["failure"]=type(ex).__name__+":"+str(ex)[:180]
    return e

def run(limit,download):
    ROOT.mkdir(parents=True,exist_ok=True)
    entries,errors=discover()
    key=lambda e:(0 if e["exam_year"]==2027 else 1 if e["exam_year"]==2026 else 2 if e["exam_year"]==2025 else 3 if e["exam_year"]==2024 else 4, e["domain"],e["source_id"])
    entries.sort(key=key)
    inventory={"batch_id":"socthink-official-mass-sweep-20261031","source_count":len(SOURCES),
               "candidate_count":len(entries),"source_errors":errors,"discovered_at":UTC(),
               "year_order":[2027,2026,2025,2024],"entries":entries}
    discovery=ROOT/"mass-sweep-discovery.json"
    discovery.write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    discovery.chmod(0o600)
    print("CANDIDATES",len(entries),"BY_DOMAIN",dict(Counter(e["domain"] for e in entries)),flush=True)
    if not download:return
    known=existing_urls()
    # Balanced breadth-first run: every year and domain gets a chance before repeats.
    pools=defaultdict(deque)
    for e in entries:pools[(e["domain"],e["exam_year"])].append(e)
    order=[]
    years=(2027,2026,2025,2024,None)
    domains=("school","math-competition","language","university","career","professional","interest")
    while len(order)<len(entries):
        progress=False
        for yr in years:
            for domain in domains:
                q=pools[(domain,yr)]
                if q:
                    order.append(q.popleft());progress=True
        if not progress:break
    # Resume from durable checkpoint or finished manifest; never repeat finished requests.
    state_paths=[ROOT/"mass-sweep-progress.json",ROOT/"mass-sweep-manifest.json"]
    previous={}
    for state in state_paths:
        if state.is_file():
            old=json.loads(state.read_text(encoding="utf8"))
            for e in old.get("entries",[]):
                if e.get("status") in ("downloaded","already_archived_in_original_batch","existing_same_url","failed"):
                    previous[e["url"]]=e
    selected=[e for e in order if e["url"] not in previous][:limit]
    results=list(previous.values())
    print("RESUMING previous=",len(results),"new_selected=",len(selected),"total=",len(entries),flush=True)
    with ThreadPoolExecutor(max_workers=3) as p:
        fs={p.submit(retrieve,e,known):e for e in selected}
        for f in as_completed(fs):
            result=f.result()
            results.append(result)
            if len(results)%25==0 or len(results)==len(previous)+len(selected):
                checkpoint=ROOT/"mass-sweep-progress.json"
                checkpoint.write_text(json.dumps({"completed":len(results),"selected":len(selected),"entries":results},ensure_ascii=False,indent=2)+"\n",encoding="utf8")
                checkpoint.chmod(0o600)
                print("CHECKPOINT",len(results),len(selected),flush=True)
            if result["status"]=="failed":print("FAILED",result["source_id"],result["source_file"],result.get("failure",""),flush=True)
    results.sort(key=key)
    report={"batch_id":inventory["batch_id"],"completed_at":UTC(),
            "candidate_count":len(entries),"attempted_count":len(results),
            "source_errors":errors,"entries":results}
    dest=ROOT/"mass-sweep-manifest.json"
    dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    dest.chmod(0o600)
    print("SWEEP_SUMMARY",json.dumps({
      "candidates":len(entries),"attempted":len(selected),
      "status":dict(Counter(e["status"] for e in results)),
      "new_bytes":sum(e.get("size_bytes",0) or 0 for e in results if e["status"]=="downloaded"),
      "by_domain_downloaded":dict(Counter(e["domain"] for e in results if e["status"]=="downloaded")),
      "by_exam_year_downloaded":dict(Counter(str(e["exam_year"]) for e in results if e["status"]=="downloaded")),
      "source_errors":errors
    },ensure_ascii=False),flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--limit",type=int,default=200)
    parser.add_argument("--discover-only",action="store_true")
    a=parser.parse_args()
    run(a.limit,not a.discover_only)
