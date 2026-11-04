#!/usr/bin/env python3
"""SOCTHINK Chinese-official original file collector. Only public university pages.
Originals private, SHA checked, no OCR / publication / resale.
"""
import os,re,json,hashlib,datetime,subprocess
from pathlib import Path
from urllib.parse import urljoin,urlsplit
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor,as_completed
from collections import defaultdict,deque,Counter
from bs4 import BeautifulSoup
SOURCES=[
("jnu-2027","university",2027,"暨南大学","https://yz.jnu.edu.cn/2026/0724/c36355a861160/page.htm","official_syllabus"),
("nau-2026","university",2026,"南京审计大学","https://gs.nau.edu.cn/2026/0706/c5851a160401/page.htm","original_exam"),
("nau-2025","university",2025,"南京审计大学","https://gs.nau.edu.cn/2025/0902/c5851a147136/page.htm","original_exam"),
("nau-2024","university",2024,"南京审计大学","https://gs.nau.edu.cn/2024/0904/c5851a134889/page.htm","original_exam"),
("jnu-2026","university",2026,"暨南大学","https://yz.jnu.edu.cn/2025/0728/c36355a841104/page.htm","official_syllabus"),
("jnu-2025","university",2025,"暨南大学","https://yz.jnu.edu.cn/2024/0720/c36355a818629/page.htm","official_syllabus"),
("gdufs","university",None,"广东外语外贸大学","https://yz.gdufs.edu.cn/info/1026/1027.htm","official_sample"),
("bipt","university",None,"北京石油化工学院","https://www.bipt.edu.cn/pub/yjszsw/zkxx/bkzl/4fc44615442348ba99f5ca8386e90676.htm","official_sample"),
]
ALLOWED={urlsplit(v[4]).hostname for v in SOURCES}
ARCHIVE=Path(os.environ["SOCTHINK_RAW_ARCHIVE_DIR"]).resolve()
ROOT=ARCHIVE/"domestic-first-20261031"
ROOT.mkdir(parents=True,exist_ok=True)
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
def load(url,limit=22000000,timeout=24):
    p=urlsplit(url)
    if p.scheme!="https" or p.hostname not in ALLOWED: raise ValueError("domain not allowlisted")
    with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (educational source preservation)"}),timeout=timeout) as r:
        p2=urlsplit(r.geturl())
        if p2.scheme!="https" or p2.hostname not in ALLOWED:raise ValueError("untrusted redirect")
        body=r.read(limit+1)
        if len(body)>limit:raise ValueError("file too large for safe limited retrieval")
        return body
def extract(s):
    sid,domain,year,owner,page,kind=s
    try:
        soup=BeautifulSoup(load(page,2500000),"html.parser")
        out=[]
        for a in soup.find_all("a",href=True):
            name=a.get_text(" ",strip=True)
            url=urljoin(page,a["href"])
            if urlsplit(url).scheme!="https" or urlsplit(url).hostname not in ALLOWED:continue
            ext=re.search(r'\.(pdf|docx|doc|zip)(?:\s|$)',name,re.I)
            path_ext=re.search(r'\.(pdf|docx|doc|zip)$',urlsplit(url).path,re.I)
            if not ext and not path_ext:continue
            ext=(ext or path_ext).group(1).lower()
            if not name:name=Path(urlsplit(url).path).name
            # Exact URL is the identity, not user-facing label, which may be split across HTML tags.
            out.append({"sourceId":sid,"domain":domain,"examYear":year,"sourceOwner":owner,
               "sourcePage":page,"url":url,"label":name[:180],"declaredExtension":ext,
               "kind":kind,"discoveredAt":stamp(),"saleAllowed":False})
        return sid,out,None
    except Exception as ex:return sid,[],f"{type(ex).__name__}: {str(ex)[:180]}"
def discover():
    allrows=[];errors={}
    with ThreadPoolExecutor(max_workers=3) as pool:
        for sid,items,err in pool.map(extract,SOURCES):
            allrows.extend(items)
            if err:errors[sid]=err
            print("SOURCE",sid,"FILES",len(items),"ERROR",err or "",flush=True)
    seen={}
    for row in allrows:seen.setdefault(row["url"],row)
    rows=list(seen.values())
    per=defaultdict(deque)
    for row in rows:per[row["sourceId"]].append(row)
    order=[]
    while True:
        inserted=0
        for sid,*_ in SOURCES:
            if per[sid]:
                order.append(per[sid].popleft());inserted+=1
        if not inserted:break
    return order,errors
def sniff(data):
    if data.startswith(b"%PDF"):return "application/pdf",".pdf"
    if data[:4]==b"PK\x03\x04":return "application/zip",".zip"
    if data.startswith(bytes.fromhex("d0cf11e0a1b11ae1")):return "application/msword",".doc"
    raise ValueError("unknown file magic, not PDF/Word/ZIP")
def grab(row):
    r=dict(row)
    digest=hashlib.sha256(row["url"].encode()).hexdigest()[:16]
    ex=row["declaredExtension"]
    year=str(row["examYear"] or "year-not-explicit")
    file=ROOT/year/row["sourceId"]/(digest+"."+ex)
    try:
        if file.exists():
            content=file.read_bytes()
            r["state"]="existing"
        else:
            content=load(row["url"],limit=22000000,timeout=28)
            typ,det=sniff(content)
            file.parent.mkdir(parents=True,exist_ok=True)
            tmp=file.with_suffix(file.suffix+".partial")
            tmp.write_bytes(content);tmp.chmod(0o600);os.replace(tmp,file)
            r["state"]="downloaded"
        typ,det=sniff(content)
        r.update(sha256=hashlib.sha256(content).hexdigest(),sizeBytes=len(content),
          mime=typ,storedRelativePath=str(file.relative_to(ARCHIVE)),verifiedAt=stamp(),
          originalUnchanged=True,ocrDone=False,commercialRedistributionRights="not_verified")
        if det==".zip":
            r["notes"]="ZIP/Office container retained unchanged; inspect contents later only if authorized"
    except Exception as exc:
        r.update(state="failed",error=f"{type(exc).__name__}: {str(exc)[:180]}")
    return r
rows,errs=discover()
p=ROOT/"candidate-index.json"
p.write_text(json.dumps({"sources":len(SOURCES),"candidates":len(rows),"errors":errs,"items":rows},ensure_ascii=False,indent=2)+"\n",encoding="utf8")
p.chmod(0o600)
old=ROOT/"harvest-progress.json"
seen={}
if old.exists():
 for row in json.loads(old.read_text(encoding="utf8")).get("items",[]):
    seen[row["url"]]=row
count=0
for start in range(0,len(rows),30):
 pending=[r for r in rows[start:start+30] if r["url"] not in seen]
 with ThreadPoolExecutor(max_workers=3) as pool:
  for future in as_completed([pool.submit(grab,r) for r in pending]):
    row=future.result();seen[row["url"]]=row
    if row["state"]=="failed": print("FAIL",row["sourceId"],row.get("label"),row.get("error"),flush=True)
  # after each 30: atomic checkpoint
  progress={"updatedAt":stamp(),"sourceCount":len(SOURCES),"candidateCount":len(rows),
    "sourceErrors":errs,"items":list(seen.values())}
  tmp=old.with_suffix(".tmp")
  tmp.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
  tmp.chmod(0o600);os.replace(tmp,old)
  count=len(seen)
  print("CHECKPOINT",count,len(rows),dict(Counter(x["state"] for x in seen.values())),flush=True)
print("DONE",len(seen),dict(Counter(x["state"] for x in seen.values())),flush=True)
