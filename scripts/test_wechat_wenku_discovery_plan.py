from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/"data/discovery/wechat-wenku-seven-lane-plan-20261031.json"
d=json.loads(p.read_text(encoding="utf-8"))
assert d["yearPriority"]==[2027,2026,2025,2024]
assert len(d["platforms"])==3 and d["totalQueuedQueries"]==84
rows=d["tasks"]
assert len(rows)==84 and len({r["id"] for r in rows})==84
assert {r["platform"] for r in rows}=={"wechat_articles","wechat_channels","baidu_wenku"}
assert {r["domain"] for r in rows}=={"school","math-competition","language","university","career","professional","interest"}
assert all(r["status"]=="not_searched" and not r["actualOriginalFileDownloaded"] for r in rows)
assert all(not r["commercialRedistributionAllowed"] and not r["ocrPerformed"] for r in rows)
assert d["realDeviceChecks"]["wechatPublicGenericSearchSubmitted"]
assert not d["realDeviceChecks"]["wechatSpecificChineseExamQuerySucceeded"]
assert not d["realDeviceChecks"]["baiduWenkuAppInstalled"]
assert all(not x["downloaded"] and not x["exactDocumentUrlVerified"] for x in d["wenkuHomepageCandidates"])
assert "/mnt/disk" not in json.dumps(d)
print("WECHAT_WENKU_7_LANES_3_PLATFORMS_4_YEARS=PASS",len(rows))
