#!/usr/bin/env python3
"""Regression: discovered regional source hub is not mistaken for a real paper."""
import json
from pathlib import Path
from urllib.parse import urlparse
root=Path(__file__).resolve().parents[1]
d=json.loads((root/"data/discovery/china-k12-priority-regions-live-20261101.json").read_text())
assert len(d["regionPriorities"])==6
assert {x["key"] for x in d["regionPriorities"]}=={"wuhan_hubei","jiangsu","zhejiang","beijing","shanghai","guangdong"}
assert len(d["sourceHubs"])==10
assert len(d["indexScans"])==3
assert d["rawPublicListingCount"]==len(d["items"])
assert d["additionalPublicListingUrlsVs433"]+d["alreadyIndexedAmong433"]==len(d["items"])
assert len({x["sourceUrl"] for x in d["items"]})==len(d["items"])
assert d["newExamOriginalFilesDownloaded"]==d["newExamPaperWithPagesVerified"]==d["newSaleablePapers"]==0
assert all(x["paperFileDownloaded"] is False and x["paperVerified"] is False and x["state"]=="third_party_index_only" for x in d["items"])
assert all(x["actualPdfLinkAccessible"] is False and x["downloadMethodValidated"] is False for x in d["items"])
assert d["gradePathTitleConflictCount"]==sum(x["gradeDirectoryVsTitleConflict"] for x in d["items"])
assert d["yearLabelPublicationWarningCount"]==sum(x["academicYearVsPublicationWarning"] for x in d["items"])
assert all(x["originalPaperFilesDownloaded"]==0 and x["verifiedPaperCount"]==0 for x in d["sourceHubs"])
assert all(urlparse(x["sourceUrl"]).hostname=="www.wh111.com" for x in d["items"])
assert all(x["pagePublicationDateFromUrl"][:4]=="2026" and x["pagePublicationDateFromUrl"]>="2026-08-01" for x in d["items"])
print("CHINA_K12_REGIONAL_SOURCE_TEST=PASS",len(d["items"]),d["additionalPublicListingUrlsVs433"])
