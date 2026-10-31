from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/"data/discovery/china-social-source-leads-20261031.json"
d=json.loads(p.read_text(encoding="utf-8"))
rows=d["entries"]
assert len(rows)==5 and len({x["url"] for x in rows})==len(rows)
assert all(x["url"].startswith("https://www.bilibili.com/video/") for x in rows)
assert all(x["sourceClass"]=="third_party_video_lead" for x in rows)
assert all(not x["saleAllowed"] and not x["originalPaperDownloaded"] for x in rows)
assert all(x["ocrState"]=="not_attempted" and x["frameCaptureState"]=="not_attempted" for x in rows)
assert d["mobileStatus"]["s22AdbConnected"] is False
print("CHINA_PUBLIC_SOCIAL_LEADS_PROVENANCE_ONLY=PASS",len(rows))
