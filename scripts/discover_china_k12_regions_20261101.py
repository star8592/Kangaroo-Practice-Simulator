#!/usr/bin/env python3
"""Bounded public HTML school-exam source discovery, China regions only.

Never downloads exam documents, bypasses access controls, or upgrades link titles
to paper/archive/commercial statuses. Rerunnable with the existing hourly worker.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from collections import Counter
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/discovery/china-k12-region-source-leads-20261101.json"
BASELINE = ROOT / "data/discovery/china-k12-school-exam-priority-20261101.json"
SOURCES = [
    ("湖北", "武汉", "最新学科入口", "https://www.wh111.com/"),
    ("湖北", "武汉", "理化生", "https://www.wh111.com/lihuasheng/jingxuanshiti/"),
    ("湖北", "武汉", "八上历史与道法", "https://www.wh111.com/zhengshidi/jingxuanshiti/chuzhongzhengshi/bashangzhengshi/"),
    ("湖北", "武汉", "初中生物", "https://www.wh111.com/lihuasheng/jingxuanshiti/chuzhongshengwu/"),
    ("湖北", "武汉", "八年级物理期末", "https://www.wh111.com/lihuasheng/jingxuanshiti/chuzhongwuli/chuerwuliqimo/"),
    ("湖北", "全省", "2026中考", "https://www.hbjyzy.com/jiuxia/zkzt/"),
    ("江苏", "苏州", "中小学试卷", "https://www.szzx100.com/"),
    ("江苏", "南京", "学校试卷库", "https://www.zyjl.cn/nanjing/fileDown.html"),
    ("江苏", "全省", "跨市最新学科目录", "https://www.21cnjy.com/city/jiangsu/"),
    ("浙江", "全省", "初中科学", "https://www.jyeoo.com/science/report"),
    ("浙江", "杭州", "高一历史期末", "https://zujuan.zxls.com/PaperList.aspx?id=29424"),
    ("浙江", "全省", "跨市最新学科目录", "https://www.21cnjy.com/city/zhejiang/"),
    ("北京", "海淀", "高三期末九科", "https://app.gaokaozhitongche.com/newsexam/pc/mDN8LWmw"),
    ("上海", "全市", "2026中考多科", "https://app.gaokaozhitongche.com/newsexam/pc/aDBvJmVD"),
    ("上海", "全市", "中考考试院发布", "https://www.shmeea.edu.cn/page/03500/20260616/20351.html"),
    ("上海", "各区", "数学月考期中公开索引", "https://www.czsx.com.cn/sort.asp?AClassID=8&GClassID=0&NClassID=3"),
    ("广东", "深圳", "中考试卷资讯", "https://szzk.cn/"),
    ("广东", "广州深圳等", "跨市最新学科目录", "https://www.21cnjy.com/city/guangdong/"),
]
EXAM_TERMS = ("期中", "期末", "月考", "调考", "统考", "中考", "高考", "联考",
              "模考", "一模", "二模", "三模", "学业质量", "学情", "试卷", "试题")
K12_TERMS = ("小学", "初中", "中学", "高中", "一年级", "二年级", "三年级",
             "四年级", "五年级", "六年级", "七年级", "八年级", "九年级",
             "初一", "初二", "初三", "高一", "高二", "高三", "中考", "高考",
             "七上", "八上", "九上", "七下", "八下", "九下")
NOT_PAPER = ("预告", "考试安排", "考试时间", "分数线", "招生政策", "报名",
             "报考指南", "校历", "征集", "广告", "销售", "使用说明")
SUBJECTS = ("语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理",
            "道法", "政治", "科学")
def decode(data):
    choices = []
    for e in ("utf-8", "gb18030"):
        text = data.decode(e, "replace")
        score = sum(text.count(w) for w in ("试卷", "试题", "期中", "期末",
            "物理", "化学", "生物", "2026", "武汉", "江苏", "苏州"))
        choices.append((score, text, e))
    return max(choices, key=lambda x:x[0])[1:]

def canonical(href):
    v = urlsplit(href)
    if v.scheme not in ("https", "http") or not v.hostname:
        return None
    # no fragments, avoid query-driven repeats and tracking except on ASP/PHP-style sources
    return urlunsplit((v.scheme, v.netloc.lower(), v.path, v.query if v.path.lower().endswith((".aspx",".asp",".php")) else "", ""))

CITIES = ("武汉", "襄阳", "宜昌", "黄石", "孝感", "荆州", "黄冈", "十堰",
          "苏州", "南京", "无锡", "常州", "南通", "杭州", "宁波", "温州",
          "绍兴", "嘉兴", "金华", "北京", "上海", "广州", "深圳", "东莞",
          "佛山", "惠州", "中山", "汕头", "茂名")

def exam_kind(title):
    if "期末" in title:return "期末"
    if "期中" in title:return "期中"
    if "月考" in title or "10月考" in title or "9月考" in title:return "月考"
    if "调考" in title:return "调考"
    if "中考" in title:return "中考相关（真题待核）"
    if "高考" in title:return "高考相关（真题待核）"
    if "联考" in title:return "联考"
    if "模考" in title or "模拟" in title:return "模拟（非正式卷）"
    return "其他待核"
def inspect(source):
    province, city, label, url = source
    record = {"province":province,"city":city,"label":label,"url":url,
              "retrieved":False,"httpStatus":None,"pageSha256":None,
              "htmlBytes":0,"candidateLinks":0,"error":None}
    links = []
    try:
        req = Request(url, headers={"User-Agent":"Mozilla/5.0 (SOCTHINK school-paper source research)"})
        with urlopen(req,timeout=12) as resp:
            if resp.status!=200:raise ValueError(f"HTTP_{resp.status}")
            ctype=resp.headers.get("Content-Type","")
            if "html" not in ctype.lower() and not ctype.startswith("text/"):
                raise ValueError("not html "+ctype[:55])
            data = resp.read(300001)
        if len(data)>300000: data=data[:300000] # only link-index research
        text, encoding = decode(data)
        soup=BeautifulSoup(text,"html.parser")
        title=soup.title.get_text(" ",strip=True) if soup.title else ""
        record.update(retrieved=True,httpStatus=200,pageSha256=hashlib.sha256(data).hexdigest(),
                      htmlBytes=len(data),pageTitle=title[:120],encoding=encoding)
        seen=set()
        for a in soup.find_all("a",href=True):
            name=a.get_text(" ",strip=True)
            if len(name)<9 or len(name)>180 or "2026" not in name:
                continue
            if not any(t in name for t in EXAM_TERMS):
                continue
            if not any(t in name for t in K12_TERMS):
                continue
            if any(t in name for t in NOT_PAPER):
                continue
            full=canonical(urljoin(url,a["href"]))
            if not full or urlsplit(full).hostname!=urlsplit(url).hostname:
                continue
            if full in seen or full==url:continue
            seen.add(full)
            publication=re.search(r"/(202\d{1}-\d\d-\d\d)/",full)
            subjects=[x for x in SUBJECTS if x in name]
            # Ambiguity: "2025-2026" alone is an academic-year mention, not an exam date.
            pubdate=publication.group(1) if publication else None
            if "2025-2026" in name and pubdate and pubdate >= "2026-08-01":
                warning="2025-2026_title_with_2026_autumn_publication_check_actual_exam_year"
            elif "2025-2026" in name and not pubdate:
                warning="academic_year_from_title_not_exam_date"
            else:
                warning=None
            is_fall = any(t in name for t in ("2026-2027","2026—2027","2026~2027"))
            real_candidate = any(t in name for t in ("期中","月考","10月","阶段检测","学情自测","质量检测","调考")) and not any(t in name for t in ("模拟","押题","冲刺","考前","仿真","复习","专项训练","模拟卷"))
            review_tier = "2026_fall_school_event_candidate_not_verified" if is_fall and real_candidate else "supplemental_or_date_ambiguous"
            links.append({
                "reviewTier":review_tier,
                "sourceGeoOnlyNotVerifiedExamGeo":True,
                "id":"reg-"+hashlib.sha256(full.encode()).hexdigest()[:18],
                "sourcePage":url,
                "pageUrl":full,
                "province":province,
                "city":city,  # catalog location, NOT verified exam origin
                "examCityFromTitle": next((v for v in CITIES if v in name),None),
                "title":name,
                "publicationDateFromUrl": pubdate,
                "examDate":None,
                "schoolVerified":False,"examEventVerified":False,
                "subjectHintsFromTitle":subjects,
                "examTypeFromTitle":exam_kind(name),
                "isPublishedOriginalExam":False,
                "isPaperFileDownloaded":False,
                "isAnswerFileDownloaded":False,
                "legalRedistributionVerified":False,
                "qualityWarning":warning,
                "state":"public_link_title_only"
            })
        record["candidateLinks"]=len(links)
    except Exception as e:
        record["error"]=type(e).__name__+":"+str(e)[:160]
    return record,links

def main():
    with ThreadPoolExecutor(max_workers=4) as ex:
        results=list(ex.map(inspect,SOURCES))
    known = json.loads(BASELINE.read_text(encoding="utf-8"))
    existing={x["sourceUrl"] for x in known["priorityQueue"]}
    unique={}
    for source, links in results:
        for row in links:
            if row["pageUrl"] not in unique:unique[row["pageUrl"]]=row
    all_links=list(unique.values())
    for row in all_links:row["alreadyInWuhan433Index"]=row["pageUrl"] in existing
    all_links.sort(key=lambda v:(v["province"],v["city"],v["pageUrl"]))
    count=Counter(r["province"] for r in all_links)
    output={
        "schemaVersion":1,
        "createdAtUtc":datetime.now(timezone.utc).isoformat(),
        "scope":"CHINA K12 ONLY; public link title evidence; NOT complete school exam files",
        "geoCaution":"city is the catalog's source area, examCityFromTitle only a clue; actual school exam place not verified",
        "sourcePageCount":len(SOURCES),
        "sourcePagesFetched":sum(r[0]["retrieved"] for r in results),
        "sourcePagesFailed":sum(not r[0]["retrieved"] for r in results),
        "uniqueNewCandidateLinksVsWuhan433":sum(x["pageUrl"] not in existing for x in all_links),
        "uniqueSourceCandidateLinks":len(all_links),
        "totalOriginalExamFilesDownloaded":0,
        "verifiedExamPapers":0,
        "regionalCount":dict(sorted(count.items())),
        "currentFallCandidateLinks":sum(x["reviewTier"]=="2026_fall_school_event_candidate_not_verified" for x in all_links),
        "currentFallCandidateByRegion":dict(sorted(Counter(x["province"] for x in all_links if x["reviewTier"]=="2026_fall_school_event_candidate_not_verified").items())),
        "sourcePages":[r[0] for r in results],
        "candidateLinks":all_links,
    }
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("REGIONS_SOURCE_FETCH",output["sourcePagesFetched"],"/",len(SOURCES),
          "new_leads",output["uniqueNewCandidateLinksVsWuhan433"],
          "unique_leads",len(all_links),"official_papers",output["verifiedExamPapers"])
    print("REGION_COUNTS",json.dumps(output["regionalCount"],ensure_ascii=False))
    for page in output["sourcePages"]:
        if page["error"]:print("SOURCE_FAILED",page["province"],page["city"],page["error"])
    for row in sorted((x for x in all_links if x["pageUrl"] not in existing),
        key=lambda v:(v["publicationDateFromUrl"] or ""),reverse=True)[:8]:
        print("NEW_LEAD",row["province"],row["city"],row["title"][:74],row["pageUrl"])

if __name__=="__main__":
    main()
