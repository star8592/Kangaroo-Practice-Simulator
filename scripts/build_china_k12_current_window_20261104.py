#!/usr/bin/env python3
"""Build a separate current-window queue without relabeling links as exam files."""
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
DISCOVERY = ROOT / "data/discovery"
REGIONAL = DISCOVERY / "china-k12-priority-regions-live-20261101.json"
EXTERNAL = DISCOVERY / "china-k12-current-window-external-leads-20261104.json"
LEGACY = DISCOVERY / "china-k12-school-exam-priority-20261101.json"
OUTPUT = DISCOVERY / "china-k12-current-window-review-20261104.json"


def main() -> None:
    regional = json.loads(REGIONAL.read_text(encoding="utf8"))
    external = json.loads(EXTERNAL.read_text(encoding="utf8"))
    legacy = json.loads(LEGACY.read_text(encoding="utf8"))
    assert len(regional["items"]) == 81
    assert legacy["totalKnownUniqueListingUrls"] == 433
    assert len(external["records"]) >= 7
    assert len({x["eventGroupId"] for x in external["records"]}) == len(external["records"])

    regional_leads = []
    url_owner = {}
    for item in regional["items"]:
        url = item["sourceUrl"]
        assert url not in url_owner, f"duplicate regional URL: {url}"
        url_owner[url] = "regional_index"
        regional_leads.append({
            "id": "regional-" + hashlib.sha256(url.encode()).hexdigest()[:16],
            "queueKind": "regional_third_party_page",
            "sourceUrl": url,
            "title": item["title"],
            "region": item["region"],
            "publicationDate": item["pagePublicationDateFromUrl"],
            "subjects": item.get("subjectsInTitle", []),
            "examType": item.get("examTypeFromTitle"),
            "actualExamDate": item.get("originalExamDate"),
            "paperFileDownloaded": False,
            "answerFileDownloaded": False,
            "rightsStatus": item.get("rightsStatus", "unknown"),
            "state": "third_party_index_only",
            "reviewOnly": True
        })

    external_records = []
    external_urls = []
    external_seen = set()
    duplicate_external_urls = []
    overlap_urls = []
    for record in external["records"]:
        for url in record["sourceUrls"]:
            external_urls.append(url)
            if url in external_seen:
                duplicate_external_urls.append(url)
            external_seen.add(url)
            if url in url_owner:
                overlap_urls.append(url)
            else:
                url_owner[url] = record["id"]
        external_records.append(record)

    unique_external_urls = sorted(external_seen)
    queue_dates = [x["publicationDate"] for x in regional_leads if x.get("publicationDate")]
    queue_dates += [x["publicationDate"] for x in external_records if x.get("publicationDate")]
    latest = max(queue_dates) if queue_dates else None

    output = {
        "schemaVersion": 1,
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "scope": "China mainland K12 current-window source leads only; no foreign active collection.",
        "legacy433": {
            "knownUniqueListingUrls": legacy["totalKnownUniqueListingUrls"],
            "eligibleForManualReview": legacy["eligibleForSourceReview"],
            "verifiedOriginalPapersFromLegacyIndex": legacy["verifiedOriginalExamPapersFromTheseIndexes"],
            "priorityTopPublicationDate": legacy["priorityQueue"][0]["publicationDateFromUrl"],
            "warning": "Legacy 433 is a Wuhan third-party listing index, not a current nationwide queue or original-paper inventory."
        },
        "regionalIndexSource": str(REGIONAL.relative_to(ROOT)),
        "externalLeadSource": str(EXTERNAL.relative_to(ROOT)),
        "regionalThirdPartyLeads": sorted(regional_leads, key=lambda x: (x["publicationDate"], x["sourceUrl"]), reverse=True),
        "externalEventCandidates": sorted(external_records, key=lambda x: (x.get("publicationDate") or "", x["id"]), reverse=True),
        "eventWatch": external["eventWatch"],
        "quarantined": external["quarantined"],
        "deduplication": {
            "regionalLeadUrls": len(regional_leads),
            "externalEventRecords": len(external_records),
            "externalSourceUrls": len(external_urls),
            "uniqueExternalSourceUrls": len(unique_external_urls),
            "duplicateExternalSourceUrls": sorted(set(duplicate_external_urls)),
            "uniqueCombinedSourceUrls": len(url_owner),
            "externalUrlOverlapWithRegionalIndex": sorted(set(overlap_urls)),
            "eventGroupsAreNotPaperCounts": True
        },
        "latestSourcePublicationDate": latest,
        "collectionMetrics": external["collectionMetrics"],
        "notice": "All entries are discovery/review leads. None is promoted to archived, complete, trainable, licensed, or published without original bytes and independent verification."
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print("K12_CURRENT_WINDOW_BUILD=PASS",
          "regional", len(regional_leads),
          "external_events", len(external_records),
          "unique_urls", len(url_owner),
          "external_duplicates", len(set(duplicate_external_urls)),
          "overlaps", len(set(overlap_urls)),
          "latest", latest)
    print("K12_CURRENT_WINDOW_ARCHIVED_BYTES=0 VERIFIED_PAPERS=0 VERIFIED_ANSWERS=0 VERIFIED_AUDIO=0")


if __name__ == "__main__":
    main()
