#!/usr/bin/env python3
import argparse,json,re,hashlib,subprocess
from pathlib import Path
from collections import Counter

def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def filehash(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs']
 loc=json.loads((root/'private/source-digitization/pdf-page-locations.json').read_text())['questions'];L={(x['examId'],x['questionNo']):x for x in loc}
 ev=json.loads((root/'private/source-digitization/pdf-page-evidence-manifest.json').read_text())['pages'];E={(x['sourceSha256'],x['page']):x for x in ev}
 cache={};out=[];rej=[]
 for j in jobs:
  if j.get('sourceTextOrigin') not in {'pdftotext','official_pdf_manual_repair'}: continue
  k=(j['examId'],j['questionNo']);x=L.get(k)
  if not x or x.get('status')!='PAGE_LOCATED_EXACT': rej.append((k,'page_not_exact'));continue
  src=Path(x['sourceFile']);pdfsha=filehash(src)
  if pdfsha!=x['sourceSha256']: rej.append((k,'pdf_hash_changed'));continue
  page=x['pageCandidates'][0];pe=E.get((pdfsha,page))
  if not pe: rej.append((k,'page_evidence_missing'));continue
  ep=root/pe['evidencePath']
  if not ep.exists() or filehash(ep)!=pe['evidenceSha256']: rej.append((k,'page_evidence_hash'));continue
  if str(src) not in cache:
   raw=subprocess.run(['pdftotext','-layout',str(src),'-'],check=True,capture_output=True).stdout.decode(errors='ignore');cache[str(src)]=[clean(t) for t in raw.split('\f')]
  pagetxt=cache[str(src)][page-1]
  source=clean(j.get('sourceText',''));source=clean(re.sub(r'\s*[-‐‑‒–—]\s*[345]\s*[Pp]oint [Qq]uestions\s*[-‐‑‒–—]\s*',' ',source,flags=re.I));repair=None
  # Some imported text leaked the following numbered question into this record. Truncate only when the exact next-question marker is present.
  m=re.search(r'\s+'+re.escape(str(j['questionNo']+1))+r'\.(?=\s*[^0-9])',source)
  if m:
   candidate=clean(source[:m.start()])
   if candidate in pagetxt: source=candidate;repair='truncate_next_question_boundary'
  if source not in pagetxt:
   # Accept removal of a lone trailing page-number token only when the remainder is verbatim and option E still has content.
   m=re.search(r'\s+(\d)\s*$',source)
   if m and re.search(r'\(E\)\s+\S+',source[:m.start()]):
    candidate=clean(source[:m.start()])
    if candidate in pagetxt: source=candidate;repair='remove_trailing_page_number'
  if not source or source not in pagetxt: rej.append((k,'full_text_not_verbatim'));continue
  out.append({'examId':j['examId'],'questionNo':j['questionNo'],'sourceLanguage':j.get('sourceLanguage','en'),'sourceText':source,'choices':j.get('choices') or [],'sourceFile':str(src),'sourceSha256':pdfsha,'page':page,'pageEvidence':{'path':pe['evidencePath'],'sha256':pe['evidenceSha256'],'dpi':pe['dpi']},'extractionMethod':j.get('sourceTextOrigin'),'verificationStatus':'SOURCE_VERIFIED','verificationMethod':'deterministic_verbatim_pdf_text_plus_authoritative_page_raster','sourceRepair':repair,'assetUrl':j.get('assetUrl')})
 dst=root/'private/source-digitization/verified-official-pdf.json';dst.write_text(json.dumps({'questions':out,'rejected':[{'examId':k[0],'questionNo':k[1],'reason':r} for k,r in rej]},ensure_ascii=False,indent=2))
 print(json.dumps({'pdfTotal':len(out)+len(rej),'verified':len(out),'rejected':len(rej),'reasons':dict(Counter(r for _,r in rej)),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__':main()
