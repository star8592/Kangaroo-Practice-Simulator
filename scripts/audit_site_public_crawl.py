#!/usr/bin/env python3
"""Read-only, bounded anonymous public-site crawl for SOC THINK IA validation."""
import collections
import concurrent.futures
import datetime
from html.parser import HTMLParser
import json
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE="https://socthink.cn"
ROOT=pathlib.Path(__file__).resolve().parents[1]
MAX_PAGES=150
SEEDS=["/","/assessments","/resources","/career","/skill-labs","/assessment-center","/shop","/exam-planner","/arithmetic","/competitions","/events","/review","/skill-labs/books","/privacy","/terms","/digital-purchase-policy"]
EXCLUDE=("/api/","/admin","/account","/parent","/student","/login","/membership","/verification","/_next","/report","/result","/arithmetic/session")
DYNAMIC_LIMITS={"/exam/":10,"/shop/":15,"/career/":40,"/skill-labs/books/":15,"/resources/competitions/":10}
T=chr(96)
class HtmlAudit(HTMLParser):
 def __init__(self):
  super().__init__()
  self.links=set();self.canonical=None;self.robots=None;self.mains=0
 def handle_starttag(self,tag,attrs):
  data=dict(attrs)
  if tag=="a" and data.get("href"):self.links.add(data["href"])
  if tag=="link" and "canonical" in data.get("rel","").split():self.canonical=data.get("href")
  if tag=="meta" and data.get("name","").lower()=="robots":self.robots=data.get("content")
  if tag=="main":self.mains+=1
def normalize(href):
 try:
  u=urllib.parse.urlparse(urllib.parse.urljoin(BASE,href))
  if u.scheme!="https" or u.netloc!="socthink.cn":return None
  p=u.path.rstrip("/") or "/"
  if any(p==v.rstrip("/") or p.startswith(v) for v in EXCLUDE):return None
  if "/download" in p or p.endswith(".py"):return None
  if re.search(r"\.(?:pdf|png|jpg|jpeg|webp|js|css|woff|ico|zip|md|ics)$",p,re.I):return None
  return p
 except ValueError:return None
def fetch(path):
 try:
  req=urllib.request.Request(BASE+path,headers={"User-Agent":"SOCTHINK-owned-IA-audit/1.0","Cache-Control":"no-cache"})
  with urllib.request.urlopen(req,timeout=9) as r:
   final=urllib.parse.urlparse(r.geturl()).path; status=r.status
   if "text/html" not in r.headers.get("Content-Type",""):
    return dict(path=path,status=status,final=final,mains=None,canonical=None,robots=None,links=[])
   html=r.read(1000000).decode("utf-8","replace")
   parser=HtmlAudit();parser.feed(html)
   links=sorted(set(filter(None,(normalize(x) for x in parser.links))))
   return dict(path=path,status=status,final=final,mains=parser.mains,canonical=parser.canonical,robots=parser.robots,links=links)
 except urllib.error.HTTPError as e:return dict(path=path,status=e.code,final=path,mains=None,canonical=None,robots=None,links=[])
 except Exception as e:return dict(path=path,status="ERROR:"+type(e).__name__,final=path,mains=None,canonical=None,robots=None,links=[])
def addpath(p,q,seen,bucket):
 if not p or p in seen or len(seen)>=MAX_PAGES:return
 for prefix,limit in DYNAMIC_LIMITS.items():
  if p.startswith(prefix):
   if bucket[prefix]>=limit:return
   bucket[prefix]+=1;break
 seen.add(p);q.append(p)
# Sitemap first, then page links; 3 passes reach deep public page details.
try:
 with urllib.request.urlopen(BASE+"/sitemap.xml",timeout=12) as r:sitemap=r.read()
 locations=[a.text for a in ET.fromstring(sitemap).iter() if a.tag.endswith("loc") and a.text]
except Exception as e:
 locations=[];sitemap_error=type(e).__name__+":"+str(e)[:100]
else:sitemap_error=None
queue=[];seen=set();bucket=collections.Counter()
for p in SEEDS+[normalize(v) for v in locations]:addpath(p,queue,seen,bucket)
rows=[];parent_links=collections.defaultdict(set);index=0
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 while index<len(queue):
  batch=queue[index:index+10];index+=len(batch)
  for item in pool.map(fetch,batch):
   rows.append(item)
   for link in item["links"]:
    parent_links[link].add(item["path"])
    addpath(link,queue,seen,bucket)
 if len(rows)>=MAX_PAGES:pass
counts=collections.Counter(str(x["status"]) for x in rows)
suspect=[x for x in rows if str(x["status"]).startswith(("4","5","ERROR"))]
auth_redirects=[x for x in rows if x["final"]=="/login" and x["path"]!="/login"]
double=[x for x in rows if x["mains"] is not None and x["mains"]>1]
unlinked=[x for x in rows if not parent_links[x["path"]] and x["path"]!="/"]
date=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
lines=[
 "# SOC THINK 公网真实链接抽查（只读抓取）",
 "",
 "时间（UTC）："+date+"。原始基址："+BASE+"。脚本：scripts/audit_site_public_crawl.py。",
 "",
 "这不是完整私有权限 E2E，也不是对动态试卷/商品实例的全量验证。只读取公开、匿名、GET 的 HTML/站点地图；登录、订单、管理、报告、API、下载等敏感或状态页明确跳过，不能据此认定它们是孤儿。",
 "",
 "## 概况",
 "",
 "- 共抽查："+str(len(rows))+" 个公开站内 URL；当前脚本上限："+str(MAX_PAGES)+"；Sitemap 发现："+str(len(locations))+"；状态分布："+json.dumps(dict(counts),ensure_ascii=False)+"。",
 "- 匿名检索到多主地标页面："+str(len(double))+"；被本轮其他页面内链发现为 0 的条目："+str(len(unlinked))+"（不代表确定孤儿页，可能是 Sitemap 入口）。",
 "- 站点地图读取异常："+str(sitemap_error or "无")+"。",
 "- 原始内容最终跳转到 /login 的页面："+str(len(auth_redirects))+"。这类 HTTP 200 是**登录页**，不能计入原页面已成功展示。",
 "",
 "## 逐 URL 现场验证",
 "",
 "| URL | HTTP | 最终路径 | 页面 main 数 | canonical | 已发现站内入口数 |",
 "| --- | --- | --- | ---: | --- | ---: |",
]
for x in sorted(rows,key=lambda z:z["path"]):
 lines.append("| "+T+x["path"]+T+" | "+str(x["status"])+" | "+T+x["final"]+T+" | "+str(x["mains"] if x["mains"] is not None else "-")+" | "+(T+x["canonical"]+T if x["canonical"] else "未发现") +" | "+str(len(parent_links[x["path"]]))+" |")
lines+=["","## 实际 4xx/5xx/请求失败"]
if suspect:
 for x in suspect:lines.append("- "+T+x["path"]+T+"：HTTP "+str(x["status"]))
else:lines.append("- 本轮抽查未遇到；不代表所有未扫描页面通过。")
lines+=["","## 原目标跳转至登录页（需要身份测试，不算内容交付成功）"]
for x in auth_redirects:lines.append("- "+T+x["path"]+T+" → /login")
lines+=["","## 重复 main 地标（现场 HTML）"]
if double:
 for x in double:lines.append("- "+T+x["path"]+T+"："+str(x["mains"]))
else:lines.append("- 本轮公开页面未发现。")
lines += ["","## 不应误判的条目"]
for x in unlinked[:40]:lines.append("- "+T+x["path"]+T+"：本轮内链未命中，可能由 sitemap、动态链接或历史外链进入；需判断后才能认定孤儿。")
lines += ["","最终页面级归属以 [路由总账](SOCTHINK_PAGE_ROUTE_AUDIT.md) 及 [唯一 IA 总纲](SOCTHINK_SITE_ARCHITECTURE_MASTER.md) 为准。公开 200 不等于用户可以完成付款、考试和授权下载；这些另做具权限的真实回归。"]
output=ROOT/"docs/architecture/SOCTHINK_PUBLIC_LINK_CRAWL_20261103.md"
output.write_text("\n".join(lines)+"\n",encoding="utf8")
print(json.dumps({"date":date,"sampled":len(rows),"status":dict(counts),"sitemap":len(locations),"doubleMain":[x["path"] for x in double],"authRedirect":[x["path"] for x in auth_redirects],"suspect":[[x["path"],x["status"]] for x in suspect],"reportBytes":output.stat().st_size},ensure_ascii=False))
