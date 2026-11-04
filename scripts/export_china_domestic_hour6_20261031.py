#!/usr/bin/env python3
"""Export validated public metadata for 2026-10-31 batch 6 without raw files."""
from pathlib import Path
from collections import Counter
from urllib.parse import urlsplit
import hashlib,json,os

BASE=Path("/mnt/disk1/Code/Kangaroo-Practice-Simulator/private/raw-source-archive/2024-2027")
PRIVATE=BASE/"domestic-first-20261031"/"batch-hour6-20261031"
REPO=Path(__file__).resolve().parents[1]
OUT=REPO/"data/discovery/china-sevenlines-hour6-20261031.json"
checkpoint=json.loads((PRIVATE/"source-files-and-failures.json").read_text(encoding="utf-8"))
old=json.loads((REPO/"data/discovery/china-official-source-harvest-20261031.json").read_text(encoding="utf-8"))
before_urls={x["originalUrl"] for x in old["files"]}
records=[]
for item in checkpoint["items"]:
    assert item["url"] not in before_urls
    entry={
     "id":item["id"],
     "sourceId":item["sourceId"],"sourceOwner":item["sourceOwner"],
     "sourcePage":item["sourcePage"],"originalUrl":item["url"],
     "title":item["title"],"lane":item["lane"],
     "year":item["examYear"],"kind":item["kind"],
     "state":item["status"],
     "sourceVerifiedBy": "published_university_or_government_page",
     "commercialSaleAuthorized":False,
     "qualityReviewStatus":"pending_content_review",
     "ocrStatus":"not_started",
    }
    if item["status"]=="downloaded":
        rel=item["storedRelativePath"]
        path=(BASE/rel).resolve(strict=True)
        assert path.is_file() and path.is_relative_to(PRIVATE.resolve())
        contents=path.read_bytes()
        assert hashlib.sha256(contents).hexdigest()==item["sha256"]
        assert len(contents)==item["sizeBytes"] and len(contents)>100
        kind=item["actualFormat"]
        assert (contents[:5]==b"%PDF-" if kind=="pdf" else contents[:3] in (b"CWS",b"FWS",b"ZWS"))
        if kind=="pdf":assert item["pageCount"]>0
        else:assert item["pageCount"] is None
        entry.update(format=kind,sha256=item["sha256"],
          sizeBytes=item["sizeBytes"],pageCount=item["pageCount"],
          privateRawArchived=True,
          originalExamVerified=False)
    else:
        entry.update(privateRawArchived=False,
          errorClass=item.get("error","unknown")[:175])
    records.append(entry)
counter=Counter(x["state"] for x in records)
format_counts=Counter(x.get("format") for x in records if x["state"]=="downloaded")
total_bytes=sum(x.get("sizeBytes",0) for x in records if x["state"]=="downloaded")
total_pdf_pages=sum(x.get("pageCount",0) or 0 for x in records)
raw_count=len([x for x in records if x["privateRawArchived"]])
public_leads=[
 {"lane":"school","year":2026,"status":"publisher_original_teaching_resource_lead_not_official_exam",
  "title":"吉林大学附属中学2026中考数学讲解及配套试题","sourcePage":"https://fszx.jlu.edu.cn/info/1127/3718.htm",
  "fileDownloaded":False},
 {"lane":"math-competition","year":2025,"status":"university_published_legacy_flash_attachments_archived",
  "title":"厦门大学2024-2025全国大学生数学竞赛赛卷、答案、SWF旧式载体","sourcePage":"https://gdjpkc.xmu.edu.cn/DocumentList.aspx?cID=22&dID=383",
  "fileDownloaded":True},
 {"lane":"language","year":2026,"status":"official_exam_notice_not_question_paper",
  "title":"2026下半年CET考试报名及最新时间","sourcePage":"https://www.neea.edu.cn/html1/report/2609/1-1.htm",
  "fileDownloaded":False},
 {"lane":"university","year":2027,"status":"official_2027_exam_scope_22_pdf_archived",
  "title":"北京交通大学2027年硕士研究生自命题范围及22份PDF附件",
  "sourcePage":"https://gs.bjtu.edu.cn/tzgg/qb/9e15037b484345b985f0aa603090682d.htm",
  "fileDownloaded":True},
 {"lane":"career","year":2026,"status":"official_technical_file_and_sample_lead_transport_tls_error",
  "title":"青岛2026电工职业技能赛技术文件及样题（DOCX）",
  "sourcePage":"https://www.xihaian.gov.cn/zwgk/bmgk/qsbj/gkml/gsgg/202608/t20260812_10699772.shtml",
  "fileDownloaded":False},
 {"lane":"professional","year":2026,"status":"official_2026_practice_question_bank_lead_not_downloaded",
  "title":"深圳2026餐厅服务员、客房服务员理论复习题库及技术文件",
  "sourcePage":"https://www.yantian.gov.cn/cn/service/ldjy/jytzgg/content/post_13001546.html",
  "fileDownloaded":False},
 {"lane":"interest","year":2026,"status":"official_public_assessment_index_not_question_file",
  "title":"人社部中国就业网职业兴趣测评（含简版霍兰德）",
  "sourcePage":"https://chinajob.mohrss.gov.cn/hlwzyzd/",
  "fileDownloaded":False}
]
assert {x["lane"] for x in public_leads}=={"school","math-competition","language","university","career","professional","interest"}
record={
 "schemaVersion":1,"batch":"2026-10-31-hour6","countryPriority":"CN",
 "retrievalMethod":"public_official_link_and_file_magic_verification",
 "priorPublicArchive":"data/discovery/china-official-source-harvest-20261031.json",
 "privateOriginals":"Z890 private/raw-source-archive/2024-2027/domestic-first-20261031/batch-hour6-20261031",
 "summary":{
  "candidates":len(records),"downloadedRawFiles":raw_count,
  "pdfOfficialSyllabusFiles":format_counts["pdf"],
  "swfAcademicCompetitionPreviews":format_counts["swf"],
  "failed":counter["failed"],"totalDownloadedBytes":total_bytes,
  "officialSyllabusPdfPageCount":total_pdf_pages,
  "confirmedExamPapersReadyForSale":0,
  "ocrTranscripts":0
 },
 "importantClassification":"2027 PDFs are syllabi/scope, not future exam papers; 2024-2025 SWF are university-hosted legacy previews, original exam completeness not validated.",
 "sevenLaneSourceResearch":public_leads,
 "files":records
}
OUT.parent.mkdir(exist_ok=True,parents=True)
OUT.write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("EXPORT",record["summary"])
print("YEARS",dict(Counter(x["year"] for x in records if x["privateRawArchived"])))
print("LANES",dict(Counter(x["lane"] for x in records if x["privateRawArchived"])))
print("SOURCE_FILE_HASHES_VERIFIED",raw_count)
