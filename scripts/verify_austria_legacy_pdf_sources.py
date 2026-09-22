#!/usr/bin/env python3
"""Recover and verify legacy Austrian placeholder questions directly from authoritative PDF text and page rasters."""
import argparse,json,re,unicodedata,hashlib,subprocess
from pathlib import Path
from collections import Counter

FOOTER_RE=re.compile(r'\s*[-‐‑‒–—]\s*[345]\s*point questions\s*[-‐‑‒–—]\s*$',re.I)

def norm(s):
 s=unicodedata.normalize('NFKC',s or '')
 for ch in ('−','–','—','‐'):s=s.replace(ch,'-')
 s=re.sub(r'\bE\s+\)','E)',s)
 return re.sub(r'\s+',' ',s).strip()
def toks(s):return re.findall(r'[A-Za-zÀ-ÖØ-öø-ÿ]+|\d+(?:[,.]\d+)?|[^\w\s]',norm(s),re.UNICODE)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def extract(text,n):
 m=re.search(r'(?m)^\s*0*'+re.escape(str(n))+r'\.\s*',text)
 if not m:return None
 m2=re.search(r'(?m)^\s*0*'+re.escape(str(n+1))+r'\.\s*',text[m.end():])
 end=m.end()+m2.start() if m2 else len(text)
 return text[m.start():end]

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);ap.add_argument('--dpi',type=int,default=160);a=ap.parse_args();root=a.root.resolve()
 jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs'];examcache={};targets=[]
 for j in jobs:
  if not j['examId'].startswith('at-') or j.get('sourceTextOrigin') not in (None,'','unknown'):continue
  ep=root/'private/exams'/f"{j['examId']}.json"
  if ep not in examcache:examcache[ep]={q['questionNo']:q for q in json.loads(ep.read_text())['questions']}
  q=examcache[ep][j['questionNo']];m=q.get('sourceMeta') or {}
  if isinstance(m.get('page'),int) and isinstance(m.get('crop'),list) and len(m['crop'])==4 and m.get('rawText'):continue
  targets.append((j,q))
 textcache={};out=[];rej=[];pagecache={}
 for j,q in targets:
  src=Path(j['sourceFile']);pdfsha=sha(src)
  if str(src) not in textcache:
   textcache[str(src)]={}
   for mode,args in [('layout',['-layout']),('raw',['-raw'])]:
    raw=subprocess.run(['pdftotext',*args,str(src),'-'],check=True,capture_output=True).stdout.decode(errors='ignore')
    textcache[str(src)][mode]=raw.split('\f')
  layout=textcache[str(src)]['layout'];rawpages=textcache[str(src)]['raw']
  pat=re.compile(r'(?m)^\s*0*'+re.escape(str(j['questionNo']))+r'\.\s*')
  hits=[i for i,t in enumerate(layout) if pat.search(t)]
  k=(j['examId'],j['questionNo'])
  if len(hits)!=1:rej.append((k,'page_not_unique'));continue
  pi=hits[0];la=extract(layout[pi],j['questionNo']);rb=extract(rawpages[pi],j['questionNo'])
  if la is None or rb is None:rej.append((k,'segment_missing'));continue
  ca,cb=norm(la),norm(rb)
  if ca==cb:agreement='exact_text'
  elif toks(ca)==toks(cb):agreement='exact_tokens'
  else:rej.append((k,'layout_raw_not_exact'));continue
  repair=None
  stripped=FOOTER_RE.sub('',ca).strip()
  if stripped!=ca:ca=stripped;repair='strip_section_header'
  qm=re.match(r'^0*'+re.escape(str(j['questionNo']))+r'\.\s*',ca)
  if not qm:rej.append((k,'question_not_at_start'));continue
  marks=list(re.finditer(r'\(([ABCDE])\)',ca));letters=[m.group(1) for m in marks]
  if letters!=list('ABCDE'):rej.append((k,'answer_markers_not_exact_A_to_E'));continue
  stem=ca[qm.end():marks[0].start()].strip();choices=[]
  for i,m in enumerate(marks):
   end=marks[i+1].start() if i+1<len(marks) else len(ca)
   choices.append({'key':'ABCDE'[i],'label':ca[m.end():end].strip()})
  page=pi+1;pk=(pdfsha,page)
  if pk not in pagecache:
   od=root/'private/source-digitization/austria-legacy-page-evidence'/pdfsha[:16];od.mkdir(parents=True,exist_ok=True)
   op=od/f'page-{page:03d}.png'
   if not op.exists():subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-singlefile','-png','-r',str(a.dpi),str(src),str(op.with_suffix(''))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   pagecache[pk]={'path':str(op.relative_to(root)),'sha256':sha(op),'dpi':a.dpi}
  asset=root/('public'+q['assetUrl'])
  if not asset.exists():rej.append((k,'asset_missing'));continue
  out.append({'examId':j['examId'],'questionNo':j['questionNo'],'sourceLanguage':'en','sourceText':stem,'choices':choices,'canonicalQuestionText':ca,
   'sourceFile':str(src),'sourceSha256':pdfsha,'page':page,'pageEvidence':pagecache[pk],
   'asset':{'path':str(asset.relative_to(root)),'sha256':sha(asset)},'sourceRepair':repair,'textAgreement':agreement,
   'extractionMethod':'official_pdf_layout_and_raw','verificationStatus':'SOURCE_VERIFIED',
   'verificationMethod':'deterministic_layout_raw_token_agreement_plus_authoritative_page_raster_and_question_crop'})
 dst=root/'private/source-digitization/verified-austria-legacy-pdf.json'
 dst.write_text(json.dumps({'questions':out,'rejected':[{'examId':k[0],'questionNo':k[1],'reason':w} for k,w in rej]},ensure_ascii=False,indent=2))
 print(json.dumps({'total':len(targets),'verified':len(out),'rejected':len(rej),'pageEvidence':len(pagecache),'reasons':dict(Counter(w for _,w in rej)),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__':main()
