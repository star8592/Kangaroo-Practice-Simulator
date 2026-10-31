#!/usr/bin/env python3
"""Metadata-only 2026 Wuhan K12 index regression; never count listings as files."""
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit
import re

root=Path(__file__).resolve().parents[1]
old=json.loads((root/"data/discovery/wuhan-grade6-thirdparty-index-20261031.json").read_text(encoding="utf8"))
d=json.loads((root/"data/discovery/wuhan-k12-expanded-index-20261031.json").read_text(encoding="utf8"))
assert len(old["items"])==99
assert d["priorGrade6Items"]==99
assert d["uniqueNewVsGrade6Archive"]==334
assert d["combinedUniqueKnownUrls"]==433
assert d["failedIndexPages"]==0
assert d["scannedIndexPages"]==16
assert d["downloadedOriginalFiles"]==0 and d["verifiedOfficialExamPapers"]==0 and d["savedFileBytes"]==0
assert len(d["items"])==334
assert len({x["pageUrl"] for x in d["items"]})==334
assert {x["gradeGroup"] for x in d["items"]}=={"G1","G2","G3","G4","G5","XSC","G9_EN","G9_MATH"}
assert sum(d["newByGrade"].values())==334
assert sum(d["newBySubject"].values())==334
assert sum(d["newByDistrict"].values())==334
assert d["newBySubject"]=={"数学":154,"语文":59,"英语":113,"其他":8}
assert all(x["state"]=="third_party_public_listing_only" and x["actualExamFileDownloaded"] is False for x in d["items"])
assert all(x["schoolIssuedOriginalVerified"] is False and x["commercialRedistributionAllowed"] is False for x in d["items"])
assert all(x["rightsStatus"]=="unknown" for x in d["items"])
assert all(urlsplit(x["pageUrl"]).hostname=="www.wh111.com" for x in d["items"])
assert all(x["publishedYear"] in (2024,2025,2026) for x in d["items"])
assert all(re.search(r"/202[456]-\d\d-\d\d/\d+\.html$",x["pageUrl"]) for x in d["items"])
assert all(not x["title"].startswith(("Î","½","¶")) for x in d["items"])
assert all(x["title"].strip() for x in d["items"])
existing={x["pageUrl"] for x in old["items"]}
assert not any(x["pageUrl"] in existing for x in d["items"])
assert "/mnt/disk" not in json.dumps(d)
print("WUHAN_K12_EXPANSION_TEST=PASS",d["uniqueNewVsGrade6Archive"] if "uniqueNewVsGrade6Archive" in d else d["uniqueNewVsGrade6Archive" if "uniqueNewVsGrade6Archive" in d else "uniqueNewVsGrade6Archive"] )
