#!/usr/bin/env python3
"""Verify German official-PDF questions when two independent PDF text extractions agree exactly after safe normalization."""
import argparse,json,re,unicodedata,hashlib
from pathlib import Path
from collections import Counter

VISUAL_RE=re.compile(r'\b(figure|diagram|shown|right|left|graph|tile|tiles|circle|sphere|cube|square|triangle|shaded|drawing|picture|grid|table)\b',re.I)

def norm(s):
 s=unicodedata.normalize('NFKC',s or '')
 for ch in ('−','–','—','‐'): s=s.replace(ch,'-')
 s=re.sub(r'\bE\s+\)', 'E)', s)
 return re.sub(r'\s+',' ',s).strip()

def tokens(s): return re.findall(r'[A-Za-zÀ-ÖØ-öø-ÿ]+|\d+(?:[,.]\d+)?|[^\w\s]',norm(s),re.UNICODE)
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 rows=json.loads((root/'private/source-digitization/germany-pdf-region-text.json').read_text())['questions']
 out=[];rej=[]
 for r in rows:
  k=(r['examId'],r['questionNo'])
  if r.get('textStatus')!='REGION_TEXT_CAPTURED': rej.append((k,'region_unavailable'));continue
  canonical=norm(r.get('rawText','')); fresh=norm(r.get('freshRegionText',''))
  if not canonical: rej.append((k,'region_empty'));continue
  if canonical==fresh: agreement='exact_text'
  elif tokens(canonical)==tokens(fresh): agreement='exact_tokens'
  elif re.sub(r'\s+','',canonical)==re.sub(r'\s+','',fresh): agreement='whitespace_only'
  else: rej.append((k,'independent_extractions_not_exact'));continue
  key=r.get('sourceKey') or ''
  pos=canonical.find(key)
  if pos<0: rej.append((k,'source_key_missing'));continue
  preamble=canonical[:pos].strip();body=canonical[pos:].strip()
  marks=list(re.finditer(r'\(([ABCDE])\)',body));letters=[m.group(1) for m in marks]
  if letters!=list('ABCDE'): rej.append((k,'answer_markers_not_exact_A_to_E'));continue
  stem=body[len(key):marks[0].start()].strip()
  choices=[]
  for i,m in enumerate(marks):
   end=marks[i+1].start() if i+1<len(marks) else len(body)
   choices.append({'key':'ABCDE'[i],'label':body[m.end():end].strip()})
  src=Path(r['sourceFile']);asset=root/r['assetPath']
  if sha(src)!=r.get('sourceSha256') or sha(asset)!=r.get('assetSha256'): rej.append((k,'evidence_hash_changed'));continue
  visual=bool(preamble or any(not c['label'] for c in choices) or VISUAL_RE.search(stem))
  out.append({'examId':r['examId'],'questionNo':r['questionNo'],'sourceLanguage':'en','sourceKey':key,
   'sourceText':stem,'choices':choices,'canonicalQuestionText':canonical,'visualPreamble':preamble,
   'sourceFile':r['sourceFile'],'sourceSha256':r['sourceSha256'],'page':r['page'],'crop':r['crop'],
   'asset':{'path':r['assetPath'],'sha256':r['assetSha256']},
   'extractionMethod':'official_pdf_crop_dual_text_extraction','verificationStatus':'SOURCE_VERIFIED',
   'verificationMethod':'deterministic_exact_agreement_sourceMeta_vs_pdftotext_crop_plus_frozen_crop','textAgreement':agreement,
   'visualDependency':visual})
 dst=root/'private/source-digitization/verified-germany-pdf-region.json'
 dst.write_text(json.dumps({'questions':out,'rejected':[{'examId':k[0],'questionNo':k[1],'reason':why} for k,why in rej]},ensure_ascii=False,indent=2))
 print(json.dumps({'total':len(out)+len(rej),'verified':len(out),'rejected':len(rej),'reasons':dict(Counter(x for _,x in rej)),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__':main()
