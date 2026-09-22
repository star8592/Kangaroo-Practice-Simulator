#!/usr/bin/env python3
"""Conservatively verify Portugal questions from authoritative PDF-region text plus the frozen source crop."""
import argparse,json,re,unicodedata,hashlib
from pathlib import Path
from collections import Counter

NOISE_RE=re.compile(r'Canguru Matem[aá]tico|Todos os direitos|Universidade de Coimbra|SPM.?Centro|Departamento de Matem[aá]tica|autorização|reproduzido',re.I)

def norm(s):
 s=unicodedata.normalize('NFKC',s or '')
 for ch in ('–','—','‐','−'): s=s.replace(ch,'-')
 return re.sub(r'\s+',' ',s).strip()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def marker_re(letter=None):
 return re.compile(r'(?<!\w)'+(('['+'ABCDE'+']') if letter is None else re.escape(letter))+r'\s*[\)\.]')

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs'];J={(j['examId'],j['questionNo']):j for j in jobs if j.get('sourceTextOrigin')=='existing_ocr'}
 regs=json.loads((root/'private/source-digitization/portugal-pdf-region-text.json').read_text())['questions']
 out=[];rej=[]
 for r in regs:
  k=(r['examId'],r['questionNo']);j=J.get(k)
  if not j or r.get('textStatus')!='REGION_TEXT_CAPTURED': rej.append((k,'region_unavailable'));continue
  t=r.get('regionText',''); qm=re.search(r'(?<!\d)'+re.escape(str(r['questionNo']))+r'\s*[\.\)\-:]\s*',t)
  if not qm: rej.append((k,'question_marker_missing'));continue
  canonical=norm(t[qm.start():])
  src=norm(j.get('sourceText',''));sm=re.search(r'(?<!\d)'+re.escape(str(r['questionNo']))+r'\s*[\.\)\-:]\s*',src);src=src[sm.start():] if sm else src
  relation='exact' if src==canonical else ('canonical_in_source' if canonical in src else 'different')
  marks=list(marker_re().finditer(canonical));letters=[m.group(0).strip()[0] for m in marks]
  nextq=bool(re.search(r'(?<!\d)'+re.escape(str(r['questionNo']+1))+r'\s*[\.\)]\s+',canonical))
  if relation not in {'exact','canonical_in_source'}: rej.append((k,'not_verbatim_relation'));continue
  if letters!=list('ABCDE'): rej.append((k,'answer_markers_not_exact_A_to_E'));continue
  if nextq: rej.append((k,'next_question_contamination'));continue
  if NOISE_RE.search(canonical): rej.append((k,'known_noise'));continue
  # Structure stem and choices deterministically from the authoritative region text.
  stem=canonical[:marks[0].start()].strip()
  choices=[]
  for i,m in enumerate(marks):
   end=marks[i+1].start() if i+1<len(marks) else len(canonical)
   label=canonical[m.end():end].strip()
   choices.append({'key':'ABCDE'[i],'label':label})
  srcp=Path(r['sourceFile']);asset=root/r['assetPath']
  if sha(srcp)!=r.get('sourceSha256') or sha(asset)!=r.get('assetSha256'): rej.append((k,'evidence_hash_changed'));continue
  out.append({'examId':r['examId'],'questionNo':r['questionNo'],'sourceLanguage':'pt','sourceText':stem,'choices':choices,
   'canonicalQuestionText':canonical,'sourceFile':r['sourceFile'],'sourceSha256':r['sourceSha256'],'page':r['page'],'crop':r['crop'],
   'asset':{'path':r['assetPath'],'sha256':r['assetSha256']},'extractionMethod':'authoritative_pdf_region_text',
   'verificationStatus':'SOURCE_VERIFIED','verificationMethod':'deterministic_authoritative_pdf_region_text_plus_crop',
   'sourceRelation':relation,'visualDependency':any(not c['label'] for c in choices)})
 dst=root/'private/source-digitization/verified-portugal-pdf-region.json'
 dst.write_text(json.dumps({'questions':out,'rejected':[{'examId':k[0],'questionNo':k[1],'reason':why} for k,why in rej]},ensure_ascii=False,indent=2))
 print(json.dumps({'total':len(out)+len(rej),'verified':len(out),'rejected':len(rej),'reasons':dict(Counter(x for _,x in rej)),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__': main()
