#!/usr/bin/env python3
"""Recover question text/options from local question crops with Ollama vision.
Private output only; never marks content reviewed/student-ready.
"""
from __future__ import annotations
import argparse,base64,json,re,urllib.request,time
from pathlib import Path

def ask(model,path):
    prompt='''Leia apenas a questão de matemática mostrada na imagem. Devolva JSON puro com: sourceText (texto original completo da questão, sem cabeçalhos/rodapés), choices (lista de objetos key/label para A-E; se uma opção for somente figura use "[visual]"), visualDependent (boolean). Não resolva, não traduza e não invente texto ilegível.'''
    body=json.dumps({'model':model,'prompt':prompt,'images':[base64.b64encode(path.read_bytes()).decode()],'stream':False,'think':False,'format':'json','options':{'temperature':0,'num_predict':1400}}).encode()
    req=urllib.request.Request('http://127.0.0.1:11434/api/generate',data=body,headers={'Content-Type':'application/json'})
    last=None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req,timeout=240) as r:
                raw=json.load(r)['response'].strip()
            break
        except Exception as e:
            last=e
            if attempt<4: time.sleep(2**attempt)
    else:
        raise RuntimeError(f'Ollama vision request failed after retries: {last}')
    raw=re.sub(r'^```(?:json)?\s*|\s*```$','',raw,flags=re.I|re.S).strip()
    m=re.search(r'\{.*\}',raw,re.S)
    if not m: raise ValueError('vision model returned non-JSON: '+raw[:160])
    return json.loads(m.group(0))

def valid(d,expected_no=None):
    if not isinstance(d,dict) or len(str(d.get('sourceText','')).strip())<8:return False
    if expected_no is not None:
        m=re.match(r'\s*(\d{1,2})\s*[.)]',str(d.get('sourceText','')))
        if m and int(m.group(1)) != int(expected_no): return False
    c=d.get('choices',[])
    return not c or ([x.get('key') for x in c]==list('ABCDE') and all(str(x.get('label','')).strip() for x in c))

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);ap.add_argument('--model',default='qwen3-vl:8b');ap.add_argument('--limit',type=int,default=10);ap.add_argument('--exam');ap.add_argument('--retries',type=int,default=2);ap.add_argument('--skip-existing',action='store_true');args=ap.parse_args();root=args.root.resolve()
    jobs=json.load(open(root/'private/translation/queue.enriched.json',encoding='utf-8'))['jobs']; jobs=[j for j in jobs if j.get('sourceLanguage')=='pt' and j.get('choicesOrigin')!='inline_ocr' and j.get('assetUrl')]
    if args.exam:jobs=[j for j in jobs if j['examId']==args.exam]
    outdir=root/'private/translation/visual-recovery';outdir.mkdir(parents=True,exist_ok=True);ok=bad=0
    for j in jobs[:args.limit]:
        target=outdir/f"{j['examId']}-q{int(j['questionNo']):02d}.json"
        if args.skip_existing and target.exists():
            try:
                if json.loads(target.read_text(encoding='utf-8')).get('validStructure'): continue
            except Exception: pass
        p=root/'public'/j['assetUrl'].lstrip('/')
        d={'error':'not attempted'};good=False
        for attempt in range(args.retries+1):
            try:
                d=ask(args.model,p);good=valid(d,j['questionNo'])
                if good: break
            except Exception as e:d={'error':str(e)}
        row={'examId':j['examId'],'questionNo':j['questionNo'],'assetUrl':j['assetUrl'],'model':args.model,'verified':False,'needsReview':True,'recovery':d,'validStructure':good}
        target.write_text(json.dumps(row,ensure_ascii=False,indent=2),encoding='utf-8');ok+=good;bad+=not good
    print(json.dumps({'attempted':min(args.limit,len(jobs)),'validStructure':ok,'needsFix':bad,'remainingCandidates':len(jobs)},ensure_ascii=False))
if __name__=='__main__':main()
