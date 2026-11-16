#!/usr/bin/env python3
"""Low-rate, seven-lane public Xiaohongshu keyword rotation via a user-authorized USB device.

No hidden app APIs or bulk scraping, no login/paywall/captcha workarounds,
no non-public content extraction, no post media downloads or OCR.
"""
import argparse, fcntl, hashlib, io, json, os, subprocess, time
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote
from PIL import Image

ROOT=Path(os.environ["SOCTHINK_XHS_RESEARCH_DIR"]).expanduser().resolve()
PLAN=Path(__file__).resolve().parents[1]/"data/discovery/xhs-seven-lane-keyword-plan-20261031.json"

def utcnow():
 return datetime.now(timezone.utc)
def run_adb(serial,*args,timeout=20):
 p=subprocess.run(["adb","-s",serial,*args],timeout=timeout,check=True,capture_output=True)
 return p.stdout
def get_device(serial):
 p=subprocess.run(["adb","devices"],capture_output=True,text=True,check=True,timeout=10)
 return any(line.split()[:2]==[serial,"device"] for line in p.stdout.splitlines())
def focus(serial):
 out=run_adb(serial,"shell","dumpsys","window",timeout=12).decode(errors="replace")
 for line in out.splitlines():
  if "mCurrentFocus=" in line:return line
 return ""
def save(path,obj):
 p=path.with_suffix(".tmp")
 p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 p.chmod(0o600)
 os.replace(p,path)
def choose(plan,hist,n,now):
 recent=[r for r in hist if now-datetime.fromisoformat(r["timestamp"])<timedelta(days=14)]
 totals=Counter(x["lane"] for x in recent)
 used={x["query"] for x in recent}
 lane_used=Counter(x["lane"] for x in recent if now-datetime.fromisoformat(x["timestamp"])<timedelta(hours=24))
 choices=[]
 for lane in plan["lanes"]:
  avail=next((q for q in lane["queries"] if q not in used),None)
  if avail:choices.append((lane_used[lane["id"]],totals[lane["id"]],lane["id"],avail))
 choices.sort()
 return [(lane,query) for _,_,lane,query in choices[:n]]

def main():
 a=argparse.ArgumentParser()
 a.add_argument("--serial",help="Explicitly authorized Android USB ADB serial")
 a.add_argument("--dry-run",action="store_true",help="Preview only, without device access")
 a.add_argument("--max-queries",type=int,default=2)
 args=a.parse_args()
 plan=json.loads(PLAN.read_text(encoding="utf-8"))
 assert plan["schemaVersion"]==1
 limit=min(max(args.max_queries,0),plan["maxPublicSearchQueriesPerHour"])
 assert limit<=4
 ROOT.mkdir(parents=True,exist_ok=True)
 ROOT.chmod(0o700)
 with open(ROOT/".single_owner.lock","a+") as lock:
  try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  except BlockingIOError:
   print("SKIPPED: another SOCTHINK XHS pass has the mobile research lock")
   return
  f=ROOT/"history.json"
  hist=json.loads(f.read_text(encoding="utf-8")) if f.exists() else []
  now=utcnow()
  day=[r for r in hist if now-datetime.fromisoformat(r["timestamp"])<timedelta(hours=24)]
  hour=[r for r in hist if now-datetime.fromisoformat(r["timestamp"])<timedelta(hours=1)]
  remaining=min(limit,
     plan["maxPublicSearchQueriesPerRolling24Hours"]-len(day),
     plan["maxPublicSearchQueriesPerHour"]-len(hour))
  if remaining<=0:
   print("SKIPPED: conservative hourly or 24h public search limit reached")
   return
  targets=choose(plan,hist,remaining,now)
  if not targets:
   print("SKIPPED: all unique keywords have been researched within 14d")
   return
  if args.dry_run:
   print("NEXT_PUBLIC_QUERIES",json.dumps(targets,ensure_ascii=False))
   return
  if not args.serial or not get_device(args.serial):
   print("NO_ACCESS: authorized Android device absent; no app touched")
   return
  current=focus(args.serial)
  if "com.xingin.xhs" not in current:
   print("SKIPPED: user's device is focused on another app; no interaction")
   return
  completed=0
  for lane,query in targets:
   if "com.xingin.xhs" not in focus(args.serial):
    print("STOPPED: foreground app changed by user or Android")
    break
   uri="xhsdiscover://search/result?keyword="+quote(query,safe="")
   run_adb(args.serial,"shell","am","start","-a","android.intent.action.VIEW","-d",uri)
   time.sleep(10)  # limited normal UI browsing: no scroll, no hidden API
   png=run_adb(args.serial,"exec-out","screencap","-p",timeout=25)
   assert png.startswith(b"\x89PNG\r\n\x1a\n")
   image=Image.open(io.BytesIO(png))
   assert image.width>=400 and image.height>=700
   name=hashlib.sha256((query+now.isoformat()).encode()).hexdigest()[:18]+".png"
   path=ROOT/name
   path.write_bytes(png);path.chmod(0o600)
   event={"timestamp":utcnow().isoformat(timespec="seconds"),"lane":lane,
       "query":query,"evidenceFile":name,"sha256":hashlib.sha256(png).hexdigest(),
       "bytes":len(png),"status":"search_result_screen_requires_manual_review",
       "postVerified":False,"originalFileAcquired":False,"ocrDone":False,
       "rightToCommercialRedistribution":False}
   hist.append(event)
   completed+=1
   save(f,hist)
   print("XHS_PUBLIC_QUERY",lane,query,"SHA256",event["sha256"][:16],flush=True)
   time.sleep(3)
  print("COMPLETED_PUBLIC_QUERIES_THIS_PASS",completed)
if __name__=="__main__":main()
