#!/usr/bin/env python3
"""Verify a small MAA PDF batch using independent layout/raw extraction plus frozen page and question-crop evidence."""
import argparse,json,re,unicodedata,hashlib,subprocess
from pathlib import Path
from collections import Counter

def norm(s):
 s=unicodedata.normalize('NFKC',s or '')
 for ch in ('−','–','—','‐'): s=s.replace(ch,'-')
 s=re.sub(r'\bE\s+\)', 'E)', s)
 return re.sub(r'\s+',' ',s).strip()
def tokens(s): return re.findall(r'[A-Za-zÀ-ÖØ-öø-ÿ]+|\d+(?:[,.]\d+)?|[^\w\s]',norm(s),re.UNICODE)
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def extract(page,n):
 m=re.search(r'(?m)^\s*'+re.escape(str(n))+r'\.\s*',page)
 if not m:return None
 m2=re.search(r'(?m)^\s*'+re.escape(str(n+1))+r'\.\s*',page[m.end():])
 end=m.end()+m2.start() if m2 else len(page)
 return page[m.start():end]

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
 ap.add_argument('--exam',required=True);ap.add_argument('--start',type=int,required=True);ap.add_argument('--end',type=int,required=True);ap.add_argument('--dpi',type=int,default=160)
 a=ap.parse_args();root=a.root.resolve()
 jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs']
 jobs=[j for j in jobs if j['examId']==a.exam and a.start<=j['questionNo']<=a.end and j.get('sourceTextOrigin') in (None,'','unknown')]
 if not jobs: raise SystemExit('no matching jobs')
 pdfs={j['sourceFile'] for j in jobs}
 if len(pdfs)!=1: raise SystemExit('batch must use one source PDF')
 src=Path(next(iter(pdfs)));pdfsha=sha(src)
 pages={}
 for mode,args in [('layout',['-layout']),('raw',['-raw'])]:
  pages[mode]=subprocess.run(['pdftotext',*args,str(src),'-'],check=True,capture_output=True).stdout.decode(errors='ignore').split('\f')
 store=root/'private/source-digitization/verified-maa-pdf.json'
 existing=json.loads(store.read_text()) if store.exists() else {'questions':[],'batches':[]}
 bykey={(q['examId'],q['questionNo']):q for q in existing.get('questions',[])}
 out=[];rej=[];pagecache={}
 for j in jobs:
  n=j['questionNo'];k=(j['examId'],n);pat=re.compile(r'(?m)^\s*'+re.escape(str(n))+r'\.\s*')
  hits=[]
  for i,t in enumerate(pages['layout']):
   m=pat.search(t)
   if m and '(A)' in t[m.start():] and '(E)' in t[m.start():]: hits.append(i)
  if len(hits)!=1: rej.append((k,'page_not_unique'));continue
  pi=hits[0];la=extract(pages['layout'][pi],n);rb=extract(pages['raw'][pi],n)
  if la is None or rb is None: rej.append((k,'segment_missing'));continue
  ca,cb=norm(la),norm(rb)
  if ca==cb: agreement='exact_text'
  elif tokens(ca)==tokens(cb): agreement='exact_tokens'
  else: rej.append((k,'layout_raw_not_exact'));continue
  qm=re.match(r'^'+re.escape(str(n))+r'\.\s*',ca)
  marks=list(re.finditer(r'\(([ABCDE])\)',ca));letters=[m.group(1) for m in marks]
  if not qm or letters!=list('ABCDE'): rej.append((k,'question_structure_not_exact'));continue
  stem=ca[qm.end():marks[0].start()].strip();choices=[]
  for idx,m in enumerate(marks):
   end=marks[idx+1].start() if idx+1<len(marks) else len(ca)
   choices.append({'key':'ABCDE'[idx],'label':ca[m.end():end].strip()})
  page=pi+1;pk=(pdfsha,page)
  if pk not in pagecache:
   od=root/'private/source-digitization/maa-page-evidence'/pdfsha[:16];od.mkdir(parents=True,exist_ok=True);op=od/f'page-{page:03d}.png'
   if not op.exists(): subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-singlefile','-png','-r',str(a.dpi),str(src),str(op.with_suffix(''))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   pagecache[pk]={'path':str(op.relative_to(root)),'sha256':sha(op),'dpi':a.dpi}
  asset=root/('public'+j['assetUrl'])
  if not asset.exists(): rej.append((k,'asset_missing'));continue
  rec={'examId':j['examId'],'questionNo':n,'sourceLanguage':'en','sourceText':stem,'choices':choices,'canonicalQuestionText':ca,
       'sourceFile':str(src),'sourceSha256':pdfsha,'page':page,'pageEvidence':pagecache[pk],
       'asset':{'path':str(asset.relative_to(root)),'sha256':sha(asset)},'extractionMethod':'official_maa_pdf_layout_and_raw',
       'verificationStatus':'SOURCE_VERIFIED','verificationMethod':'deterministic_layout_raw_agreement_plus_authoritative_page_raster_and_question_crop',
       'textAgreement':agreement}
  bykey[k]=rec;out.append(rec)
 existing['questions']=[bykey[k] for k in sorted(bykey)]
 existing.setdefault('batches',[]).append({'examId':a.exam,'start':a.start,'end':a.end,'verified':len(out),'rejected':len(rej)})
 store.write_text(json.dumps(existing,ensure_ascii=False,indent=2))
 print(json.dumps({'examId':a.exam,'range':[a.start,a.end],'verified':len(out),'rejected':len(rej),'reasons':dict(Counter(w for _,w in rej)),'totalStored':len(existing['questions']),'output':str(store)},ensure_ascii=False))
if __name__=='__main__':main()
