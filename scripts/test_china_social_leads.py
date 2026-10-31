from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/"data/discovery/china-social-source-leads-20261031.json"
d=json.loads(p.read_text(encoding="utf-8"))
rows=d["entries"]
assert len(rows)>=8
assert len({x["id"] for x in rows})==len(rows)
assert len({x["url"] for x in rows if x.get("url")})==len([x for x in rows if x.get("url")])
assert all(x["url"].startswith("https://www.bilibili.com/video/") for x in rows if x["platform"]=="bilibili")
assert all(x["sourceClass"]=="third_party_video_lead" for x in rows if x["platform"]=="bilibili")
assert all(not x.get("saleAllowed",x.get("commercialSaleAllowed",False)) for x in rows)
assert all(not x.get("originalPaperDownloaded",False) for x in rows)
assert all(x["ocrState"]=="not_attempted" for x in rows)
xhs=[x for x in rows if x["platform"]=="xiaohongshu"]
assert len(xhs)==3
assert len([x for x in xhs if x["linkResolutionVerified"]])==2
assert all(not x["commercialSaleAllowed"] for x in xhs)
assert d["mobileStatus"]["adbConnected"] is True
assert d["mobileStatus"]["xiaohongshuInAppPublicSearchConfirmed"] is True
print("CHINA_SOCIAL_LEADS_LINKS_ONLY_PASS",len(rows),"xhs",len(xhs))
