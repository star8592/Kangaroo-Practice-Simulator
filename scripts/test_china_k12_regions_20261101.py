#!/usr/bin/env python3
"""Source evidence must never upgrade to verified paper/downloadable product."""
from pathlib import Path
import json
from urllib.parse import urlsplit
root=Path(__file__).resolve().parents[1]
d=json.loads((root/"data/discovery/china-k12-region-source-leads-20261101.json").read_text())
assert d["sourcePageCount"]==18
assert d["sourcePagesFetched"]+d["sourcePagesFailed"]==18
assert d["sourcePagesFetched"]>=6
assert d["verifiedExamPapers"]==d["totalOriginalExamFilesDownloaded"]==0
xs=d["candidateLinks"]
assert d["uniqueSourceCandidateLinks"]==len(xs)
assert len(xs)==len({x["pageUrl"] for x in xs})
assert d["uniqueNewCandidateLinksVsWuhan433"]==sum(not x["alreadyInWuhan433Index"] for x in xs)
assert all(x["state"]=="public_link_title_only" for x in xs)
assert all(not x["examEventVerified"] and not x["isPaperFileDownloaded"]
           and not x["isAnswerFileDownloaded"] and not x["legalRedistributionVerified"] for x in xs)
assert all("2026" in x["title"] for x in xs)
assert all(urlsplit(x["pageUrl"]).hostname==urlsplit(x["sourcePage"]).hostname for x in xs)
assert all(x["province"] in ("湖北","江苏","浙江","北京","上海","广东") for x in xs)
assert all(x["examDate"] is None for x in xs)
assert all(x["sourceGeoOnlyNotVerifiedExamGeo"] is True for x in xs)
assert d["currentFallCandidateLinks"]==sum(x["reviewTier"]=="2026_fall_school_event_candidate_not_verified" for x in xs)
assert d["currentFallCandidateLinks"]>0
print("CHINA_K12_REGIONAL_LINK_PROVENANCE_PASS",len(xs))
