from pathlib import Path
from collections import Counter
import json
p=Path(__file__).resolve().parents[1]/"data/discovery/china-official-source-harvest-20261031.json"
data=json.loads(p.read_text(encoding="utf-8"))
rows=data["files"]
assert len(rows)==data["candidateCount"] and len(rows)>=100
assert len({x["originalUrl"] for x in rows})==len(rows)
assert all(x["sourceOwner"] and x["sourcePage"].startswith("https://") for x in rows)
assert all(x["examYear"] in (None,2024,2025,2026,2027) for x in rows)
assert all(not x["saleAllowed"] and x["ocrState"]=="not_started" for x in rows)
assert all("/mnt/disk1/" not in str(x) and "private/raw-source-archive" not in str(x) for x in rows)
assert dict(Counter(x["state"] for x in rows))==data["statusCounts"]
for x in rows:
 if x["state"] in ("downloaded","existing"):
  assert len(x["sha256"])==64 and x["sizeBytes"]>800
print("CHINA_PUBLIC_ORIGINAL_SOURCE_INDEX=PASS",len(rows))
