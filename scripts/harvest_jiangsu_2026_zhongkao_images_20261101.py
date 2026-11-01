#!/usr/bin/env python3
"""Archive government-released 2026 Suzhou/Yangzhou exam sheet images published by Xinhua Jiangsu.

Preserves original image bytes + original page order and makes private convenience
PDFs by city/subject (derivatives). Rights for public rehosting/sale are NOT assumed.
Does not fetch user-paid, gated, login or preview-only source.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit
import hashlib
import json
import os
import re
import subprocess

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/"data/discovery/jiangsu-2026-zhongkao-media-images-20261101.json"
PRIVATE=Path(os.environ["SOCTHINK_K12_OFFICIAL_ARCHIVE"])/"jiangsu-suzhou-yangzhou-2026"
ARTICLE="https://jsnews.jschina.com.cn/jsyw/202606/t20260620_s6a36143ce4b0b6e57b5a4365.shtml"
QUERY_ARTICLE=ARTICLE+"?from=homepage"
CREDIT="新华日报·交汇点（2026-06-20），转载官方发布的苏州/扬州中考试题"
IMAGE_HOST="jcdn.xhby.net"
GROUPS=[
("苏州","语文","paper",6),("苏州","语文","answer",2),
("苏州","数学","paper",8),("苏州","数学","answer",6),
("苏州","英语","paper",8),("苏州","英语","answer",1),
("苏州","物理","paper",8),("苏州","物理","answer",2),
("苏州","化学","paper",8),("苏州","化学","answer",2),
("苏州","道德与法治","paper",6),("苏州","道德与法治","answer",1),
("苏州","历史","paper",6),("苏州","历史","answer",1),
("扬州","语文","paper",6),("扬州","化学","paper",6),
("扬州","数学","paper",6),("扬州","物理","paper",6),
("扬州","英语","paper",8),("扬州","道德与法治","paper",4),
("扬州","历史","paper",4)
]
assert sum(g[3] for g in GROUPS)==105
HEADERS={"User-Agent":"Mozilla/5.0 (SOCTHINK public exam sheet research)"}
MAX_IMAGE_BYTES=12_000_000

def source_images():
    r=requests.get(QUERY_ARTICLE,timeout=(15,35),headers=HEADERS)
    r.raise_for_status()
    soup=BeautifulSoup(r.content,"html.parser")
    srcs=[]
    for im in soup.find_all("img"):
        src=str(im.get("src",""))
        if urlsplit(src).hostname==IMAGE_HOST and "/dams-res/editing/image/202606/20/" in src:
            raw=src.split("?")[0]
            assert raw.startswith("https://jcdn.xhby.net/dams-res/")
            if raw not in srcs:srcs.append(raw)
    assert len(srcs)==105, f"media article source pages changed: {len(srcs)} (expected 105)"
    return r.content,srcs

def hash_path(p):
    h=hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):h.update(chunk)
    return h.hexdigest()

def valid_image(path):
    try:
        with Image.open(path) as im:
            fmt=im.format
            width,height=im.size
            im.verify()
        if fmt not in ("PNG","JPEG") or width<650 or height<750:
            return None
        return {"format":fmt,"width":width,"height":height}
    except Exception:return None

def download(task):
    seq,meta,src=task
    city,subject,role,local_page,group_size=meta
    d=PRIVATE/"images"/city/subject/role
    d.mkdir(parents=True,exist_ok=True)
    name=f"{local_page:02d}_of_{group_size:02d}_media_{seq:03d}.png"
    dst=d/name
    row={"sourceUrl":src,"articleUrl":ARTICLE,"city":city,"subject":subject,
         "role":role,"imageIndexInArticle":seq,
         "pageInSection":local_page,"sectionPageCountFromMedia":group_size,
         "fileName":str(dst.relative_to(PRIVATE)),"status":"failed",
         "sha256":None,"bytes":None,"width":None,"height":None,"error":None}
    if dst.exists():
        checked=valid_image(dst)
        if checked:
            row.update(status="already_archived_sha_verified",sha256=hash_path(dst),
                       bytes=dst.stat().st_size,**checked)
            return row
    tmp=dst.with_suffix(".part")
    try:
        for attempt in (1,2):
            try:
                resp=requests.get(src,headers={**HEADERS,"Referer":ARTICLE},
                        timeout=(15,40),stream=True,allow_redirects=False)
                if resp.status_code!=200:raise ValueError(f"HTTP_{resp.status_code}")
                ctype=resp.headers.get("Content-Type","").lower()
                if not ctype.startswith("image/"):raise ValueError("non_image_"+ctype)
                size=0
                with tmp.open("wb") as f:
                    for chunk in resp.iter_content(1024*256):
                        if not chunk:continue
                        size+=len(chunk)
                        if size>MAX_IMAGE_BYTES:raise ValueError("max_file_bytes")
                        f.write(chunk)
                    f.flush();os.fsync(f.fileno())
                valid=valid_image(tmp)
                if not valid:raise ValueError("bad_image_magic_or_dimensions")
                tmp.replace(dst)
                row.update(status="archived_raw_media_image",sha256=hash_path(dst),
                           bytes=size,**valid)
                return row
            except Exception:
                if attempt==2:raise
    except Exception as e:
        row["error"]=type(e).__name__+":"+str(e)[:135]
    finally:
        tmp.unlink(missing_ok=True)
    return row

def make_private_pdf(city,subject,role,rows):
    target=PRIVATE/"assembled_private_reading_pdfs"/city/(subject+"_"+role+".pdf")
    # Avoid overclaiming: derived reading convenience copy, original images preserved.
    ordered=sorted(rows,key=lambda x:x["pageInSection"])
    if any(x["status"] not in ("archived_raw_media_image","already_archived_sha_verified") for x in ordered):
        return {"status":"incomplete_media_pages","path":None}
    if any(x["pageInSection"]!=i for i,x in enumerate(ordered,1)):
        return {"status":"page_sequence_mismatch","path":None}
    target.parent.mkdir(parents=True,exist_ok=True)
    page_images=[]
    try:
        for x in ordered:
            src=PRIVATE/x["fileName"]
            im=Image.open(src)
            # Preserve aspect; RGB only for PDF image embedding.
            im=ImageOps.exif_transpose(im)
            page_images.append(im.convert("RGB"))
            im.close()
        part=target.with_suffix(".part.pdf")
        page_images[0].save(part,format="PDF",resolution=144,save_all=True,
                            append_images=page_images[1:],quality=90)
        p=subprocess.run(["pdfinfo",str(part)],capture_output=True,text=True,timeout=30)
        matched=re.search(r"^Pages:\s+(\d+)",p.stdout,re.M)
        assert p.returncode==0 and matched and int(matched.group(1))==len(rows), "pdf_page_count_mismatch"
        part.replace(target)
        return {"status":"private_pdf_assembled_pdfinfo_verified",
                "fileName":str(target.relative_to(PRIVATE)),
                "pages":len(rows),"bytes":target.stat().st_size,
                "sha256":hash_path(target)}
    finally:
        for x in page_images:x.close()

def main():
    assert "private/raw-source-archive/" in str(PRIVATE),str(PRIVATE)
    article_bytes,urls=source_images()
    PRIVATE.mkdir(parents=True,exist_ok=True)
    tasks=[]
    n=0
    for city,subject,role,count in GROUPS:
        for j in range(1,count+1):
            n+=1
            tasks.append((n,(city,subject,role,j,count),urls[n-1]))
    result=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        futs={pool.submit(download,task):task for task in tasks}
        for i,f in enumerate(as_completed(futs),1):
            result.append(f.result())
            if i%15==0:print("IMAGE_PROGRESS",i,"of",len(tasks),flush=True)
    result.sort(key=lambda r:r["imageIndexInArticle"])
    pdfs=[]
    for city,subject,role,count in GROUPS:
        pages=[r for r in result if r["city"]==city and r["subject"]==subject and r["role"]==role]
        assert len(pages)==count,(city,subject,role,len(pages),count)
        built=make_private_pdf(city,subject,role,pages)
        pdfs.append({"city":city,"subject":subject,"role":role,"mediaPages":count,**built})
    summary={
        "schemaVersion":1,"createdAtUtc":datetime.now(timezone.utc).isoformat(),
        "sourceArticle":ARTICLE,"sourceCredit":CREDIT,
        "articleHtmlSha256":hashlib.sha256(article_bytes).hexdigest(),
        "citySourceType":"news_media_citing_authority_public_release",
        "actualExamYear":2026,"state":"raw_public_media_exam_page_images_archived",
        "mediaImagePages":len(result),"newImagePagesDownloaded":sum(r["status"]=="archived_raw_media_image" for r in result),
        "alreadyImagePagesShaVerified":sum(r["status"]=="already_archived_sha_verified" for r in result),
        "failedImagePages":sum(r["status"]=="failed" for r in result),
        "archivedOriginalImageBytes":sum(r["bytes"] or 0 for r in result),
        "mediaSections":len(GROUPS),
        "privateAssembledPdfs":sum(p["status"]=="private_pdf_assembled_pdfinfo_verified" for p in pdfs),
        "privateAssembledPdfPages":sum(p.get("pages",0) for p in pdfs),
        "physicalPaperCompleteVerified":False,
        "humanPageOrderVerified":False,
        "questionAnswerAlignmentVerified":False,
        "ocrAllPagesVerified":False,
        "commercialRedistributionRightVerified":False,
        "publiclyPublished":False,
        "sections":pdfs,"images":result,
    }
    DEST.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("K12_JS_2026_MEDIA_IMAGES",summary["newImagePagesDownloaded"],"NEW",summary["alreadyImagePagesShaVerified"],"EXISTING","FAILED",summary["failedImagePages"],"BYTES",summary["archivedOriginalImageBytes"])
    print("K12_JS_2026_PRIVATE_PDFS",summary["privateAssembledPdfs"],"PDF_PAGES",summary["privateAssembledPdfPages"])
    for p in pdfs:print("SECTION",p["city"],p["subject"],p["role"],p["mediaPages"],p["status"],p.get("bytes",0))
    if summary["failedImagePages"]:raise SystemExit(2)

if __name__=="__main__":main()
