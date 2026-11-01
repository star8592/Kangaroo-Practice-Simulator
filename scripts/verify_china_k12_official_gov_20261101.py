#!/usr/bin/env python3
"""Re-verify private government K12 PDF bytes against public-index SHA, report scan/OCR state.

No website publishing, no changing original bytes, no reselling assumptions.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT/"data/discovery"
PRIVATE = Path(os.environ["SOCTHINK_K12_OFFICIAL_ARCHIVE"])
INPUTS = [
 DATA/"china-k12-official-gov-downloads-20261101.json",
 DATA/"china-k12-official-gov-fujian_2026_main-20261101.json"
]
OUTPUT = DATA/"china-k12-official-gov-verified-20261101.json"

def sha256_stream(path: Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(2**20),b""):h.update(chunk)
    return h.hexdigest()

def role(label:str)->str:
    if "听力材料" in label:return "listening_transcript_not_audio"
    if "答案" in label and "合订" not in label:return "reference_answer"
    if "合订" in label:return "bundled_exam_papers_and_reference_answers"
    return "paper"

def validate(row):
    # Verify using the same static private archive schema; no arbitrary file path from JSON.
    year=int(row["year"])
    assert year in (2024,2025,2026)
    assert row["province"] in ("福建","江西")
    assert re.fullmatch(r"[a-z0-9_]+_[0-9a-f]{12}\.pdf",row["fileName"])
    path=PRIVATE/str(year)/row["province"]/row["fileName"]
    assert path.is_file() and path.stat().st_size==row["bytes"], f"size mismatch {path.name}"
    assert sha256_stream(path)==row["sha256"], f"sha mismatch {path.name}"
    with path.open("rb") as f:assert f.read(5)==b"%PDF-"
    p=subprocess.run(["pdfinfo",str(path)],capture_output=True,text=True,timeout=30)
    assert p.returncode==0, p.stderr[:150]
    m=re.search(r"^Pages:\s*(\d+)",p.stdout,re.M)
    assert m and int(m.group(1))==row["pages"]
    txt=subprocess.run(["pdftotext","-f","1","-l","1",str(path),"-"],
                       capture_output=True,text=True,timeout=30)
    first_text_count=len(txt.stdout.strip()) if txt.returncode==0 else None
    return {
        "sourceId":row["sourceId"],"province":row["province"],"examYear":year,
        "originalLabel":row["originalLabel"],"fileName":row["fileName"],
        "sourcePage":row["sourcePage"],"originalUrl":row["originalUrl"],
        "bytes":row["bytes"],"pages":row["pages"],"sha256":row["sha256"],
        "roleFromOfficialLabel":role(row["originalLabel"]),
        "firstPageExtractedTextChars":first_text_count,
        "requiresImageOCR": first_text_count==0,
        "pageContentHumanReviewed": False,
        "answerMatchedToPaperByQuestion":False,
        "licensedForPublicRedistribution":False,
        "saleEnabled":False,
        "status":"gov_original_pdf_bytes_sha_and_pdf_pages_verified",
    }

def main():
    assert PRIVATE.is_absolute() and "private/raw-source-archive" in str(PRIVATE)
    docs=[];sources=[];download_deferred=[]
    for index in INPUTS:
        if not index.exists():continue
        obj=json.loads(index.read_text(encoding="utf8"))
        sources.extend(obj["sources"])
        for file in obj["files"]:
            if file["status"] in ("archived_verified","already_archived_verified"):
                docs.append(validate(file))
            elif file["status"]=="deferred_oversize":
                download_deferred.append({"sourceId":file["sourceId"],"label":file["originalLabel"],"reason":file["error"],"originalUrl":file["originalUrl"]})
    dedup={d["originalUrl"]:d for d in docs}
    assert len(dedup)==len(docs), "same source URL in multiple manifests"
    roles=Counter(x["roleFromOfficialLabel"] for x in docs)
    output={
        "schemaVersion":1,
        "verifiedAtUtc":datetime.now(timezone.utc).isoformat(),
        "scope":"Domestic K12 government-released original PDFs in private storage only",
        "verifiedPdfCount":len(docs),
        "verifiedPdfBytes":sum(x["bytes"] for x in docs),
        "verifiedPdfPages":sum(x["pages"] for x in docs),
        "verifiedPdfByProvince":dict(sorted(Counter(x["province"] for x in docs).items())),
        "verifiedPdfByExamYear":dict(sorted(Counter(str(x["examYear"]) for x in docs).items())),
        "documentRoles":dict(roles),
        "imageOnlyFirstPageCount":sum(x["requiresImageOCR"] for x in docs),
        "pageByPageContentVerifiedCount":0,"structuredExamCount":0,"publicRedistributionLicenseVerifiedCount":0,
        "saleEnabledCount":0,
        "oversizeDeferred":download_deferred,
        "documents":sorted(docs,key=lambda x:(-x["examYear"],x["province"],x["fileName"])),
    }
    OUTPUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("K12_GOV_ORIGINALS_VERIFIED",output["verifiedPdfCount"],"bytes",output["verifiedPdfBytes"],"pages",output["verifiedPdfPages"])
    print("BY_PROVINCE",output["verifiedPdfByProvince"],"ROLES",output["documentRoles"])
    print("SCAN_FIRST_PAGE_NO_TEXT",output["imageOnlyFirstPageCount"],"OCR_REQUIRED")
    print("DEFERRED",len(download_deferred))
if __name__=="__main__":main()
