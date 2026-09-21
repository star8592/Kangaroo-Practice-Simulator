#!/usr/bin/env python3
"""Prioritize source digitization verification before any translation."""
import json,argparse,re
from pathlib import Path

def generic(c): return len(c)==5 and all(x.get('label')==x.get('key') for x in c)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve();d=json.loads((root/'private/translation/queue.enriched.json').read_text()); out=[]
 for j in d.get('jobs',[]):
  origin=j.get('sourceTextOrigin') or 'unknown'; text=j.get('sourceText') or ''; ch=j.get('choices') or []; reasons=[]
  if origin=='unknown': reasons.append('recover_authoritative_source')
  if j.get('sourceTextNeedsReview'): reasons.append('verify_extraction')
  if generic(ch): reasons.append('recover_choice_content')
  if re.search(r'copyright|todos os direitos|point questions',text,re.I): reasons.append('remove_boundary_contamination')
  visual=bool(j.get('assetUrl')) and (generic(ch) or bool(re.search(r'figure|diagram|image|shown|following|figura|desenho|imagem',text,re.I)))
  if visual: reasons.append('verify_visual_content')
  # easiest/highest-confidence sources first; unresolved sources and visual-only items later
  rank={'html':10,'official_pdf_manual_repair':15,'pdftotext':30,'existing_ocr':50,'unknown':90}.get(origin,80)+(20 if generic(ch) else 0)+(15 if visual else 0)
  out.append({'examId':j.get('examId'),'questionNo':j.get('questionNo'),'sourceLanguage':j.get('sourceLanguage'),'origin':origin,'priority':rank,'reasons':reasons,'sourceFile':j.get('sourceFile'),'assetUrl':j.get('assetUrl')})
 out.sort(key=lambda x:(x['priority'],x['examId'] or '',x['questionNo'] or 0)); p=root/'private/source-digitization/verification-queue.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps({'questions':out},ensure_ascii=False,indent=2));
 from collections import Counter
 print(json.dumps({'questions':len(out),'priorityBands':dict(Counter(x['priority'] for x in out)),'first':out[:5],'output':str(p)},ensure_ascii=False));
if __name__=='__main__':main()
