#!/usr/bin/env python3
import json, glob, collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'private/translation/source-repair-queue.json'
hard={'numeric_mismatch','option_letter_mismatch','choice_labels_unrecovered','source_ocr_noise','source_math_gap','missing_chinese'}
items=[]; causes=collections.Counter()
for fn in sorted(glob.glob(str(ROOT/'private/translations/auto/*.draft.json'))):
    d=json.load(open(fn,encoding='utf-8'))
    for q in d.get('questions',[]):
        r=q.get('review',{}); ws=set(r.get('qualityWarnings',[])); hit=sorted(ws & hard)
        if not hit: continue
        for x in hit: causes[x]+=1
        route='vision_source_recovery' if ws & {'source_ocr_noise','source_math_gap','choice_labels_unrecovered'} else 'translation_recheck'
        items.append({'examId':d.get('examId') or q.get('examId'),'questionNo':q.get('questionNo'),'route':route,'causes':hit,'sourceFile':fn})
out.parent.mkdir(parents=True,exist_ok=True)
json.dump({'questions':len(items),'causes':dict(causes),'routes':dict(collections.Counter(x['route'] for x in items)),'items':items},open(out,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
print(json.dumps({'questions':len(items),'causes':dict(causes),'routes':dict(collections.Counter(x['route'] for x in items)),'output':str(out)},ensure_ascii=False))
