#!/usr/bin/env python3
"""Recover real source text for localization jobs from owned/local source files.

The legacy bank contains placeholder stems such as 'Read the official English
problem shown below.'. This tool extracts text from source PDFs and segments
numbered questions so translation jobs contain the actual problem wording.
It never marks a translation reviewed or student-ready.
"""
from __future__ import annotations
import argparse,json,re,subprocess,html
from collections import defaultdict
from pathlib import Path

PLACEHOLDER_RE=re.compile(r"^(Read|See|Refer to|Use)\b.*(official|problem|question|shown|source|image|below)",re.I)

def placeholder(text:str)->bool:
    text=(text or "").strip()
    return bool(PLACEHOLDER_RE.search(text)) or text in {"Read the official English problem shown below.","Read the official problem shown below."}
QUESTION_START=re.compile(r"(?m)^\s*(\d{1,2})\s*[.)]\s+")

def pdf_text(path:Path)->str:
    p=subprocess.run(["pdftotext","-layout",str(path),"-"],capture_output=True,text=True,check=True)
    return p.stdout.replace("\f","\n")

def html_question(path:Path)->str:
    raw=path.read_text(encoding="utf-8",errors="ignore")
    m=re.search(r'<div id="page_content"[^>]*>(.*?)<form\b',raw,re.I|re.S)
    if not m: return ""
    body=m.group(1)
    body=re.sub(r'<script\b.*?</script>',' ',body,flags=re.I|re.S)
    body=re.sub(r'<style\b.*?</style>',' ',body,flags=re.I|re.S)
    body=re.sub(r'<[^>]+>',' ',body)
    return re.sub(r'\s+',' ',html.unescape(body)).strip()

def html_choices(path:Path):
    raw=path.read_text(encoding="utf-8",errors="ignore")
    vals=re.findall(r'<button[^>]*class=["\'][^"\']*question[^"\']*["\'][^>]*>(.*?)</button>',raw,re.I|re.S)
    out=[]
    for i,v in enumerate(vals[:5]):
        v=re.sub(r'<[^>]+>',' ',v); v=re.sub(r'\s+',' ',html.unescape(v)).strip()
        out.append({'key':chr(65+i),'label':v})
    return out

def segments(text:str)->dict[int,str]:
    hits=list(QUESTION_START.finditer(text)); out={}
    for i,m in enumerate(hits):
        no=int(m.group(1))
        if no<1 or no>40 or no in out: continue
        end=hits[i+1].start() if i+1<len(hits) else len(text)
        chunk=re.sub(r"\s+"," ",text[m.end():end]).strip()
        # Require enough content to reject answer tables / headers.
        if len(chunk)>=18 and any(c.isalpha() for c in chunk): out[no]=chunk
    return out

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]); ap.add_argument('--output',type=Path); args=ap.parse_args()
    root=args.root.resolve(); qpath=root/'private/translation/queue.json'; data=json.loads(qpath.read_text(encoding='utf-8')); jobs=data['jobs']
    groups=defaultdict(list)
    for j in jobs: groups[j.get('sourceFile')].append(j)
    recovered=0; html_recovered=0; files=0; failures=[]
    for raw,rows in groups.items():
        if not raw: continue
        path=Path(raw)
        if not path.exists(): continue
        if path.suffix.lower()=='.html':
            try:
                txt=html_question(path); choices=html_choices(path)
                for j in rows:
                    if txt and (placeholder(str(j.get('sourceText') or ''))):
                        j['sourceText']=txt; j['sourceTextOrigin']='html'; j['sourceTextNeedsReview']=True
                        if choices: j['choices']=choices
                        recovered+=1; html_recovered+=1
            except Exception as e: failures.append({'sourceFile':raw,'error':str(e)})
            continue
        if path.suffix.lower()!='.pdf': continue
        try: found=segments(pdf_text(path)); files+=1
        except Exception as e: failures.append({'sourceFile':raw,'error':str(e)}); continue
        for j in rows:
            no=j.get('questionNo'); txt=found.get(int(no)) if no is not None else None
            current=str(j.get('sourceText') or '').strip()
            # Existing Portuguese OCR text is already useful source material; preserve it
            # and mark its provenance even when a clean numbered PDF segment is unavailable.
            if j.get('sourceLanguage')=='pt' and current and not placeholder(current):
                j['sourceTextOrigin']='existing_ocr'; j['sourceTextNeedsReview']=True; recovered+=1
            elif txt and placeholder(current):
                j['sourceText']=txt; j['sourceTextOrigin']='pdftotext'; j['sourceTextNeedsReview']=True; recovered+=1
    out=args.output or root/'private/translation/queue.enriched.json'; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps({'jobs':jobs,'meta':{'pdfFilesScanned':files,'sourceTextsRecovered':recovered,'htmlRecovered':html_recovered,'failures':failures}},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'jobs':len(jobs),'pdfFilesScanned':files,'sourceTextsRecovered':recovered,'htmlRecovered':html_recovered,'failures':len(failures),'output':str(out)},ensure_ascii=False)); return 0
if __name__=='__main__': raise SystemExit(main())
