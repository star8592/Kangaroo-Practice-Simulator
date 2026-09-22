#!/usr/bin/env python3
"""Bind German unknown-origin placeholders to authoritative PDF crops already stored in exam sourceMeta."""
import argparse,json,hashlib
from pathlib import Path
from collections import Counter

def sha256(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs']
 cache={};pdfhash={};rows=[];issues=Counter()
 for j in jobs:
  if not j['examId'].startswith('de-') or j.get('sourceTextOrigin') not in (None,'','unknown'): continue
  ep=root/'private/exams'/f"{j['examId']}.json"
  if ep not in cache:
   cache[ep]={q['questionNo']:q for q in json.loads(ep.read_text())['questions']} if ep.exists() else {}
  q=cache[ep].get(j['questionNo'])
  if not q: issues['missing_exam_record']+=1;continue
  m=q.get('sourceMeta') or {};src=Path(q.get('sourceFile',''));asset=root/('public'+q.get('assetUrl',''))
  rec={'examId':j['examId'],'questionNo':j['questionNo'],'sourceLanguage':'en','sourceFile':str(src),
       'page':m.get('page'),'crop':m.get('crop'),'rawText':m.get('rawText'),'sourceKey':m.get('sourceKey'),
       'assetPath':str(asset.relative_to(root)) if asset.exists() else None,'status':'PDF_REGION_BOUND'}
  if not src.exists(): rec['status']='SOURCE_FILE_MISSING';issues['source_file_missing']+=1
  elif not isinstance(m.get('page'),int) or not isinstance(m.get('crop'),list) or len(m['crop'])!=4 or not m.get('rawText'):
   rec['status']='SOURCE_META_MISSING';issues['source_meta_missing']+=1
  elif not asset.exists(): rec['status']='ASSET_MISSING';issues['asset_missing']+=1
  else:
   if str(src) not in pdfhash:pdfhash[str(src)]=sha256(src)
   rec['sourceSha256']=pdfhash[str(src)];rec['assetSha256']=sha256(asset)
  rows.append(rec)
 out=root/'private/source-digitization/germany-pdf-region-provenance.json'
 out.write_text(json.dumps({'questions':rows,'summary':{'questions':len(rows),'pdfFiles':len(pdfhash),'statuses':dict(Counter(r['status'] for r in rows)),'issues':dict(issues)}},ensure_ascii=False,indent=2))
 print(json.dumps({'questions':len(rows),'pdfFiles':len(pdfhash),'statuses':dict(Counter(r['status'] for r in rows)),'issues':dict(issues),'output':str(out)},ensure_ascii=False))
if __name__=='__main__':main()
