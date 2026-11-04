#!/usr/bin/env python3
"""Regression checks for current-window source leads and strict evidence states."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DISC=ROOT/"data/discovery"
d=json.loads((DISC/"china-k12-current-window-review-20261104.json").read_text(encoding="utf8"))
ext=json.loads((DISC/"china-k12-current-window-external-leads-20261104.json").read_text(encoding="utf8"))
assert len(d["regionalThirdPartyLeads"])==81
assert len(d["externalEventCandidates"])==7
assert d["legacy433"]["knownUniqueListingUrls"]==433
assert d["legacy433"]["verifiedOriginalPapersFromLegacyIndex"]==0
assert d["legacy433"]["priorityTopPublicationDate"]=="2026-02-09"
assert d["latestSourcePublicationDate"]>="2026-11-02"
assert d["deduplication"]["externalUrlOverlapWithRegionalIndex"]==[]
assert d["deduplication"]["uniqueCombinedSourceUrls"]==(
    d["deduplication"]["regionalLeadUrls"]+d["deduplication"]["uniqueExternalSourceUrls"])
for x in d["externalEventCandidates"]:
    assert x["paperFileDownloaded"] is False
    assert x["answerFileDownloaded"] is False
    assert x["audioFileDownloaded"] is False
    assert x["archiveStatus"]=="not_archived"
    assert x["archivedBytes"]==0
    assert x["rightsStatus"] in {"unknown","not_stated"}
m=d["collectionMetrics"]
assert all(v==0 for v in m.values())
assert any(x["id"]=="wuhu-grade8-biology-practical-2026" and
           x["downloadStatus"]=="official_attachment_http_403_no_bypass"
           for x in d["externalEventCandidates"])
assert any(x["id"]=="hubei-g12-english-stage-training-2026-10" and
           "MP4" in x["evidence"]["listedAudio"] and
           x["audioFileDownloaded"] is False for x in d["externalEventCandidates"])
assert len(d["eventWatch"])==1 and d["eventWatch"][0]["paperFilesFound"]==0
assert len(d["quarantined"])==2
assert any("content-mismatch" in x["id"] for x in d["quarantined"])
assert len({u for x in ext["records"] for u in x["sourceUrls"]})==d["deduplication"]["uniqueExternalSourceUrls"]
print("CHINA_K12_CURRENT_WINDOW_TEST=PASS",len(d["regionalThirdPartyLeads"]),len(d["externalEventCandidates"]),d["deduplication"]["uniqueCombinedSourceUrls"])
