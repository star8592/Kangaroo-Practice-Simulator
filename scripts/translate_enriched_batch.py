#!/usr/bin/env python3
"""Translate enriched source-text jobs with the local Ollama model into private draft sidecars."""
from __future__ import annotations
import argparse,json,re,urllib.request
from collections import defaultdict
from pathlib import Path
from clean_translation_source import clean_source

CJK=re.compile(r'[\u3400-\u9fff]')

def ask(model:str,text:str)->str:
    prompt='''你是数学竞赛题专业翻译。把下面数学竞赛题准确翻译成简体中文。原文可能是英语或葡萄牙语。严格保留所有数字、算式、单位、选项字母和数学关系；不要解题，不要解释，不要添加原文没有的信息。只输出中文题目正文。\n\n英文：'''+text
    body=json.dumps({'model':model,'prompt':prompt,'stream':False,'think':False,'options':{'temperature':0.1,'num_predict':512}}).encode()
    req=urllib.request.Request('http://127.0.0.1:11434/api/generate',data=body,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=180) as r: return json.load(r)['response'].strip()

def nums(s): return re.findall(r'\d+(?:\.\d+)?',s or '')

def suspicious_source(s):
    low=(s or '').lower()
    noise=('departamento de matemática','universidade de coimbra','com autorização','reproduzido apenas','spm‐centro','spm-centro')
    return any(x in low for x in noise)


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]); ap.add_argument('--model',default='qwen3.8:9b'); ap.add_argument('--limit',type=int,default=24); ap.add_argument('--exam'); args=ap.parse_args(); root=args.root.resolve()
    data=json.load(open(root/'private/translation/queue.enriched.json',encoding='utf-8')); jobs=[j for j in data['jobs'] if j.get('sourceTextOrigin') in ('pdftotext','html','existing_ocr')]
    if args.exam: jobs=[j for j in jobs if j['examId']==args.exam]
    jobs=jobs[:args.limit]; grouped=defaultdict(list); ok=0; rejected=0
    for j in jobs:
        source,cleanup_flags=clean_source(j['sourceText'])
        zh=ask(args.model,source); reasons=[]
        if not CJK.search(zh): reasons.append('missing_chinese')
        if nums(source)!=nums(zh): reasons.append('numeric_mismatch')
        if suspicious_source(source): reasons.append('source_ocr_noise')
        row={'questionNo':j['questionNo'],'localized':{'en':{'stem':source,'choices':j.get('choices',[])},'zh':{'stem':zh,'choices':j.get('choices',[])}},'review':{'translationStatus':'machine_draft','needsReview':True,'verified':False,'sourceTextRecovered':True,'qualityWarnings':reasons,'sourceCleanup':cleanup_flags}}
        grouped[j['examId']].append(row); ok+=not reasons; rejected+=bool(reasons)
    outdir=root/'private/translations/auto'; outdir.mkdir(parents=True,exist_ok=True)
    for exam,rows in grouped.items():
        target=outdir/f'{exam}.draft.json'
        existing=[]
        if target.exists():
            try: existing=json.loads(target.read_text(encoding='utf-8')).get('questions',[])
            except Exception: existing=[]
        merged={int(r['questionNo']):r for r in existing if 'questionNo' in r}
        merged.update({int(r['questionNo']):r for r in rows})
        target.write_text(json.dumps({'examId':exam,'model':args.model,'questions':[merged[k] for k in sorted(merged)]},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'translated':len(jobs),'qualityPass':ok,'needsFix':rejected,'exams':list(grouped),'output':str(outdir)},ensure_ascii=False))
if __name__=='__main__': main()
