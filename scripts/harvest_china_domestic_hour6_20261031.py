#!/usr/bin/env python3
"""Conservative capture of publicly downloadable official Chinese source files.

One run, 2026-10-31: BJTU 2027 syllabi, Xiamen math-competition SWF previews,
and the MOHRSS public 2024 standard. Does not use credentials, bypass a captcha,
access paid media, OCR third-party work, or publish downloads.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urljoin,urlsplit,urlunsplit
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup
from collections import Counter
from datetime import datetime,timezone

BASE=Path("/mnt/disk1/Code/Kangaroo-Practice-Simulator/private/raw-source-archive/2024-2027")
ROOT=BASE/"domestic-first-20261031"/"batch-hour6-20261031"
ROOT.mkdir(parents=True,exist_ok=True)
ROOT.chmod(0o700)
CHECKPOINT=ROOT/"source-files-and-failures.json"
SOURCES=[
 {"id":"bjtu-2027","sourceOwner":"北京交通大学研究生院","year":2027,
 "lane":"university","kind":"official_exam_scope_not_paper",
 "page":"https://gs.bjtu.edu.cn/tzgg/qb/9e15037b484345b985f0aa603090682d.htm"},
 {"id":"xmu-2025-and-2024","sourceOwner":"厦门大学精品课程","year":None,
 "lane":"math-competition","kind":"third_party_academic_exam_preview",
 "page":"https://gdjpkc.xmu.edu.cn/DocumentList.aspx?cID=22&dID=383"}
]
MANUAL=[
 {"sourceId":"mohrss-2024","sourceOwner":"人力资源和社会保障部","lane":"career","year":2024,
  "kind":"official_skill_exam_question_setting_standard",
  "sourcePage":"https://www.mohrss.gov.cn/SYrlzyhshbzb/rencairenshi/zcwj/202411/t20241115_529876.html",
  "url":"https://www.mohrss.gov.cn/SYrlzyhshbzb/rencairenshi/zcwj/202411/W020241119554293950905.pdf",
  "label":"技能人才评价命题技术规程（试行）.pdf", "extension":"pdf"}
]
ALLOW={
 "gs.bjtu.edu.cn","yzb.bjtu.edu.cn","gdjpkc.xmu.edu.cn",
 "www.mohrss.gov.cn"
}
EXISTING_PUBLIC=Path(__file__).resolve().parents[1]/"data/discovery/china-official-source-harvest-20261031.json"

def now():return datetime.now(timezone.utc).isoformat(timespec="seconds")
def safe_url(url):
 p=urlsplit(url)
 if p.scheme not in ("https","http") or p.hostname not in ALLOW:
  raise ValueError("Host or URL not allowlisted")
 if p.scheme=="http" and p.hostname=="yzb.bjtu.edu.cn":
  p=p._replace(scheme="https")
 if p.scheme!="https":raise ValueError("Must use https")
 if p.username or p.password or p.fragment:
  raise ValueError("URL credentials/fragment not accepted")
 return urlunsplit(p)

def retrieve(url,limit=15000000,timeout=16):
 url=safe_url(url)
 with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (SOCTHINK verified public-source archiving)"}),timeout=timeout) as r:
  final=safe_url(r.geturl())
  raw=r.read(limit+1)
  if len(raw)>limit:raise ValueError("Oversized file")
  return raw,final,r.headers.get("Content-Type","")
def sha(data):return hashlib.sha256(data).hexdigest()
def magic(data):
 if data.startswith(b"%PDF-"):return "pdf"
 if data.startswith(b"CWS") or data.startswith(b"FWS") or data.startswith(b"ZWS"):return "swf"
 if data.startswith(b"PK\x03\x04"):return "zip"
 if data.startswith(bytes.fromhex("d0cf11e0a1b11ae1")):return "doc"
 return None
def pages_for_pdf(path):
 try:
  o=subprocess.run(["pdfinfo",str(path)],capture_output=True,text=True,timeout=10)
  m=re.search(r"^Pages:\s*(\d+)",o.stdout,re.M)
  return int(m.group(1)) if m and o.returncode==0 else None
 except (FileNotFoundError,subprocess.TimeoutExpired):return None
def row(s,link,label,extension,year=None,kind=None):
 u=safe_url(link)
 return {
   "id":sha(u.encode())[:24],
   "sourceId":s["id"],
   "sourceOwner":s["sourceOwner"],
   "sourcePage":s["page"],
   "lane":s["lane"],
   "examYear":year if year is not None else s["year"],
   "kind":kind or s["kind"],
   "url":u,
   "title":label[:180],
   "extension":extension
 }
def discover(s):
 raw,_,_=retrieve(s["page"],limit=1300000,timeout=16)
 soup=BeautifulSoup(raw,"html.parser")
 candidates=[]
 if s["id"]=="bjtu-2027":
  for a in soup.select("a[href]"):
   label=a.get_text(" ",strip=True)
   href=urljoin(s["page"],a["href"])
   if re.search(r"\.pdf(?:\?|$)",urlsplit(href).path,re.I) or label.lower().endswith(".pdf"):
    try:candidates.append(row(s,href,label,"pdf"))
    except ValueError:continue
 else:
  for a in soup.select("a[href]"):
   label=a.get_text(" ",strip=True)
   if not re.search(r"202[45]年",label) or "大学生数学竞赛" not in label:
    continue
   href=urljoin(s["page"],a["href"])
   if "FlashShow.aspx" not in href:continue
   year=2025 if "2025年" in label else 2024
   try:
    html,_,_=retrieve(href,limit=110000,timeout=13)
    detail=html.decode("gb18030","replace")
    find=re.search(r'<embed[^>]+src=["\']([^"\']+\.swf)["\']',detail,re.I)
    if not find:
     find=re.search(r'(?:Movie|Src)"?\s+VALUE=["\']([^"\']+\.swf)',detail,re.I)
    if not find:continue
    rel=find.group(1).replace("\\","/").lstrip("/")
    resource="https://gdjpkc.xmu.edu.cn/"+rel
    candidates.append(row(s,resource,label,"swf",year=year,kind="published_legacy_flash_exam_preview"))
    time.sleep(.20)
   except Exception as e:
    print("XMU_DETAIL_MISSING",label[:45],type(e).__name__,flush=True)
 unique={c["url"]:c for c in candidates}
 return list(unique.values())
def progress(records):
 obj={
  "batch":"2026-10-31-hour6",
  "sourcePages":[x["page"] for x in SOURCES],
  "createdAt":now(),
  "itemCount":len(records),
  "counts":dict(Counter(r["status"] for r in records)),
  "items":records,
  "note":"Original published raw bytes retained on Z890 private disk. SWF previews are not verified PDF originals; non-downloadable/captcha protected pages are never bypassed."
 }
 temp=CHECKPOINT.with_suffix(".tmp")
 temp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 temp.chmod(0o600);os.replace(temp,CHECKPOINT)
def main():
 old=json.loads(EXISTING_PUBLIC.read_text(encoding="utf-8"))
 seenurls={x["originalUrl"] for x in old["files"]}
 olds= {}
 if CHECKPOINT.exists():
  for x in json.loads(CHECKPOINT.read_text(encoding="utf-8"))["items"]:
   olds[x["url"]]=x
 rows=[]
 errors={}
 for s in SOURCES:
  try:
   new=discover(s)
   rows.extend(new)
   print("SOURCE",s["id"],"CANDIDATES",len(new),flush=True)
  except Exception as e:
   errors[s["id"]]=f"{type(e).__name__}:{str(e)[:160]}"
   print("SOURCE_ERROR",s["id"],errors[s["id"]],flush=True)
 rows+= [{
  **{k:v for k,v in x.items() if k not in ("year","sourcePage","sourceOwner","kind","label","extension","url","lane","sourceId")},
  "id":sha(x["url"].encode())[:24],"sourceId":x["sourceId"],
  "sourceOwner":x["sourceOwner"],"sourcePage":x["sourcePage"],"lane":x["lane"],
  "examYear":x["year"],"kind":x["kind"],"url":x["url"],"title":x["label"],
  "extension":x["extension"]
 } for x in MANUAL]
 dedup={}
 for x in rows:
  dedup.setdefault(x["url"],x)
 records=[]
 for n,r in enumerate(dedup.values(),1):
  url=r["url"]
  if url in olds and olds[url].get("status")=="downloaded":
   records.append(olds[url]);continue
  if url in seenurls:
   r["status"]="duplicate_previous_harvest_url";records.append(r);continue
  try:
   raw,final,mime=retrieve(url,timeout=20)
   sig=magic(raw)
   if sig not in {"pdf","swf","doc","zip"}:
    raise ValueError(f"HTML/captcha/non-document response {mime!r}, magic={raw[:15]!r}")
   if sig!=r["extension"] and not (sig=="zip" and r["extension"]=="docx"):
    raise ValueError("File contents mismatch declared extension")
   rel=Path(str(r["examYear"] or "unknown"))/r["sourceId"]/(sha(url.encode())[:20]+"."+r["extension"])
   dest=ROOT/rel
   dest.parent.mkdir(parents=True,exist_ok=True)
   dest.parent.chmod(0o700)
   temp=dest.with_suffix(dest.suffix+".partial")
   temp.write_bytes(raw);temp.chmod(0o600);os.replace(temp,dest)
   actual_sha=sha(dest.read_bytes())
   if actual_sha!=sha(raw):raise ValueError("SHA validation failed after write")
   r.update(status="downloaded",sha256=actual_sha,sizeBytes=len(raw),mimeType=mime,
      storedRelativePath=str(dest.relative_to(BASE)),pageCount=pages_for_pdf(dest) if sig=="pdf" else None,
      actualFormat=sig,verifiedAt=now(),sourceFileUnmodified=True,
      examOriginalVerified=False if sig=="swf" or r["kind"]!="original_exam" else True,
      commercialRedistributionAllowed=False,ocrPerformed=False)
   print("ARCHIVED",r["sourceId"],r["examYear"],r["title"][:28],len(raw),sig,"pages",r["pageCount"],flush=True)
  except Exception as e:
   r.update(status="failed",error=f"{type(e).__name__}: {str(e)[:140]}")
   print("FAILED",r["sourceId"],r["title"][:30],r["error"],flush=True)
  records.append(r)
  progress(records)
  time.sleep(.22)
 progress(records)
 print("FINAL",len(records),dict(Counter(r["status"] for r in records)),errors,flush=True)
if __name__=="__main__":
 main()
