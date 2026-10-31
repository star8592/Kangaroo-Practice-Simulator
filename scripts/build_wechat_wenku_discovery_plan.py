#!/usr/bin/env python3
"""Create search tasks, not copies of articles, videos, or paywalled documents."""
from pathlib import Path
import json
from datetime import date
root=Path(__file__).resolve().parents[1]
src=json.loads((root/"data/discovery/xhs-seven-lane-keyword-plan-20261031.json").read_text(encoding="utf-8"))
platforms=[
 {"id":"wechat_articles","displayName":"微信公众号文章","sourceHome":"https://www.tencent.net.cn/zh-cn/products/weixin-search/","sourceType":"public_article","app":"com.tencent.mm"},
 {"id":"wechat_channels","displayName":"微信视频号","sourceHome":"https://www.tencent.net.cn/zh-cn/products/weixin-search/","sourceType":"public_video_lead","app":"com.tencent.mm"},
 {"id":"baidu_wenku","displayName":"百度文库","sourceHome":"https://wenku.baidu.com/","sourceType":"public_document_listing","app":None},
]
records=[]
for lane in src["lanes"]:
 queries=lane["queries"]
 for platform in platforms:
  for year in (2027,2026,2025,2024):
   q=next((x for x in queries if str(year) in x),None)
   assert q, (lane["id"],year)
   records.append({
    "id":f'{platform["id"]}:{lane["id"]}:{year}',
    "platform":platform["id"],"domain":lane["id"],"yearHint":year,"query":q,
    "status":"not_searched","sourceUrl":None,"sourcePublisher":None,
    "actualOriginalFileDownloaded":False,"originalExamVerified":False,
    "ocrPerformed":False,"commercialRedistributionAllowed":False,
    "requiresManualSourceVerification":True
   })
d={
 "schemaVersion":1,"createdAt":"2026-10-31",
 "scope":"Search task queue only; no document copying or protected media extraction",
 "yearPriority":[2027,2026,2025,2024],
 "primaryMarket":"China",
 "platforms":platforms,
 "totalQueuedQueries":len(records),
 "tasks":records,
 "realDeviceChecks":{
  "device":"Samsung S22 Ultra through Z890 USB ADB",
  "wechatAppInstalled":True,
  "wechatDiscoverySearchOpened":True,
  "wechatPublicGenericSearchSubmitted":True,
  "wechatPublicVideoSearchFacetOpened":True,
  "wechatSpecificChineseExamQuerySucceeded":False,
  "wechatArticlesExtracted":0,
  "wechatVideosExtracted":0,
  "baiduWenkuAppInstalled":False,
  "baiduWenkuPublicHomepageReachable":True,
  "baiduWenkuDocumentsDownloaded":0
 },
 "wenkuHomepageCandidates":[
  {"documentTitle":"山东九五高中协作体2026-2027学年高三10月质量综合评估语文试题及答案.docx","sourceIndex":"https://wenku.baidu.com/","exactDocumentUrlVerified":False,"downloaded":False,"rights":"not_verified"},
  {"documentTitle":"2026年人教版七年级数学上册第一次月考试题.docx","sourceIndex":"https://wenku.baidu.com/","exactDocumentUrlVerified":False,"downloaded":False,"rights":"not_verified"},
  {"documentTitle":"2025年上海高中学业水平等级性考试物理试卷真题(含答案详解)(1).pdf","sourceIndex":"https://wenku.baidu.com/","exactDocumentUrlVerified":False,"downloaded":False,"rights":"not_verified"},
  {"documentTitle":"2026年上海高中生物学业水平合格性考试卷试题(含答案)(1).pdf","sourceIndex":"https://wenku.baidu.com/","exactDocumentUrlVerified":False,"downloaded":False,"rights":"not_verified"}
 ],
 "publicationRule":"A public preview, account login, screenshot or OCR result does NOT convey publication or resale rights."
}
dest=root/"data/discovery/wechat-wenku-seven-lane-plan-20261031.json"
dest.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("PLATFORMS",len(platforms),"LANES",len(src["lanes"]),"QUEUED_SEARCHES",len(records),
      "WENKU_PUBLIC_TITLE_CANDIDATES",len(d["wenkuHomepageCandidates"]),
      "ACTUAL_DOCUMENT_DOWNLOADS=0")
