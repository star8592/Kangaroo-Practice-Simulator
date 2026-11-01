#!/usr/bin/env python3
from pathlib import Path
import json
from urllib.parse import urlparse
root=Path(__file__).resolve().parents[1]
d=json.loads((root/"data/discovery/china-k12-source-entrances-20261101.json").read_text())
assert d["sourceCount"]==len(d["entrances"])==8
assert d["newExamFilesDownloaded"]==d["newVerifiedOriginalFiles"]==0
assert len({x["url"] for x in d["entrances"]})==8
assert all(urlparse(x["url"]).scheme=="https" and x["papersDownloaded"]==0 for x in d["entrances"])
print("CHINA_K12_SOURCES_TEST=PASS 8")
