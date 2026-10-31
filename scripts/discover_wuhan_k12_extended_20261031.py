#!/usr/bin/env python3
"""Bounded Wuhan K12 listing discovery (only public index/title metadata).

No login, media extraction, paywall interaction, or paid document copying.
Separate listing leads from verified school-issued original files.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime,timezone
import hashlib,json,re,time
from pathlib import Path
from urllib.parse import urljoin,urlsplit,urlunsplit
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT/"data/discovery/wuhan-grade6-thirdparty-index-20261031.json"
DEST=ROOT/"data/discovery/wuhan-k12-expanded-index-20261031.json"
BASE="https://www.wh111.com"
PAGES=[
 ("G1","/xiaoxue/yinianji/",2),
 ("G2","/xiaoxue/ernianji/",2),
 ("G3","/xiaoxue/sannianji/",2),
 ("G4","/xiaoxue/sinianji/",2),
 ("G5","/xiaoxue/wunianji/",2),
 ("XSC","/xiaoxue/xiaoxuejingsai/",2),
 ("G9_EN","/yingyu/jingxuanshiti/chuzhongyingyu/chusanyingyuqimo/",2),
 ("G9_MATH","/shuxue/jingxuanshiti/chuzhongshuxue/chusanshuxue/jiuxiashuxuediaokao/",2),
]
DISTRICTS=("武昌","东湖","江岸","江汉","汉阳","硚口","青山","洪山","东西湖","黄陂","江夏","蔡甸","新洲","经开","汉南")
EXAM_TYPES=("元调","四调","五调","期中","期末","毕业","月考","单元","小升初","游园","选拔","模拟","真题","测评","中考","检测","联考","调考")
def normalized_url(href:str)->str:
    url=urljoin(BASE,href)
    p=urlsplit(url)
    if p.hostname not in ("www.wh111.com","wh111.com") or p.scheme!="https":
        raise ValueError("Unexpected URL")
    return urlunsplit((p.scheme,"www.wh111.com",p.path,"",""))
def read(url):
    with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (SOCTHINK public exam index research)"}),timeout=16) as r:
        raw=r.read(2000000)
    if len(raw)>2000000:raise ValueError("Oversized index page")
    choices=[]
    for enc in ("utf-8","gb18030"):
        try:
            decoded=raw.decode(enc)
        except UnicodeDecodeError:
            continue
        score=sum(decoded.count(term) for term in ("试卷","试题","数学","英语","语文","元调","武汉","年级","期末","小升初"))
        choices.append((score,decoded,enc))
    if not choices:raise ValueError("Could not decode page as UTF-8 or GB18030")
    _,decoded,encoding=max(choices,key=lambda x:x[0])
    return BeautifulSoup(decoded,"html.parser")
def classify(label,grade,pub_year):
    subject="英语" if "英语" in label or "听力" in label else ("数学" if "数学" in label else ("语文" if "语文" in label else ("物理" if "物理" in label else ("化学" if "化学" in label else "其他"))))
    kind="mp3_or_audio_lead" if ("MP3" in label.upper() or "听力" in label and "录音" in label) else ("answer_only" if "答案" in label and not "含答案" in label and not "试卷" in label else "exam_or_practice_listing")
    tags=[s for s in EXAM_TYPES if s in label]
    district=next((d for d in DISTRICTS if d in label),None)
    ys=sorted({int(y) for y in re.findall(r"(?<!\d)20(?:24|25|26|27)(?!\d)",label)})
    return {"subject":subject,"district":district,"topicTags":tags,"docKind":kind,
            "yearsMentioned":ys,"publicationYear":pub_year}
def main():
    old=json.loads(OLD.read_text(encoding="utf8"))
    prior={normalized_url(x["pageUrl"]) for x in old["items"]}
    rows={}
    pages=[]
    errors=[]
    for grade,folder,n in PAGES:
        for page in range(1,n+1):
            url=BASE+folder+(f"index_{page}.html" if page>1 else "")
            try:
                soup=read(url)
                matches=0
                for a in soup.find_all("a",href=True):
                    title=a.get_text(" ",strip=True)
                    if len(title)<8:continue
                    try:link=normalized_url(a["href"])
                    except ValueError:continue
                    route=urlsplit(link).path
                    m=re.search(r"/(202[456])-\d{2}-\d{2}/\d+\.html$",route)
                    if not m:continue
                    pub=int(m.group(1))
                    if "/"+folder.strip("/")+"/" not in route:
                        continue
                    if not any(t in title for t in EXAM_TYPES) and not any(x in title for x in ("试卷","试题","答案","听力")):
                        continue
                    info=classify(title,grade,pub)
                    item={
                     "id":"whk12-"+hashlib.sha256(link.encode()).hexdigest()[:19],
                     "gradeGroup":grade,
                     "title":title[:200],"pageUrl":link,
                     "sourceListingUrl":url,
                     "publishedYear":pub,
                     **info,
                     "state":"third_party_public_listing_only",
                     "actualExamFileDownloaded":False,
                     "schoolIssuedOriginalVerified":False,
                     "commercialRedistributionAllowed":False,
                     "rightsStatus":"unknown"
                    }
                    rows.setdefault(link,item)
                    matches+=1
                pages.append({"grade":grade,"url":url,"resultCount":matches})
                print("WUHAN_INDEX",grade,page,"ITEMS",matches,flush=True)
            except Exception as exc:
                errors.append({"grade":grade,"url":url,
                   "error":f"{type(exc).__name__}: {str(exc)[:160]}"})
                print("WUHAN_INDEX_FAILED",grade,page,type(exc).__name__,flush=True)
            time.sleep(.75)
    news=[x for u,x in rows.items() if u not in prior]
    combined=prior|set(rows)
    by_grade=Counter(x["gradeGroup"] for x in news)
    by_subject=Counter(x["subject"] for x in news)
    by_district=Counter(x["district"] or "未标区" for x in news)
    d={
      "schemaVersion":1,"collectedAtUtc":datetime.now(timezone.utc).isoformat(timespec="seconds"),
      "source":"https://www.wh111.com/",
      "scope":"Wuhan K12 first-party published archive of third-party listing URLs; no access to original restricted files",
      "priorGrade6Items":len(prior),
      "scannedIndexPages":len(pages),"failedIndexPages":len(errors),
      "uniqueAllCurrentListEntries":len(rows),
      "uniqueNewVsGrade6Archive":len(news),
      "combinedUniqueKnownUrls":len(combined),
      "newByGrade":dict(by_grade),
      "newBySubject":dict(by_subject),
      "newByDistrict":dict(by_district),
      "downloadedOriginalFiles":0,
      "verifiedOfficialExamPapers":0,
      "savedFileBytes":0,
      "pages":pages,"errors":errors,
      "items":news,
    }
    DEST.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("WUHAN_K12_FINAL",len(news),"NEW",len(combined),"COMBINED",
          "GRADE",dict(by_grade),"SUBJECT",dict(by_subject),"FAILURES",len(errors),flush=True)
if __name__=="__main__":main()
