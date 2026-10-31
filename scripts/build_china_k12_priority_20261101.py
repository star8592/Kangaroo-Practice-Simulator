#!/usr/bin/env python3
"""Build the K12 school-exam priority queue from already discovered public listings.

Metadata-only. Never converts a listing, a marketing 'paper', or an announcement
into a verified exam, a saved file, or a saleable product.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DISCOVERY = ROOT / "data/discovery"
OLD = DISCOVERY / "wuhan-grade6-thirdparty-index-20261031.json"
NEW = DISCOVERY / "wuhan-k12-expanded-index-20261031.json"
OUTPUT = DISCOVERY / "china-k12-school-exam-priority-20261101.json"

SUBJECTS = ("语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理",
            "道德与法治", "思想政治", "科学", "信息科技")
EXAMS = (
    ("中考真题", ("中考真题", "中考试题", "中考数学", "中考英语", "中考语文")),
    ("高考真题", ("高考真题", "高考试题")),
    ("期末", ("期末",)),
    ("期中", ("期中",)),
    ("调考（行政级别待核）", ("四调", "三调", "元调", "五调", "调研考试", "区调", "调考", "统考")),
    ("联考", ("联考", "联盟", "联合考试")),
    ("月考", ("月考", "独立作业", "阶段检测", "阶段测试")),
    ("单元", ("单元",)),
    ("模拟", ("模拟", "一模", "二模", "三模")),
)
GRADE_LABEL = {
    **{f"G{i}": f"小学{i}年级" for i in range(1, 7)},
    "G9_EN": "初中9年级",
    "G9_MATH": "初中9年级",
    "XSC": "小升初候选（未核实学段）",
}
DISTRICTS = ("武昌", "东湖高新", "江岸", "江汉", "汉阳", "硚口", "青山",
             "洪山", "东西湖", "黄陂", "江夏", "蔡甸", "新洲", "经开", "汉南")

def classify_exam(title: str) -> str:
    for kind, patterns in EXAMS:
        if any(p in title for p in patterns):
            return kind
    return "待核考试类型"

def normalize(item: dict, *, grade: str) -> dict:
    title = item["title"].strip()
    url = item["pageUrl"]
    assert urlparse(url).hostname == "www.wh111.com"
    published = item.get("publicationDateFromUrl") or re.search(r"/(202[456]-\d\d-\d\d)/", url).group(1)
    subject = item.get("subject", "其他")
    if subject == "other":
        subject = "其他"
    school_years = re.search(r"(202[3456])\s*[-—~至]\s*(202[4567])\s*学年", title)
    if not school_years:
        school_years = re.search(r"(202[3456])\s*[-—~至]\s*(202[4567])\s*学年度", title)
    academic_year = f"{school_years.group(1)}-{school_years.group(2)}" if school_years else None
    exam_type = classify_exam(title)
    district = item.get("district") or next((d for d in DISTRICTS if d in title), None)
    original_status = "listing_only_not_downloaded"
    doc_kind = item.get("docKind")
    excluded = (doc_kind in ("answer_only", "mp3_or_audio_lead")
                or any(z in title for z in ("考点梳理", "补缺手册", "知识清单", "复习资料", "专项训练"))
                or not any(z in title for z in ("试卷", "试题", "调考", "期中", "期末", "中考", "测评", "联考", "独立作业")))
    # Only published years are used for freshness; an academic year ending 2027 is not an exam in 2027.
    year = int(published[:4])
    score = {2026: 80, 2025: 49, 2024: 25}.get(year, 0)
    score += {"期末": 25, "期中": 26, "调考（行政级别待核）": 26,
              "中考真题": 32, "高考真题": 32, "联考": 18, "月考": 14,
              "模拟": 12, "单元": 8}.get(exam_type, 0)
    if district: score += 12
    if subject in SUBJECTS: score += 7
    if published >= "2026-09-01": score += 15
    if "答案" in title or "含标答" in title: score += 5
    temporal_warning = bool(
        academic_year and (
            year > int(academic_year[-4:]) or (
                "上学期" in title and year == int(academic_year[-4:])
                and published >= f"{year}-09-01"
            )
        )
    )
    if temporal_warning: score -= 25
    if excluded: score -= 100
    return {
        "id": "k12-" + hashlib.sha256(url.encode()).hexdigest()[:18],
        "title": title,
        "sourceUrl": url,
        "sourceCategory": "third_party_public_listing_not_exam_authority",
        "province": "湖北省", "city": "武汉市",
        "districtFromTitle": district,
        "schoolFromTitle": None,  # Explicit school name is still unverified.
        "grade": GRADE_LABEL.get(grade, grade),
        "subject": subject,
        "examTypeInferredFromTitle": exam_type,
        "examLevel": "unverified_from_title", # district name != proof of district-level unified exam.
        "academicYearFromTitle": academic_year,
        "publicationDateFromUrl": published,
        "actualExamDate": None,
        "examYearVerified": None,
        "examAlreadyHeldVerified": False,
        "temporalWarning": "academic_year_and_fall_publication_appear_inconsistent" if temporal_warning else None,
        "isOriginalSchoolOrAuthorityPaperVerified": False,
        "paperFileDownloaded": False,
        "answerFileDownloaded": False,
        "allPagesChecked": False,
        "rightsStatus": "unknown",
        "candidateForManualSourceReview": not excluded,
        "priorityScore": score,
        "state": original_status,
    }

def main() -> None:
    old = json.loads(OLD.read_text(encoding="utf8"))
    new = json.loads(NEW.read_text(encoding="utf8"))
    assert len(old["items"]) == 99 and len(new["items"]) == 334
    combined = {}
    for item in old["items"]:
        combined[item["pageUrl"]] = normalize(item, grade="G6")
    for item in new["items"]:
        assert item["pageUrl"] not in combined
        combined[item["pageUrl"]] = normalize(item, grade=item["gradeGroup"])
    assert len(combined) == 433
    ordered = sorted(combined.values(), key=lambda x: (-x["priorityScore"], -int(x["publicationDateFromUrl"].replace("-", "")), x["sourceUrl"]))
    qualified = [x for x in ordered if x["candidateForManualSourceReview"]]
    output = {
        "schemaVersion": 1, "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "goal": "China domestic primary/middle/high-school term, district/city/province exams and national entrance exams. Current K12 Wuhan indices are leads only.",
        "sourceIndexes": [str(OLD.relative_to(ROOT)), str(NEW.relative_to(ROOT))],
        "totalKnownUniqueListingUrls": len(ordered),
        "eligibleForSourceReview": len(qualified),
        "excludedNonPaperOrAmbiguousListings": len(ordered) - len(qualified),
        "originalSchoolPapersDownloadedFromTheseIndexes": 0,
        "verifiedOriginalExamPapersFromTheseIndexes": 0,
        "publishedYearCounts": dict(Counter(x["publicationDateFromUrl"][:4] for x in ordered)),
        "candidateExamTypeCounts": dict(Counter(x["examTypeInferredFromTitle"] for x in qualified)),
        "candidateSubjectCounts": dict(Counter(x["subject"] for x in qualified)),
        "candidateGradeCounts": dict(Counter(x["grade"] for x in qualified)),
        "criticalMissingSubjects": ["物理", "化学", "生物", "历史", "地理", "道德与法治", "思想政治", "科学"],
        "knownCoverageLimit": "Only G1-G6, some XSC/G9-Math/G9-English metadata from a third-party site; no verified physical papers, no G7/G8/high-school across-subject coverage.",
        "priorityQueue": ordered,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print("K12_PRIORITY_INDEX=PASS", len(ordered), "review", len(qualified), "discard", len(ordered)-len(qualified))
    print("K12_TYPE_COUNTS", json.dumps(output["candidateExamTypeCounts"], ensure_ascii=False))
    print("K12_SUBJECT_COUNTS", json.dumps(output["candidateSubjectCounts"], ensure_ascii=False))
    for row in qualified[:8]:
        print("TOP",row["priorityScore"],row["publicationDateFromUrl"],row["title"][:74],row["sourceUrl"])

if __name__ == "__main__":
    main()
