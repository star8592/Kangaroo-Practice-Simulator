#!/usr/bin/env python3
"""Regression for hour6 public metadata; never counts leads as downloaded exams."""
from pathlib import Path
from collections import Counter
from urllib.parse import urlsplit
import json
import re
root=Path(__file__).resolve().parents[1]
p=root/"data/discovery/china-sevenlines-hour6-20261031.json"
d=json.loads(p.read_text(encoding="utf-8"))
assert d["batch"]=="2026-10-31-hour6"
summ=d["summary"]
assert summ["candidates"]==38
assert summ["downloadedRawFiles"]==37
assert summ["pdfOfficialSyllabusFiles"]==22
assert summ["swfAcademicCompetitionPreviews"]==15
assert summ["failed"]==1
assert summ["officialSyllabusPdfPageCount"]==212
assert summ["totalDownloadedBytes"]>10000000
assert summ["confirmedExamPapersReadyForSale"]==0
assert summ["ocrTranscripts"]==0
files=d["files"]
assert len(files)==38
assert len({i["originalUrl"] for i in files})==len(files)
assert {i["sourceId"] for i in files}=={"bjtu-2027","xmu-2025-and-2024","mohrss-2024"}
assert all(i["originalUrl"].startswith("https://") for i in files)
assert all(i["sourcePage"].startswith("https://") for i in files)
assert all(not i["commercialSaleAuthorized"] for i in files)
assert all(i["qualityReviewStatus"]=="pending_content_review" for i in files)
assert all(i["ocrStatus"]=="not_started" for i in files)
raw=[x for x in files if x["state"]=="downloaded"]
assert len(raw)==37
assert all(x["privateRawArchived"] and re.fullmatch(r"[0-9a-f]{64}",x["sha256"]) for x in raw)
assert all(x["sizeBytes"]>100 for x in raw)
pdf=[x for x in raw if x["format"]=="pdf"]
swf=[x for x in raw if x["format"]=="swf"]
assert len(pdf)==22
assert len(swf)==15
assert all(x["year"]==2027 and x["pageCount"]>0 and x["kind"]=="official_exam_scope_not_paper" for x in pdf)
assert all(x["year"] in (2024,2025) and x["pageCount"] is None for x in swf)
assert all(x["originalExamVerified"] is False for x in raw)
assert Counter(x["year"] for x in swf)=={2024:7,2025:8}
assert Counter(x["year"] for x in pdf)=={2027:22}
failed=[x for x in files if x["state"]=="failed"]
assert len(failed)==1 and failed[0]["sourceId"]=="mohrss-2024"
assert failed[0]["privateRawArchived"] is False
leads=d["sevenLaneSourceResearch"]
assert len(leads)==7
assert {x["lane"] for x in leads}=={"school","math-competition","language","university","career","professional","interest"}
assert all(x["sourcePage"].startswith("https://") for x in leads)
assert all(x["status"] and "fileDownloaded" in x for x in leads)
assert "/mnt/disk1" not in json.dumps(d)
before=json.loads((root/"data/discovery/china-official-source-harvest-20261031.json").read_text())
old={x["originalUrl"] for x in before["files"]}
assert all(x["originalUrl"] not in old for x in files)
print("CHINA_SEVEN_LANE_HOUR6_METADATA_TEST=PASS","files",len(raw),
      "pdfs",len(pdf),"swf_previews",len(swf),"pdf_pages",summ["officialSyllabusPdfPageCount"],
      "source_leads",len(leads))
