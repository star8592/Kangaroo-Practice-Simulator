#!/usr/bin/env python3
"""Acquire openly downloadable Chinese government K12 exam PDFs into private SHA archive.

This does not imply redistribution permission. No paid, logged-in or bypass access.
Bounded concurrent official-host-only source pages/files; original bytes unchanged.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import hashlib
import json
import os
import re
import subprocess
import sys

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path(os.environ["SOCTHINK_K12_OFFICIAL_ARCHIVE"])
PUBLIC_INDEX = ROOT / "data/discovery/china-k12-official-gov-downloads-20261101.json"

SOURCES = [
    ("fujian_2026_main", "福建", 2026, "https://jyj.fuzhou.gov.cn/zwgk/cswz/fzygzz/tzgg/202606/t20260623_5337122.htm"),
    ("fujian_2026_geobio", "福建", 2026, "https://jyj.fuzhou.gov.cn/zwgk/cswz/fzygzz/tzgg/202606/t20260623_5337400.htm"),
    ("fujian_2025_main", "福建", 2025, "https://jyj.fuzhou.gov.cn/zwgk/cswz/fzygzz/tzgg/202506/t20250621_5036744.htm"),
    ("fujian_2025_geobio", "福建", 2025, "https://jyj.fuzhou.gov.cn/zwgk/cswz/fzygzz/tzgg/202506/t20250621_5036745.htm"),
    ("fujian_2024_main", "福建", 2024, "https://jyj.fuzhou.gov.cn/zwgk/cswz/fzygzz/tzgg/202406/t20240621_4847383.htm"),
    ("fujian_2024_geobio", "福建", 2024, "https://jyj.fuzhou.gov.cn/zwgk/cswz/fzygzz/tzgg/202406/t20240621_4847790.htm"),
    ("jiangxi_2025", "江西", 2025, "https://jdz.gov.cn/zwzx/ztbd/ggqsydw/gzdt/t1031780.shtml"),
]
SOURCE_ONLY = os.getenv("K12_GOV_SOURCE_ONLY", "").strip()
if SOURCE_ONLY:
    if SOURCE_ONLY not in {x[0] for x in SOURCES}:
        raise ValueError("unknown official source id")
    SOURCES = [x for x in SOURCES if x[0] == SOURCE_ONLY]
    PUBLIC_INDEX = ROOT / f"data/discovery/china-k12-official-gov-{SOURCE_ONLY}-20261101.json"
ALLOWED = {"jyj.fuzhou.gov.cn", "jdz.gov.cn"}
MAX_PDF = int(os.getenv("K12_MAX_GOV_PDF_BYTES", str(100_000_000)))
TIMEOUT = (15,45)
AGENT = {"User-Agent":"Mozilla/5.0 (SOCTHINK official K12 public original evidence archive)"}

def permitted(url: str)->bool:
    x=urlsplit(url)
    return x.scheme == "https" and x.hostname in ALLOWED and x.path.lower().endswith(".pdf")

def collect_source(s):
    tag,province,year,url=s
    out={"sourceId":tag,"province":province,"year":year,"sourcePage":url,"sourceStatus":"failed","attachmentUrls":[],"error":None}
    try:
        r=requests.get(url,headers=AGENT,timeout=TIMEOUT)
        r.raise_for_status()
        soup=BeautifulSoup(r.content,"html.parser")
        links=[]
        for a in soup.select("a[href]"):
            u=urljoin(r.url,a.get("href",""))
            if permitted(u):
                links.append({"label":a.get_text(" ",strip=True), "url":u})
        dedup=list({x["url"]:x for x in links}.values())
        out.update(sourceStatus="public_html_verified", sourceSha256=hashlib.sha256(r.content).hexdigest(),attachmentUrls=dedup, htmlBytes=len(r.content))
    except Exception as e:
        out["error"]=type(e).__name__+":"+str(e)[:180]
    return out

def validate_pdf(path):
    try:
        cp=subprocess.run(["pdfinfo",str(path)],capture_output=True,text=True,timeout=28)
        if cp.returncode:return None,"pdfinfo_"+cp.stderr.strip()[:125]
        pages=re.search(r"^Pages:\s*(\d+)",cp.stdout,re.M)
        if not pages or int(pages.group(1))<1:return None,"pdf_pages_not_found"
        return int(pages.group(1)),None
    except FileNotFoundError:return None,"pdfinfo_not_installed"
    except Exception as e:return None,type(e).__name__+":"+str(e)[:120]

def archive_file(s, a):
    url=a["url"]; province=s["province"];year=s["year"]
    name=(s["sourceId"]+"_"+hashlib.sha256(url.encode()).hexdigest()[:12]+".pdf")
    target=PRIVATE/str(year)/province/name
    row={"sourceId":s["sourceId"],"province":province,"year":year,"sourcePage":s["sourcePage"],"originalLabel":a["label"],"originalUrl":url,"fileName":name,"status":"failed","sha256":None,"bytes":0,"pages":None,"examKind":"provincial_zhongkao_original_bundle_or_individual_paper","rightsStatus":"published_government_pdf_redistribution_rights_unverified","commercialSaleAllowed":False,"error":None}
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and target.stat().st_size>100:
        with target.open("rb") as f: magic=f.read(5)
        pages,err=validate_pdf(target) if magic==b"%PDF-" else (None,"non_pdf")
        if pages:
            row.update(status="already_archived_verified",bytes=target.stat().st_size,pages=pages,sha256=hashlib.sha256(target.read_bytes()).hexdigest())
            return row
    tmp=target.with_suffix(".part")
    try:
        with requests.get(url,headers=AGENT,stream=True,timeout=TIMEOUT,allow_redirects=False) as r:
            if r.status_code != 200:raise ValueError("http_"+str(r.status_code))
            content_type=r.headers.get("Content-Type","").lower()
            content_length=int(r.headers.get("Content-Length") or 0)
            if content_length>MAX_PDF:
                row.update(status="deferred_oversize",error=f"content_length_{content_length}_over_cap_{MAX_PDF}")
                return row
            if "pdf" not in content_type and "octet-stream" not in content_type:
                raise ValueError("wrong_content_type_"+content_type[:65])
            count=0;sha=hashlib.sha256()
            with tmp.open("wb") as f:
                for chunk in r.iter_content(1024*256):
                    if not chunk:continue
                    count+=len(chunk)
                    if count>MAX_PDF:raise ValueError("over_byte_limit")
                    sha.update(chunk);f.write(chunk)
                f.flush();os.fsync(f.fileno())
        with tmp.open("rb") as f: magic=f.read(5)
        if magic!=b"%PDF-":raise ValueError("not_pdf_magic")
        pages,err=validate_pdf(tmp)
        if err:raise ValueError(err)
        os.replace(tmp,target)
        row.update(status="archived_verified",sha256=sha.hexdigest(),bytes=count,pages=pages)
    except Exception as e:
        row["error"]=type(e).__name__+":"+str(e)[:180]
    finally:
        tmp.unlink(missing_ok=True)
    return row

def main():
    PRIVATE.mkdir(parents=True,exist_ok=True)
    assert PRIVATE.is_absolute() and "private/raw-source-archive/" in str(PRIVATE), "private archive only"
    with ThreadPoolExecutor(max_workers=3) as ex:
        records=list(ex.map(collect_source,SOURCES))
    attachments=[(s,a) for s in records for a in s["attachmentUrls"]]
    with ThreadPoolExecutor(max_workers=3) as ex:
        results=list(ex.map(lambda v:archive_file(*v),attachments))
    public={"schemaVersion":1,"generatedAtUtc":datetime.now(timezone.utc).isoformat(),
        "scope":"Chinese K12 education authority already published original PDFs; private archive only",
        "sourceCount":len(SOURCES),"sourcePagesVerified":sum(s["sourceStatus"]=="public_html_verified" for s in records),
        "attachmentCount":len(results),
        "newFileCount":sum(v["status"]=="archived_verified" for v in results),
        "alreadyFileCount":sum(v["status"]=="already_archived_verified" for v in results),
        "deferredOversize":sum(v["status"]=="deferred_oversize" for v in results),
        "failureCount":sum(v["status"]=="failed" for v in results),
        "newPdfBytes":sum(v["bytes"] for v in results if v["status"]=="archived_verified"),
        "newPdfPages":sum(v["pages"] or 0 for v in results if v["status"]=="archived_verified"),
        "papersIndividuallyStructured":0,"commercialSaleAllowed":0,
        "sources":records, "files":results}
    PUBLIC_INDEX.write_text(json.dumps(public,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("GOV_SOURCES",public["sourcePagesVerified"],"/",len(SOURCES),"ATTACHMENTS",len(results))
    print("OFFICIAL_K12_PDFS_DOWNLOADED",public["newFileCount"],"BYTES",public["newPdfBytes"],"PAGES",public["newPdfPages"])
    print("OFFICIAL_K12_DOWNLOAD_DEFERRED",public["deferredOversize"],"FAILURES",public["failureCount"])
    for f in results:
        print(f["status"],f["year"],f["province"],f["originalLabel"][:35],f["bytes"],f["pages"],f["error"] or "")
    return 0

if __name__=="__main__":
    sys.exit(main())
