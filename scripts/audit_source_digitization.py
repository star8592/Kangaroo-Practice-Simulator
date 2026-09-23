#!/usr/bin/env python3
"""Audit Stage-1 source digitization independently of translation."""
import json,argparse,re
from collections import Counter
from pathlib import Path

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 qpath=root/'private/translation/queue.enriched.json'; data=json.loads(qpath.read_text(encoding='utf-8')); rows=[]
 invpath=root/'private/source-digitization/verification-queue.json'
 inventory=json.loads(invpath.read_text(encoding='utf-8')).get('questions',[]) if invpath.exists() else data.get('jobs',[])
 live={(j.get('examId'),j.get('questionNo')):j for j in data.get('jobs',[])}
 exam_cache={}
 verified={}
 for vp in [root/'private/source-digitization/verified-official-html.json',root/'private/source-digitization/verified-official-html-visual.json',root/'private/source-digitization/verified-official-pdf.json',root/'private/source-digitization/verified-official-pdf-manual.json',root/'private/source-digitization/verified-portugal-pdf-region.json',root/'private/source-digitization/verified-germany-pdf-region.json',root/'private/source-digitization/verified-austria-pdf-region.json',root/'private/source-digitization/verified-austria-legacy-pdf.json',root/'private/source-digitization/verified-maa-pdf.json',root/'private/source-digitization/verified-portugal-dual-pdf.json',root/'private/source-digitization/verified-source-ensemble-v2.json']:
  if vp.exists():
   for r in json.loads(vp.read_text(encoding='utf-8')).get('questions',[]):
    verified[(r.get('examId'),r.get('questionNo'))]=r
 for inv in inventory:
  key=(inv.get('examId'),inv.get('questionNo')); j=live.get(key)
  if j is None:
   ep=root/'private/exams'/f"{inv.get('examId')}.json"
   if ep not in exam_cache:
    if ep.exists():
     exam_cache[ep]={q.get('questionNo'):q for q in json.loads(ep.read_text(encoding='utf-8')).get('questions',[])}
    else: exam_cache[ep]={}
   q=exam_cache[ep].get(inv.get('questionNo')) or {}
   en=(q.get('localized') or {}).get('en') or {}
   j={
    'examId':inv.get('examId'),'questionNo':inv.get('questionNo'),
    'sourceText':en.get('stem') or q.get('stem') or '',
    'choices':en.get('choices') or q.get('choices') or [],
    'answerMode':'choice' if (en.get('choices') or q.get('choices')) else q.get('answerMode'),
    'assetUrl':q.get('assetUrl') or inv.get('assetUrl'),
    'sourceFile':q.get('sourceFile') or inv.get('sourceFile'),
   }
  text=(j.get('sourceText') or j.get('stem') or '').strip(); choices=j.get('choices') or []; origin=inv.get('origin') or j.get('sourceTextOrigin') or 'unknown'; asset=j.get('assetUrl') or inv.get('assetUrl')
  issues=[]
  if not text: issues.append('missing_source_text')
  if origin=='unknown': issues.append('unknown_extraction_origin')
  if j.get('sourceTextNeedsReview'): issues.append('source_marked_needs_review')
  if choices and len(choices)!=5 and j.get('answerMode')=='choice': issues.append('choice_count_not_5')
  if len(choices)==5 and all(c.get('label')==c.get('key') for c in choices): issues.append('choice_labels_unrecovered')
  # OCR contamination / obviously broken mathematical extraction indicators.
  if re.search(r'copyright|todos os direitos|point questions',text,re.I): issues.append('boundary_or_footer_contamination')
  vr=verified.get(key)
  if vr:
   status='SOURCE_VERIFIED'; issues=[]
  else:
   status='NEEDS_SOURCE_REVIEW' if text else 'RAW'
  rows.append({'examId':j.get('examId'),'questionNo':j.get('questionNo'),'origin':origin,'status':status,'issues':issues,'assetUrl':asset,'verificationMethod':(vr or {}).get('verificationMethod')})
 c=Counter(x['status'] for x in rows); ic=Counter(i for x in rows for i in x['issues'])
 out=root/'private/source-digitization/audit.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({'summary':{'questions':len(rows),'statuses':dict(c),'issues':dict(ic)},'questions':rows},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'questions':len(rows),'statuses':dict(c),'topIssues':ic.most_common(10),'output':str(out)},ensure_ascii=False));return 0
if __name__=='__main__':raise SystemExit(main())
