#!/usr/bin/env python3
"""Build private A/B/C/D localization QA summary and review queues.

Deterministic warnings are recalculated from the latest canonical source queue so
repairs cannot leave stale D-tier flags behind. Review-only metadata remains in
private draft files and is never auto-promoted.
"""
import argparse,json,glob
from collections import Counter
from pathlib import Path
from quality_tier import classify
from translation_quality import checks

def load_sources(root):
 p=root/'private/translation/queue.enriched.json'
 if not p.exists(): return {}
 try:d=json.loads(p.read_text(encoding='utf-8'))
 except Exception:return {}
 return {(j.get('examId'),j.get('questionNo')):j for j in d.get('jobs',[]) if j.get('examId') and j.get('questionNo') is not None}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);args=ap.parse_args();root=args.root.resolve(); sources=load_sources(root)
 rows=[]; recalculated=0
 for fn in glob.glob(str(root/'private/translations/auto/*.draft.json')):
  try:d=json.load(open(fn,encoding='utf-8'))
  except Exception:continue
  exam=Path(fn).name.removesuffix('.draft.json')
  for q in d.get('questions',[]):
   rv=q.get('review',{}); warnings=list(rv.get('qualityWarnings',[])); src=sources.get((exam,q.get('questionNo')))
   zh=q.get('localized',{}).get('zh',{}); zhstem=zh.get('stem','')
   if src and zhstem:
    deterministic=checks(src.get('sourceText',''),zhstem,zh.get('choices'),rv.get('assetUrl') or src.get('assetUrl'))
    # Preserve warnings produced by other validators; replace only this module's deterministic family.
    family={'numeric_mismatch','option_letter_mismatch','choice_labels_unrecovered','visual_review_required','visual_asset_missing'}
    warnings=[w for w in warnings if w not in family]+deterministic; warnings=list(dict.fromkeys(warnings)); recalculated+=1
   tier=classify(warnings,translation_status=rv.get('translationStatus','machine_draft'),visual_verified=rv.get('visualVerified',False),answer_verified=rv.get('answerVerified',False))
   rows.append({'examId':exam,'questionNo':q.get('questionNo'),'qualityWarnings':warnings,**tier})
 counts=Counter(r['qualityTier'] for r in rows);routes=Counter(r['reviewRoute'] for r in rows)
 out=root/'private/translation/review-queue.json';out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps({'summary':{'questions':len(rows),'recalculated':recalculated,'tiers':dict(sorted(counts.items())),'routes':dict(sorted(routes.items()))},'questions':rows},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'questions':len(rows),'recalculated':recalculated,'tiers':dict(sorted(counts.items())),'routes':dict(sorted(routes.items())),'output':str(out)},ensure_ascii=False));return 0
if __name__=='__main__':raise SystemExit(main())
