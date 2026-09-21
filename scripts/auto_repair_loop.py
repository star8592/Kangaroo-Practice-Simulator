#!/usr/bin/env python3
import argparse,json,glob,subprocess,time
from pathlib import Path

def run(root,cmd):
 p=subprocess.run(cmd,cwd=root,text=True,capture_output=True); print(p.stdout.strip(),flush=True)
 if p.returncode: print(p.stderr.strip(),flush=True); raise SystemExit(p.returncode)

def summary(root):
 p=root/'private/translation/review-queue.json'
 if not p.exists(): return {}
 return json.load(open(p,encoding='utf-8')).get('summary',{})

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);ap.add_argument('--rounds',type=int,default=20);ap.add_argument('--vision-batch',type=int,default=25);ap.add_argument('--sleep',type=int,default=2);a=ap.parse_args();root=a.root.resolve()
 for i in range(1,a.rounds+1):
  print(json.dumps({'round':i,'phase':'review_queue','before':summary(root)},ensure_ascii=False),flush=True)
  run(root,['python3','scripts/build_localization_review_queue.py'])
  before=summary(root); d0=before.get('tiers',{}).get('D',0)
  # Only vision candidates with damaged/unrecovered choices are attempted automatically.
  run(root,['python3','scripts/recover_visual_question.py','--model','qwen3-vl:8b','--limit',str(a.vision_batch),'--skip-existing'])
  run(root,['python3','scripts/build_localization_review_queue.py'])
  after=summary(root); d1=after.get('tiers',{}).get('D',0)
  print(json.dumps({'round':i,'D_before':d0,'D_after':d1,'delta':d1-d0,'summary':after},ensure_ascii=False),flush=True)
  time.sleep(a.sleep)
 print(json.dumps({'complete':True,'summary':summary(root)},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
