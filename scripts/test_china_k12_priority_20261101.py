#!/usr/bin/env python3
"""Checks that prioritization never launders public listings into verified originals."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/"data/discovery/china-k12-school-exam-priority-20261101.json").read_text())
xs=d["priorityQueue"]
assert d["totalKnownUniqueListingUrls"]==433==len(xs)
assert len({x["sourceUrl"] for x in xs})==433
assert d["eligibleForSourceReview"]+d["excludedNonPaperOrAmbiguousListings"]==433
assert d["verifiedOriginalExamPapersFromTheseIndexes"]==0
assert d["originalSchoolPapersDownloadedFromTheseIndexes"]==0
assert all(x["paperFileDownloaded"] is False and x["answerFileDownloaded"] is False for x in xs)
assert all(x["actualExamDate"] is None and x["examYearVerified"] is None for x in xs)
assert all(x["examLevel"]=="unverified_from_title" and x["schoolFromTitle"] is None for x in xs)
assert all(x["state"]=="listing_only_not_downloaded" and x["rightsStatus"]=="unknown" for x in xs)
assert all(x["sourceCategory"]=="third_party_public_listing_not_exam_authority" for x in xs)
assert xs==sorted(xs,key=lambda x:(-x["priorityScore"],-int(x["publicationDateFromUrl"].replace("-","")),x["sourceUrl"]))
assert "物理" in d["criticalMissingSubjects"] and "历史" in d["criticalMissingSubjects"]
assert all("private/" not in x["sourceUrl"] for x in xs)
print("CHINA_K12_PRIORITY_TEST=PASS",len(xs),d["eligibleForSourceReview"])
