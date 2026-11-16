#!/usr/bin/env python3
"""Write a PUBLIC provenance-only catalog from the PRIVATE official PDF sweep. No file bytes."""
from collections import Counter
from datetime import datetime,timezone
import hashlib,json,os
from pathlib import Path

ARCHIVE=Path(os.environ["SOCTHINK_RAW_ARCHIVE_DIR"]).expanduser().resolve(strict=True)
REPO=Path(__file__).resolve().parents[1]
def load(name,default=None):
 p=ARCHIVE/name
 return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default
disc=load("mass-sweep-discovery.json")
manifest=load("mass-sweep-manifest.json",{})
progress=load("mass-sweep-progress.json",{})
old=load("manifest.json",{})
ukmt=load("ukmt-extra-manifest.json",{})
local=load("local-dated-inventory.json",{})
assert disc and len(disc["entries"])==disc["candidate_count"]
# A mid-sweep checkpoint may be newer than the last completed manifest.
state={}
for e in manifest.get("entries",[]):
 state[e["url"]]=e
for e in progress.get("entries",[]):
 state[e["url"]]=e
source_urls=set()
rows=[]
for e in disc["entries"]:
 url=e["url"];source_urls.add(url)
 actual=state.get(url)
 status=actual["status"] if actual else "not_attempted"
 kind=e.get("kind","unclassified")
 row={
  "id":hashlib.sha256(url.encode()).hexdigest()[:20],
  "domain":e["domain"],"examYear":e["exam_year"],
  "yearFieldSemantics":"admission_year" if e["source_id"]=="nagoya" else
     "academic_exam_year" if e["source_id"].startswith("cbse") else
     "annual_competition_year" if e["source_id"].startswith("cemc") else
     "exam_year" if e["source_id"].startswith("ipa") or e["source_id"]=="tokyo" else "not_applicable",
  "kindAsIndexed":kind,
  "titleOrSourceContext":e.get("label","")[:140],
  "publisher":e["source_owner"],
  "sourcePage":e["source_page"],"originalUrl":url,"filename":e["source_file"],
  "archiveStatus":status,"sha256":actual.get("sha256") if actual else None,
  "sizeBytes":actual.get("size_bytes") if actual else None,
  "pages":actual.get("pages") if actual else None,
  "failure":actual.get("failure") if actual and status=="failed" else None,
  "rights":"not_verified_for_commercial_redistribution",
  "publicDownload":False,"commercialSaleAllowed":False,"ocrPerformed":False,
 }
 assert not any(z in str(row) for z in ("/mnt/disk1/", "private/raw-source-archive/"))
 rows.append(row)
old_items=old.get("items",[])
extra=ukmt.get("items",[])
local_items=local.get("items",[])
for e in extra:
 assert e["url"].startswith("https://ukmt.org.uk/")
 assert e.get("sale_allowed") is False
success_states={"downloaded","existing_same_url","already_archived_in_original_batch"}
passed=[r for r in rows if r["archiveStatus"] in success_states]
downloads=[r for r in rows if r["archiveStatus"] in ("downloaded","existing_same_url")]
old_hashes={x.get("sha256") for x in old_items}
ukmt_passed=[x for x in extra if x["state"] in ("downloaded","already_downloaded")]
all_sha={x["sha256"] for x in downloads if x["sha256"]} | old_hashes | {x.get("sha256") for x in ukmt_passed}
all_sha.discard(None)
snapshot={
 "schemaVersion":1,"generatedAt":datetime.now(timezone.utc).isoformat(timespec="seconds"),
 "scope":"Official-original PDF source discovery and private storage verification, not a paid product catalog.",
 "yearPriority":[2027,2026,2025,2024],
 "sourcePageCount":disc.get("source_count"),"officialPdfCandidates":len(rows),
 "completedCandidates":len(state),"downloadedOrExistingFromSweep":len(passed),
 "newFilesInSweep":len([e for e in state.values() if e["status"]=="downloaded"]),
 "previouslyArchivedOriginalFiles":len(old_items),
 "extraUkmtFiles":len(ukmt_passed),
 "datedLocalExistingPdfFiles":len(local_items),
 "sha256DistinctAcrossArchivedOfficialSources":len(all_sha),
 "downloadFailures":sum(1 for r in rows if r["archiveStatus"]=="failed"),
 "notAttempted":sum(1 for r in rows if r["archiveStatus"]=="not_attempted"),
 "bytesNew":sum(e.get("size_bytes") or 0 for e in state.values() if e.get("status")=="downloaded"),
 "byDomain":dict(Counter(r["domain"] for r in passed)),
 "byExamYear":dict(Counter(str(r["examYear"]) for r in passed)),
 "classificationNotice":"Includes actual papers, official samples, answer keys, scoring rubrics and interest inventories; a PDF is not always a distinct exam paper.",
 "rightsNotice":"All third-party originals are PRIVATE research references. Public access and download do not imply commercial redistribution rights.",
 "files":rows
}
p=REPO/"data/discovery/official-original-mass-sweep-20261031.json"
p.parent.mkdir(parents=True,exist_ok=True)
p.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("OFFICIAL_CANDIDATES",len(rows))
print("ARCHIVE_SUCCESS",len(passed))
print("ARCHIVE_NEW",snapshot["newFilesInSweep"])
print("ARCHIVE_FAILED",snapshot["downloadFailures"])
print("ARCHIVE_UNATTEMPTED",snapshot["notAttempted"])
print("ARCHIVE_BYTES_NEW",snapshot["bytesNew"])
print("PRIVATE_ONLY_CONFIRMED",all(not row["publicDownload"] and not row["commercialSaleAllowed"] for row in rows))
