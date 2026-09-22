#!/usr/bin/env python3
"""Locate official-PDF source questions on exact PDF pages without claiming verification."""
import argparse,json,re,hashlib,subprocess
from pathlib import Path
from collections import Counter

def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs']
 jobs=[j for j in jobs if j.get('sourceTextOrigin') in {'pdftotext','official_pdf_manual_repair'}]
 cache={}; out=[]
 for j in jobs:
  p=Path(j.get('sourceFile',''))
  if not p.exists(): out.append({'examId':j['examId'],'questionNo':j['questionNo'],'status':'SOURCE_FILE_MISSING'});continue
  if str(p) not in cache:
   raw=p.read_bytes(); txt=subprocess.run(['pdftotext','-layout',str(p),'-'],check=True,capture_output=True).stdout.decode(errors='ignore')
   cache[str(p)]=(hashlib.sha256(raw).hexdigest(),[clean(x) for x in txt.split('\f')])
  pdfsha,pages=cache[str(p)]
  stem=clean(j.get('sourceText','')).split(' (A)',1)[0]
  # remove known section footer accidentally attached to end of stem
  stem=re.sub(r'\s*-\s*[345]\s*Point Questions\s*-\s*$','',stem,flags=re.I).strip()
  hits=[i+1 for i,t in enumerate(pages) if stem and stem in t]
  status='PAGE_LOCATED_EXACT' if len(hits)==1 else ('PAGE_AMBIGUOUS' if len(hits)>1 else 'PAGE_NOT_LOCATED')
  out.append({'examId':j['examId'],'questionNo':j['questionNo'],'sourceFile':str(p),'sourceSha256':pdfsha,'pageCandidates':hits,'status':status})
 dst=root/'private/source-digitization/pdf-page-locations.json';dst.write_text(json.dumps({'questions':out},ensure_ascii=False,indent=2))
 c=Counter(x['status'] for x in out);print(json.dumps({'questions':len(out),'statuses':dict(c),'pdfFiles':len(cache),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__':main()
