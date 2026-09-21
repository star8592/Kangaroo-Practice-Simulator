#!/usr/bin/env python3
import json,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as td:
 r=Path(td); (r/'private/translation').mkdir(parents=True); (r/'private/translations/auto').mkdir(parents=True)
 (r/'private/translation/queue.enriched.json').write_text(json.dumps({'jobs':[{'examId':'x','questionNo':1,'sourceText':'There are 12 balls. (A) 1 (B) 2','assetUrl':None}]}))
 draft={'questions':[{'questionNo':1,'localized':{'zh':{'stem':'有 12 个球。(A) 1 (B) 2','choices':[]}},'review':{'qualityWarnings':['numeric_mismatch'],'translationStatus':'machine_draft','needsReview':True,'verified':False}}]}
 (r/'private/translations/auto/x.draft.json').write_text(json.dumps(draft))
 subprocess.run(['python3',str(ROOT/'scripts/build_localization_review_queue.py'),'--root',str(r)],check=True,capture_output=True,text=True)
 out=json.loads((r/'private/translation/review-queue.json').read_text()); q=out['questions'][0]
 assert q['qualityWarnings']==[],q
 assert q['qualityTier']=='B',q
 assert out['summary']['recalculated']==1,out
print('BUILD_LOCALIZATION_REVIEW_QUEUE=PASS')
