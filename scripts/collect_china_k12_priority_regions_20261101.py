#!/usr/bin/env python3
"""China-only K12 current school and regional exam source discovery.

Bounded, public index pages only. This NEVER downloads underlying paper files,
follows paid download buttons, or asserts an exam/answer has been validated.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/discovery/china-k12-priority-regions-live-20261101.json"
PRIORITY = ROOT / "data/discovery/china-k12-school-exam-priority-20261101.json"

REGIONS = [
    {"key": "wuhan_hubei", "label": "武汉/湖北", "priority": 1, "locations": ["武汉","黄冈","襄阳","孝感","宜昌","随州","荆州","黄石"]},
    {"key": "jiangsu", "label": "江苏", "priority": 2, "locations": ["南京","苏州","无锡","常州","南通","扬州","镇江","盐城","徐州"]},
    {"key": "zhejiang", "label": "浙江", "priority": 2, "locations": ["杭州","宁波","温州","绍兴","嘉兴","金华","湖州","台州"]},
    {"key": "beijing", "label": "北京", "priority": 3, "locations": ["海淀","西城","东城","朝阳","丰台","石景山","通州"]},
    {"key": "shanghai", "label": "上海", "priority": 3, "locations": ["徐汇","黄浦","静安","浦东","杨浦","闵行","长宁"]},
    {"key": "guangdong", "label": "广东", "priority": 3, "locations": ["广州","深圳","东莞","佛山","中山","珠海","惠州"]}
]
SUBJECTS = ["语文", "数学", "英语", "物理", "化学", "生物", "政治", "历史", "地理",
            "道法", "科学", "综合", "信息科技"]
EXAM_WORDS = ["试卷", "试题", "月考", "期末", "期中", "调考", "联考", "学情", "摸底",
              "供题", "质量检测", "考试", "中考", "高考", "检测", "一模", "二模", "三模"]
YEAR_MONTH = re.compile(r"/(2026)-(0[89]|10|11|12)-\d\d/")
ARTICLES = [
    ("wuhan-current-home", "wuhan_hubei", "https://www.wh111.com/"),
    ("wuhan-grade9-physics", "wuhan_hubei", "https://www.wh111.com/lihuasheng/jingxuanshiti/chuzhongwuli/chusanwuliyuekao/index.html"),
    ("wuhan-high-school-math", "wuhan_hubei", "https://www.wh111.com/shuxue/jingxuanshiti/gaozhongshuxue/"),
]
EVENT_HUBS = [
    {"region":"wuhan_hubei","name":"武汉2026届高三四调九科入口","url":"https://app.gaokaozhitongche.com/newsexam/pc/Ew5L5nZM","examType":"高三调考","actualExamDate":"2026-04-27","sourceType":"third_party_media_hub","rightsStatus":"unknown"},
    {"region":"jiangsu","name":"江苏苏北七市2026届高三一模九科","url":"https://app.gaokaozhitongche.com/newsexam/pc/AwombvGD","examType":"高三一模","actualExamDate":"2026-01-28","sourceType":"third_party_media_hub","rightsStatus":"unknown"},
    {"region":"zhejiang","name":"浙江杭州2026届高三二模各科","url":"https://newtest.zqy.com/taoti/2119595.html","examType":"高三二模","actualExamDate":None,"sourceType":"licensed_education_provider_hub","rightsStatus":"third_party_exclusive"},
    {"region":"zhejiang","name":"浙江学校2026年秋季中小学多学科索引","url":"https://www.21cnjy.com/city/zhejiang/index/","examType":"校内月考/期中","actualExamDate":None,"sourceType":"third_party_resource_index","rightsStatus":"unknown"},
    {"region":"beijing","name":"北京海淀2026高三期末各科汇总","url":"https://app.gaokaozhitongche.com/newsexam/pc/mDN8LWmw","examType":"高三期末","actualExamDate":"2026-01-19","sourceType":"third_party_media_hub","rightsStatus":"unknown"},
    {"region":"beijing","name":"北京海淀2026高三二模各科汇总","url":"https://app.gaokaozhitongche.com/newsexam/pc/7w9y227w","examType":"高三二模","actualExamDate":"2026-05-06","sourceType":"third_party_media_hub","rightsStatus":"unknown"},
    {"region":"shanghai","name":"上海徐汇2026届高三一模各科","url":"https://app.gaokaozhitongche.com/newsexam/pc/2DZ16N5g","examType":"高三一模","actualExamDate":"2025-12-09","sourceType":"third_party_media_hub","rightsStatus":"unknown"},
    {"region":"shanghai","name":"上海黄浦2026届高三一模各科","url":"https://app.gaokaozhitongche.com/newsexam/pc/aD3eKnZw","examType":"高三一模","actualExamDate":"2025-12-04","sourceType":"third_party_media_hub","rightsStatus":"unknown"},
    {"region":"guangdong","name":"广东各地2026届高三期中/期末/模拟汇总","url":"https://app.gaokaozhitongche.com/news/h/YzrEb342","examType":"高三多种考试","actualExamDate":None,"sourceType":"third_party_media_hub","rightsStatus":"unknown"},
    {"region":"guangdong","name":"广州2026届高三一模九科试卷目录","url":"https://m.21cnjy.com/store/340314.shtml","examType":"高三一模","actualExamDate":None,"sourceType":"paid_resource_hub","rightsStatus":"paid_download"}
]

def url_clean(base: str, href: str) -> str | None:
    u = urlparse(urljoin(base, href))
    if u.scheme != "https" or u.hostname not in ("www.wh111.com", "wh111.com"):
        return None
    return urlunparse((u.scheme, "www.wh111.com", u.path, "", "", ""))

def decode_website(raw: bytes) -> str:
    choices = []
    for encoding in ("gb18030", "utf-8"):
        txt = raw.decode(encoding, errors="replace")
        quality = sum(txt.count(x) for x in ("2026", "试卷", "数学", "期中", "英语", "物理"))
        bad = txt.count("\ufffd") * 3
        choices.append((quality - bad, txt))
    return max(choices, key=lambda x:x[0])[1]

def grade_path_conflict(url: str, title: str) -> bool:
    path_grade = {"yinianji":1,"ernianji":2,"sannianji":3,"sinianji":4,
                  "wunianji":5,"liunianji":6}
    grade = next((i for segment, i in path_grade.items() if f"/{segment}/" in url), None)
    named = re.search(r"([一二三四五六])年级", title)
    if grade is None or not named:
        return False
    chinese_to_num = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6}
    return grade != chinese_to_num[named.group(1)]

def year_label_conflict(title: str, url_date: str) -> bool:
    years = re.search(r"(202[3456])\s*[-—~至]\s*(202[4567])\s*学年",title)
    if not years: return False
    publication_year = int(url_date[:4])
    start, end = int(years.group(1)), int(years.group(2))
    return (publication_year > end or (publication_year == end and
            ("上学期" in title or "第一学期" in title) and url_date[5:7] in ("09","10","11","12")))

def classify(title: str) -> dict:
    subject = [s for s in SUBJECTS if s in title]
    if "理化" in title: subject = ["物理", "化学"]
    if "政史" in title: subject = ["政治","历史"]
    if any(k in title for k in ("音频","MP3","听力MP3")): kind = "audio_only"
    elif any(k in title for k in ("手写答案","评分标准","参考答案")) and not "试卷" in title and not "试题" in title:
        kind = "answer_only"
    elif any(k in title for k in ("针对训练","专项训练","复习手册","知识清单","模拟试卷","模拟卷","校本作业")):
        kind = "practice_or_mock_claim"
    else: kind = "paper_claim_unverified"
    types = ["期中", "期末", "月考", "调考", "联考", "质量检测", "中考", "高考", "独立作业", "摸底", "阶段检测"]
    exam_kind = next((x for x in types if x in title), "待核实")
    return {"subjectsInTitle":subject, "documentKind":kind, "examTypeFromTitle":exam_kind}

def run() -> None:
    known = set()
    if PRIORITY.exists():
        old = json.loads(PRIORITY.read_text(encoding="utf-8"))
        known = {x["sourceUrl"] for x in old["priorityQueue"]}
    entries = {}
    scans = []
    for seed, region, url in ARTICLES:
        record={"sourceId":seed,"region":region,"url":url}
        try:
            res = requests.get(url, headers={"User-Agent":"Mozilla/5.0 (SOCTHINK China K12 exam-index research)"},timeout=17)
            res.raise_for_status()
            if len(res.content) > 2_000_000: raise ValueError("Oversized public index")
            soup = BeautifulSoup(decode_website(res.content), "html.parser")
            matched = 0
            for a in soup.select("a[href]"):
                title = a.get_text(" ",strip=True)
                link = url_clean(url,a.get("href",""))
                if not link or not YEAR_MONTH.search(link) or len(title)<11 or len(title)>175: continue
                if not ("2026" in title or "2027届" in title): continue
                if not any(t in title for t in EXAM_WORDS): continue
                if link in entries: continue
                when = re.search(r"/(\d{4}-\d\d-\d\d)/",link).group(1)
                item={"sourceUrl":link,"title":title,"region":region,"sourceId":seed,
                      "pagePublicationDateFromUrl":when,"originalExamDate":None,
                      "examYearVerified":None,"examLevelVerified":False,"paperFileDownloaded":False,
                      "answerFileDownloaded":False,"rightsStatus":"unknown",
                      "paperVerified":False,"state":"third_party_index_only",
                      "presentInOld433K12Listings":link in known,
                      "gradeDirectoryVsTitleConflict":grade_path_conflict(link,title),
                      "academicYearVsPublicationWarning":year_label_conflict(title,when),
                      "actualPdfLinkAccessible":False,
                      "downloadMethodValidated":False}
                item.update(classify(title))
                entries[link]=item;matched+=1
            record.update({"httpStatus":res.status_code,"newArticleCandidatesOnPage":matched,"scanState":"success"})
        except Exception as ex:
            record.update({"scanState":"failed","reason":f"{type(ex).__name__}: {str(ex)[:170]}"})
        scans.append(record)
    newest = sorted(entries.values(),key=lambda x:(x["pagePublicationDateFromUrl"],x["sourceUrl"]),reverse=True)
    extra = [x for x in newest if not x["presentInOld433K12Listings"]]
    hubs=[]
    for h in EVENT_HUBS:
        hub=dict(h)
        hub.update({"state":"web_researched_source_hub_only","originalPaperFilesDownloaded":0,"verifiedPaperCount":0,
                    "subjectLinksChecked":False,"provenance":"2026-11-01 web-source lookup, not a physical paper"})
        hubs.append(hub)
    result={
        "schemaVersion":1,"generatedUtc":datetime.now(timezone.utc).isoformat(),
        "scope":"100 percent China K12 domestic, foreign source collection temporarily paused",
        "regionPriorities":REGIONS,
        "indexScans":scans,
        "sourceHubs":hubs,
        "rawPublicListingCount":len(newest),
        "alreadyIndexedAmong433":sum(x["presentInOld433K12Listings"] for x in newest),
        "additionalPublicListingUrlsVs433":len(extra),
        "additionalByDocumentKind":dict(Counter(x["documentKind"] for x in extra)),
        "gradePathTitleConflictCount":sum(x["gradeDirectoryVsTitleConflict"] for x in newest),
        "yearLabelPublicationWarningCount":sum(x["academicYearVsPublicationWarning"] for x in newest),
        "additionalBySubject":dict(Counter(s for x in extra for s in x["subjectsInTitle"])),
        "additionalByPublicationDate":dict(Counter(x["pagePublicationDateFromUrl"] for x in extra)),
        "newExamOriginalFilesDownloaded":0,"newExamPaperWithPagesVerified":0,
        "newExamAnswersDownloaded":0,"newSaleablePapers":0,
        "warnings":["School year/graduate cohort != exam date", "Some titles say mock, exercises or only audio; do not call those original exams",
                    "Source hubs count as hub links, not one paper per listed subject",
                    "Ministry of Education 2025 rule: G1/G2 no paper-based exams; regional joint exams forbidden for non-graduating K12 years; classify seller labels as unverified",
                    "Do not circumvent site login, download points, paywall or exclusive rights"],
        "items":newest
    }
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("REGIONAL_CHINA_K12_DISCOVERY=PASS",
          "total",len(newest),"new_vs_433",len(extra),"hubs",len(hubs),
          "scan_success",sum(x["scanState"]=="success" for x in scans))
    print("NEW_BY_SUBJECT",json.dumps(result["additionalBySubject"],ensure_ascii=False))
    print("NEW_BY_KIND",json.dumps(result["additionalByDocumentKind"],ensure_ascii=False))
    for x in extra[:9]:print("FRESH",x["pagePublicationDateFromUrl"],x["title"][:77],x["sourceUrl"])

if __name__=="__main__":run()
