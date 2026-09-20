#!/usr/bin/env python3
import json,tempfile,subprocess
from pathlib import Path
with tempfile.TemporaryDirectory() as td:
 r=Path(td);p=r/'private/translations/auto';p.mkdir(parents=True);(p/'x.draft.json').write_text(json.dumps({'questions':[{'questionNo':1,'review':{'translationStatus':'machine_draft','qualityWarnings':[]}},{'questionNo':2,'review':{'translationStatus':'machine_draft','qualityWarnings':['numeric_mismatch']}}]}))
 subprocess.run(['python3',str(Path(__file__).with_name('build_localization_review_queue.py')),'--root',str(r)],check=True,capture_output=True,text=True)
 d=json.load(open(r/'private/translation/review-queue.json'));assert d['summary']['tiers']=={'B':1,'D':1}
print('LOCALIZATION_REVIEW_QUEUE=PASS')
