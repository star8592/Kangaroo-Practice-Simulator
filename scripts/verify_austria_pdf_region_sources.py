#!/usr/bin/env python3
"""Verify Austrian official-PDF crop records when two PDF text extractions agree and the question structure is unambiguous."""
import argparse,json,re,unicodedata,hashlib
from pathlib import Path
from collections import Counter

VISUAL_RE=re.compile(r'\b(figure|diagram|shown|picture|right|left|graph|grid|square|triangle|circle|cube|net|shaded|umbrella|mirror|box|table|wheel|map)\b',re.I)

def norm(s):
 s=unicodedata.normalize('NFKC',s or '')
 for ch in ('−','–','—','‐'):s=s.replace(ch,'-')
 s=re.sub(r'\bE\s+\)', 'E)', s)
 return re.sub(r'\s+',' ',s).strip()
def tokens(s):return re.findall(r'[A-Za-zÀ-ÖØ-öø-ÿ]+|\d+(?:[,.]\d+)?|[^\w\s]',norm(s),re.UNICODE)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 rows=json.loads((root/'private/source-digitization/austria-pdf-region-text.json').read_text())['questions'];out=[];rej=[]
 for r in rows:
  k=(r['examId'],r['questionNo'])
  if r.get('textStatus')!='REGION_TEXT_CAPTURED':rej.append((k,'region_unavailable'));continue
  canonical=norm(r.get('rawText',''));fresh=norm(r.get('freshRegionText',''))
  if canonical==fresh:agreement='exact_text'
  elif tokens(canonical)==tokens(fresh):agreement='exact_tokens'
  else:rej.append((k,'independent_extractions_not_exact'));continue
  q=str(r['questionNo']);qm=re.match(r'^0*'+re.escape(q)+r'(?:\.|\s)+',canonical)
  if not qm:rej.append((k,'question_not_at_region_start'));continue
  marks=list(re.finditer(r'\(([ABCDE])\)',canonical));letters=[m.group(1) for m in marks]
  if letters!=list('ABCDE'):rej.append((k,'answer_markers_not_exact_A_to_E'));continue
  stem=canonical[qm.end():marks[0].start()].strip();choices=[]
  for i,m in enumerate(marks):
   end=marks[i+1].start() if i+1<len(marks) else len(canonical)
   choices.append({'key':'ABCDE'[i],'label':canonical[m.end():end].strip()})
  src=Path(r['sourceFile']);asset=root/r['assetPath']
  if sha(src)!=r.get('sourceSha256') or sha(asset)!=r.get('assetSha256'):rej.append((k,'evidence_hash_changed'));continue
  visual=bool(any(not c['label'] for c in choices) or VISUAL_RE.search(stem))
  out.append({'examId':r['examId'],'questionNo':r['questionNo'],'sourceLanguage':'en','sourceText':stem,'choices':choices,
   'canonicalQuestionText':canonical,'sourceFile':r['sourceFile'],'sourceSha256':r['sourceSha256'],'page':r['page'],'crop':r['crop'],
   'asset':{'path':r['assetPath'],'sha256':r['assetSha256']},'extractionMethod':'official_pdf_crop_dual_text_extraction',
   'verificationStatus':'SOURCE_VERIFIED','verificationMethod':'deterministic_exact_agreement_sourceMeta_vs_pdftotext_crop_plus_frozen_crop',
   'textAgreement':agreement,'visualDependency':visual})
 dst=root/'private/source-digitization/verified-austria-pdf-region.json';dst.write_text(json.dumps({'questions':out,'rejected':[{'examId':k[0],'questionNo':k[1],'reason':w} for k,w in rej]},ensure_ascii=False,indent=2))
 print(json.dumps({'total':len(out)+len(rej),'verified':len(out),'rejected':len(rej),'reasons':dict(Counter(w for _,w in rej)),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__':main()
