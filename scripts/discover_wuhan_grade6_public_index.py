#!/usr/bin/env python3
"""Collect PUBLIC index metadata from Wuhan sixth-grade exam listings, never paid attachments."""
import hashlib,json,re,time
from pathlib import Path
from urllib.parse import urljoin,urlsplit
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
base="https://www.wh111.com/xiaoxue/liunianji/"
pages=[base,base+"index_2.html",base+"index_3.html",base+"index_4.html"]
seen={}
failures=[]
for i,url in enumerate(pages,1):
    try:
        req=Request(url,headers={"User-Agent":"Mozilla/5.0 (SOCTHINK official source link research)"})
        with urlopen(req,timeout=18) as f:
            raw=f.read(180000)
            final=f.geturl()
        assert urlsplit(final).hostname in {"www.wh111.com","wh111.com"}
        source=raw.decode("gbk",errors="replace")
        soup=BeautifulSoup(source,"html.parser")
        found=0
        for a in soup.find_all("a",href=True):
            href=urljoin(url,a["href"])
            if not href.startswith("https://www.wh111.com/xiaoxue/liunianji/"):continue
            if not re.search(r"/20(?:24|25|26|27)-\d\d-\d\d/\d+\.html$",urlsplit(href).path):continue
            title=a.get_text(" ",strip=True)
            if not any(x in title for x in ("2024","2025","2026","2027")):continue
            year_labels=sorted({int(v) for v in re.findall(r"20(?:24|25|26|27)",title)})
            subject=next((s for s in ("数学","语文","英语","物理","科学") if s in title),"other")
            rel=re.search(r"/(20\d\d-\d\d-\d\d)/",href)
            obj={
                "id":hashlib.sha256(href.encode()).hexdigest()[:16],
                "domain":"school",
                "title":title[:200],
                "pageUrl":href,
                "indexUrl":url,
                "publicationDateFromUrl":rel.group(1) if rel else None,
                "yearsMentioned":year_labels,
                "subject":subject,
                "publisher":"武汉教育资源网（第三方转载/发布，非官方考试院）",
                "sourceStatus":"public_listing_only",
                "examOriginalVerified":False,
                "actualFileDownloaded":False,
                "downloadGate":"unknown_or_point_charged",
                "copyrightLicense":"not_verified",
                "commercialSaleAllowed":False,
            }
            if href not in seen:
                seen[href]=obj
                found+=1
        print("LIST_PAGE",i,"new",found,flush=True)
    except Exception as e:
        failures.append({"url":url,"error":type(e).__name__+":"+str(e)[:130]})
        print("PAGE_FAILED",url,failures[-1]["error"],flush=True)
    time.sleep(.3)
items=list(seen.values())
out={
    "schemaVersion":1,
    "collectedAt":"2026-10-31",
    "source":"Wuhan Education Resources public sixth-grade listing index",
    "sourcePageCount":len(pages),
    "successfulSourcePageCount":len(pages)-len(failures),
    "scope":"Public listing metadata only; avoid copying third-party copyrighted exam documents or bypassing points gate.",
    "sourceNotice":"Site has point-based downloads; article presence is not proof of file availability or permission to resell.",
    "items":items,
    "failures":failures,
}
dest=ROOT/"data/discovery/wuhan-grade6-thirdparty-index-20261031.json"
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("WUHAN_PUBLIC_LISTINGS",len(items),"FAILED_PAGES",len(failures))
print("SUBJECTS",{s:sum(x["subject"]==s for x in items) for s in ("数学","语文","英语","物理","科学","other")})
for x in items:
 if "东湖高新区" in x["title"] and "数学" in x["title"] and "2025-2026" in x["title"]:
  print("RECONCILIATION_CANDIDATE",x["title"][:115],x["pageUrl"])
