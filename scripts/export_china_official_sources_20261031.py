#!/usr/bin/env python3
"""Read private originals ledger; export public metadata only (never source bytes)."""
from pathlib import Path
from collections import Counter
from datetime import datetime,timezone
import hashlib,json,os
base=Path(__file__).resolve().parents[1]
root=Path(os.environ["SOCTHINK_RAW_ARCHIVE_DIR"]).expanduser().resolve(strict=True)/"domestic-first-20261031"
candidates=json.loads((root/"candidate-index.json").read_text(encoding="utf-8"))
progress=json.loads((root/"harvest-progress.json").read_text(encoding="utf-8"))
rows={}
for item in candidates["items"]:
    rows[item["url"]]={
      "id":hashlib.sha256(item["url"].encode()).hexdigest()[:24],
      "sourceId":item["sourceId"],
      "examYear":item["examYear"],
      "domain":item["domain"],
      "kind":item["kind"],
      "sourceOwner":item["sourceOwner"],
      "sourcePage":item["sourcePage"],
      "originalUrl":item["url"],
      "label":item["label"],
      "declaredExtension":item["declaredExtension"],
      "state":"not_attempted",
      "sha256":None,"sizeBytes":None,"verifiedAt":None,"error":None,
      "rights":"commercial_redistribution_not_verified",
      "saleAllowed":False,"ocrState":"not_started",
    }
for item in progress["items"]:
    row=rows[item["url"]]
    row.update(state=item["state"],sha256=item.get("sha256"),sizeBytes=item.get("sizeBytes"),
        verifiedAt=item.get("verifiedAt"),error=item.get("error"))
    if item["state"] in ("downloaded","existing"):
        assert len(item["sha256"])==64 and item["sizeBytes"]>800
        raw=(root.parent/item["storedRelativePath"]).resolve(strict=True)
        assert raw.is_relative_to(root)
        b=raw.read_bytes()
        assert len(b)==item["sizeBytes"] and hashlib.sha256(b).hexdigest()==item["sha256"],str(raw)
results=list(rows.values())
st=Counter(row["state"] for row in results)
snapshot={
  "schemaVersion":1,
  "generatedAt":datetime.now(timezone.utc).isoformat(timespec="seconds"),
  "sourceScope":"Chinese university official pages; raw files remain private",
  "sourcePages":candidates["sources"],
  "candidateCount":len(results),
  "statusCounts":dict(st),
  "downloadedBytes":sum(row["sizeBytes"] or 0 for row in results if row["state"] in ("downloaded","existing")),
  "examYearCounts":dict(Counter(str(row["examYear"]) for row in results if row["state"] in ("downloaded","existing"))),
  "rightsNotice":"Official public source does not grant commercial redistribution. No official examination original was offered for sale.",
  "files":results,
}
out=base/"data/discovery/china-official-source-harvest-20261031.json"
out.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("CHINA_OFFICIAL_CANDIDATES",len(results))
print("CHINA_OFFICIAL_DOWNLOADS_VERIFIED",st.get("downloaded",0)+st.get("existing",0))
print("CHINA_OFFICIAL_FAILED",st.get("failed",0))
print("CHINA_OFFICIAL_NOT_ATTEMPTED",st.get("not_attempted",0))
print("CHINA_OFFICIAL_BYTES",snapshot["downloadedBytes"])
