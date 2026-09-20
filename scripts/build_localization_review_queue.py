#!/usr/bin/env python3
"""Build private A/B/C/D localization QA summary and review queues."""
import argparse,json,glob
from collections import Counter
from pathlib import Path
from quality_tier import classify

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);args=ap.parse_args();root=args.root.resolve()
 rows=[]
 for fn in glob.glob(str(root/'private/translations/auto/*.draft.json')):
  try:d=json.load(open(fn,encoding='utf-8'))
  except Exception:continue
  exam=Path(fn).name.removesuffix('.draft.json')
  for q in d.get('questions',[]):
   rv=q.get('review',{}); tier=classify(rv.get('qualityWarnings',[]),translation_status=rv.get('translationStatus','machine_draft'),visual_verified=rv.get('visualVerified',False),answer_verified=rv.get('answerVerified',False))
   rows.append({'examId':exam,'questionNo':q.get('questionNo'),'qualityWarnings':rv.get('qualityWarnings',[]),**tier})
 counts=Counter(r['qualityTier'] for r in rows);routes=Counter(r['reviewRoute'] for r in rows)
 out=root/'private/translation/review-queue.json';out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps({'summary':{'questions':len(rows),'tiers':dict(sorted(counts.items())),'routes':dict(sorted(routes.items()))},'questions':rows},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'questions':len(rows),'tiers':dict(sorted(counts.items())),'routes':dict(sorted(routes.items())),'output':str(out)},ensure_ascii=False));return 0
if __name__=='__main__':raise SystemExit(main())
