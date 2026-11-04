#!/usr/bin/env python3
"""Regression checks for current-window source leads and strict evidence states."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DISC = ROOT / "data/discovery"
d = json.loads((DISC / "china-k12-current-window-review-20261104.json").read_text(encoding="utf8"))
ext = json.loads((DISC / "china-k12-current-window-external-leads-20261104.json").read_text(encoding="utf8"))

assert len(d["regionalThirdPartyLeads"]) == 81
assert len(d["externalEventCandidates"]) == len(ext["records"]) >= 13
assert len({x["eventGroupId"] for x in ext["records"]}) == len(ext["records"])
assert d["legacy433"]["knownUniqueListingUrls"] == 433
assert d["legacy433"]["verifiedOriginalPapersFromLegacyIndex"] == 0
assert d["legacy433"]["priorityTopPublicationDate"] == "2026-02-09"
assert d["latestSourcePublicationDate"] >= "2026-11-03"
assert d["deduplication"]["externalUrlOverlapWithRegionalIndex"] == []
assert d["deduplication"]["duplicateExternalSourceUrls"] == []
assert d["deduplication"]["uniqueCombinedSourceUrls"] == (
    d["deduplication"]["regionalLeadUrls"] + d["deduplication"]["uniqueExternalSourceUrls"]
)

for x in d["externalEventCandidates"]:
    assert x["paperFileDownloaded"] is False
    assert x["answerFileDownloaded"] is False
    assert x["audioFileDownloaded"] is False
    assert x["archiveStatus"] == "not_archived"
    assert x["archivedBytes"] == 0
    assert x["rightsStatus"] in {"unknown", "not_stated"}

m = d["collectionMetrics"]
assert all(v == 0 for v in m.values())
assert any(x["id"] == "wuhu-grade8-biology-practical-2026" and
           x["downloadStatus"] == "official_attachment_http_403_no_bypass"
           for x in d["externalEventCandidates"])
assert any(x["id"] == "wuhu-grade9-physics-chemistry-practical-2026" and
           x["downloadStatus"] == "official_attachment_tls_timeout_and_403_no_bypass"
           for x in d["externalEventCandidates"])
assert any(x["id"] == "hubei-shiyan-dongfeng-g12-biology-2026-10" and
           x["actualExamDate"] == "2026-10-16" and
           {"语文", "物理", "生物"}.issubset(set(x["subjects"]))
           for x in d["externalEventCandidates"])
assert any(x["id"] == "hubei-shashi-high3-2026-10" and
           len(x["subjects"]) == 6 and
           x["downloadStatus"] == "public_share_link_listed_not_fetched"
           for x in d["externalEventCandidates"])
assert any(x["id"] == "hubei-chutian-alliance-g12-2026-10" and
           len(x["subjects"]) == 9 and
           x["evidence"]["listedFiles"] == 17
           for x in d["externalEventCandidates"])
assert any(x["id"] == "anhui-wanyu-tianyi-g12-2026-10" and
           x["evidence"]["listedFiles"] == 14
           for x in d["externalEventCandidates"])
assert any(x["id"] == "zhejiang-2026-provincial-zhongkao" and
           x["publicationDate"] is None and
           x["downloadStatus"] == "download_endpoints_http_403_no_bypass"
           for x in d["externalEventCandidates"])
assert any(x["id"] == "liaoning-shenyang-no2-g10-2026-10" and
           x["audioFileDownloaded"] is False and
           ".mp3" in x["evidence"]["englishAudioFilenameListed"].lower()
           for x in d["externalEventCandidates"])
assert any(x["id"] == "hubei-g12-english-stage-training-2026-10" and
           "MP4" in x["evidence"]["listedAudio"] and
           x["audioFileDownloaded"] is False
           for x in d["externalEventCandidates"])

assert len(d["eventWatch"]) >= 2
assert any(x["id"] == "wuhan-2026-autumn-midterm-schedule-watch" and
           x["paperFilesFound"] == 0 for x in d["eventWatch"])
assert any(x["id"] == "beijing-2026-autumn-midterm-schedule-watch" and
           x["paperFilesFound"] == 0 for x in d["eventWatch"])
assert len(d["quarantined"]) == 2
assert any("content-mismatch" in x["id"] for x in d["quarantined"])
assert len({u for x in ext["records"] for u in x["sourceUrls"]}) == d["deduplication"]["uniqueExternalSourceUrls"]
print("CHINA_K12_CURRENT_WINDOW_TEST=PASS",
      len(d["regionalThirdPartyLeads"]),
      len(d["externalEventCandidates"]),
      d["deduplication"]["uniqueCombinedSourceUrls"])
