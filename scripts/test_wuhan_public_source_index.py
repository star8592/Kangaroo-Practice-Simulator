#!/usr/bin/env python3
"""Public link metadata only: no copyrighted attachments or paywall bypass."""
from pathlib import Path
from collections import Counter
import json
r=Path(__file__).resolve().parents[1]
x=json.loads((r/"data/discovery/wuhan-grade6-thirdparty-index-20261031.json").read_text(encoding="utf-8"))
assert x["sourcePageCount"]==4
assert x["successfulSourcePageCount"]==4
items=x["items"]
assert len(items)==99
assert len({v["pageUrl"] for v in items})==len(items)
assert all(v["pageUrl"].startswith("https://www.wh111.com/xiaoxue/liunianji/") for v in items)
assert all(v["actualFileDownloaded"] is False and not v["commercialSaleAllowed"] for v in items)
assert all(v["examOriginalVerified"] is False and v["copyrightLicense"]=="not_verified" for v in items)
assert all(v["sourceStatus"]=="public_listing_only" for v in items)
counts=Counter(v["subject"] for v in items)
assert counts["数学"]==41 and counts["语文"]==13 and counts["英语"]==44
assert "/mnt/disk1/" not in json.dumps(x)
rules=json.loads((r/"data/discovery/domestic-exam-source-quality-rules-20261031.json").read_text(encoding="utf-8"))
law=rules["sources"][0]
assert law["issuer"]=="中华人民共和国司法部" and law["originalExamPapersOfficiallyPublished"] is False
assert law["commercialResaleAllowed"] is False
wh=rules["sources"][1]
assert wh["pointsForPaper"]==3 and wh["pointsForAnswers"]==2
assert rules["crossReferences"][0]["assertSameExam"] is False
print("WUHAN_PUBLIC_SOURCE_METADATA_ONLY=PASS",len(items))
