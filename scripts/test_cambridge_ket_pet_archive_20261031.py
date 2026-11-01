#!/usr/bin/env python3
"""Cambridge KET/PET already archived PDFs: no sample file is a full paid exam."""
import json,re
from collections import Counter
from pathlib import Path
p=Path(__file__).resolve().parents[1]/"data/discovery/cambridge-ket-pet-audit-20261031.json"
d=json.loads(p.read_text(encoding="utf8"))
assert d["totalFiles"]==56
assert d["filesByLevel"]=={"KET":31,"PET":25}
assert d["totalPdfPages"]==995
assert d["totalBytes"]==177476315
assert d["matchedOfficialSourceUrls"]==55
assert d["completeSimulatorExamCount"]==0
items=d["files"]
assert len(items)==56
assert len({x["id"] for x in items})==56
assert len({x["sha256"] for x in items})==56
assert all(re.fullmatch(r"[0-9a-f]{64}",x["sha256"]) for x in items)
assert all(x["bytes"]>300 and x["pdfPageCount"]>0 for x in items)
assert all(x["filename"].lower().endswith(".pdf") for x in items)
assert all(x["sourcePage"].startswith("https://www.cambridgeenglish.org/") for x in items)
assert all(x["originalExamPaperVerified"] is False for x in items)
assert all(x["completeExamMockReady"] is False for x in items)
assert all(x["commercialRedistributionAllowed"] is False for x in items)
assert sum(bool(x["sourceMatchedByFilename"]) for x in items)==55
assert sum(x["bytes"] for x in items)==d["totalBytes"]
assert sum(x["pdfPageCount"] for x in items)==995
assert "/mnt/disk1" not in json.dumps(d)
print("CAMBRIDGE_KET_PET_LOCAL_ARCHIVE_TEST=PASS","pdfs",len(items),"pages",d["totalPdfPages"])
