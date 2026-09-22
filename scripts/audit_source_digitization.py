#!/usr/bin/env python3
"""Audit Stage-1 source digitization independently of translation."""
import json,argparse,re
from collections import Counter
from pathlib import Path

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 qpath=root/'private/translation/queue.enriched.json'; data=json.loads(qpath.read_text(encoding='utf-8')); rows=[]
 verified={}
 for vp in [root/'private/source-digitization/verified-official-html.json',root/'private/source-digitization/verified-official-html-visual.json',root/'private/source-digitization/verified-official-pdf.json',root/'private/source-digitization/verified-portugal-pdf-region.json']:
  if vp.exists():
   for r in json.loads(vp.read_text(encoding='utf-8')).get('questions',[]):
    verified[(r.get('examId'),r.get('questionNo'))]=r
 for j in data.get('jobs',[]):
  text=(j.get('sourceText') or '').strip(); choices=j.get('choices') or []; origin=j.get('sourceTextOrigin') or 'unknown'; asset=j.get('assetUrl')
  issues=[]
  if not text: issues.append('missing_source_text')
  if origin=='unknown': issues.append('unknown_extraction_origin')
  if j.get('sourceTextNeedsReview'): issues.append('source_marked_needs_review')
  if choices and len(choices)!=5 and j.get('answerMode')=='choice': issues.append('choice_count_not_5')
  if len(choices)==5 and all(c.get('label')==c.get('key') for c in choices): issues.append('choice_labels_unrecovered')
  # OCR contamination / obviously broken mathematical extraction indicators.
  if re.search(r'copyright|todos os direitos|point questions',text,re.I): issues.append('boundary_or_footer_contamination')
  key=(j.get('examId'),j.get('questionNo')); vr=verified.get(key)
  if vr:
   status='SOURCE_VERIFIED'; issues=[]
  else:
   status='NEEDS_SOURCE_REVIEW' if text else 'RAW'
  rows.append({'examId':j.get('examId'),'questionNo':j.get('questionNo'),'origin':origin,'status':status,'issues':issues,'assetUrl':asset,'verificationMethod':(vr or {}).get('verificationMethod')})
 c=Counter(x['status'] for x in rows); ic=Counter(i for x in rows for i in x['issues'])
 out=root/'private/source-digitization/audit.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({'summary':{'questions':len(rows),'statuses':dict(c),'issues':dict(ic)},'questions':rows},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'questions':len(rows),'statuses':dict(c),'topIssues':ic.most_common(10),'output':str(out)},ensure_ascii=False));return 0
if __name__=='__main__':raise SystemExit(main())
