#!/usr/bin/env python3
"""Audit visual evidence completeness for Stage-1 digitization."""
import json,argparse
from pathlib import Path
from bs4 import BeautifulSoup
from collections import Counter

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve();q=json.loads((root/'private/translation/queue.enriched.json').read_text()); rows=[]
 for j in q.get('jobs',[]):
  if j.get('sourceTextOrigin')!='html':continue
  sf=Path(j.get('sourceFile','')); refs=[]
  if sf.exists(): refs=[x.get('src') for x in BeautifulSoup(sf.read_text(errors='ignore'),'html.parser').find_all('img') if x.get('src')]
  crop=root/'public'/(j.get('assetUrl') or '').lstrip('/') if (j.get('assetUrl') or '').startswith('/local-assets/') else None
  status='NO_VISUAL_REQUIRED' if not refs else ('CROP_EVIDENCE_ONLY' if crop and crop.exists() else 'VISUAL_MISSING')
  rows.append({'examId':j['examId'],'questionNo':j['questionNo'],'status':status,'officialRefs':refs,'questionCrop':str(crop.relative_to(root)) if crop and crop.exists() else None})
 c=Counter(x['status'] for x in rows);p=root/'private/source-digitization/visual-audit.json';p.write_text(json.dumps({'summary':dict(c),'questions':rows},ensure_ascii=False,indent=2));print(json.dumps({'summary':dict(c),'output':str(p)},ensure_ascii=False))
if __name__=='__main__':main()
