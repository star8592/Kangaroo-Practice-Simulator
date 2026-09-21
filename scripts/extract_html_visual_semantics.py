#!/usr/bin/env python3
"""Extract deterministic visual semantics encoded by official AMC HTML."""
import argparse,json,re,hashlib
from pathlib import Path
from bs4 import BeautifulSoup
from collections import Counter

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve();jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs'];rows=[]
 for j in jobs:
  if j.get('sourceTextOrigin')!='html':continue
  sf=Path(j.get('sourceFile','')); 
  if not sf.exists():continue
  raw=sf.read_bytes(); soup=BeautifulSoup(raw.decode(errors='ignore'),'html.parser'); assets=[]
  for idx,img in enumerate(soup.find_all('img')):
   src=img.get('src');
   if not src:continue
   onclick=img.get('onclick',''); m=re.search(r"SaveAnswer\('([^']*choice([A-E]))'\)",onclick,re.I)
   role=('choice_'+m.group(2).upper()) if m else ('diagram' if 'diagram' in Path(src).stem.lower() else 'illustration')
   assets.append({'order':idx,'src':src,'role':role,'answerValue':m.group(1) if m else None,'class':img.get('class',[]),'style':img.get('style')})
  if assets:rows.append({'examId':j['examId'],'questionNo':j['questionNo'],'sourceFile':str(sf),'sourceSha256':hashlib.sha256(raw).hexdigest(),'assets':assets,'status':'HTML_SEMANTICS_EXTRACTED'})
 p=root/'private/source-digitization/html-visual-semantics.json';p.write_text(json.dumps({'questions':rows},ensure_ascii=False,indent=2));roles=Counter(a['role'] for q in rows for a in q['assets']); answer=sum(bool(a['answerValue']) for q in rows for a in q['assets']);print(json.dumps({'questions':len(rows),'assets':sum(roles.values()),'roles':dict(roles),'answerBoundAssets':answer,'output':str(p)},ensure_ascii=False))
if __name__=='__main__':main()
