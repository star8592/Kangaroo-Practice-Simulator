#!/usr/bin/env python3
"""Create frozen Stage-1 records from locally archived official AMC HTML.
Only auto-verifies questions whose stem and five textual choices are directly present in HTML and which have no question/choice images.
"""
import argparse,json,re,hashlib
from pathlib import Path
from bs4 import BeautifulSoup

def clean(x): return re.sub(r'\s+',' ',x).strip()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve(); q=json.loads((root/'private/translation/queue.enriched.json').read_text()); rows=[]; rejected=[]
 for j in q.get('jobs',[]):
  if j.get('sourceTextOrigin')!='html': continue
  p=Path(j.get('sourceFile',''))
  if not p.exists(): rejected.append((j,'missing_html'));continue
  raw=p.read_bytes(); soup=BeautifulSoup(raw.decode(errors='ignore'),'html.parser'); txt=clean(soup.get_text(' ',strip=True)); stem=clean(j.get('sourceText',''))
  # Official snapshots encode title then five answer values. Any image means manual visual verification.
  imgs=soup.find_all('img'); choices=j.get('choices') or []; actual=[clean(c.get('label','')) for c in choices]
  textual_choices=len(choices)==5 and all(v and v not in 'ABCDE' for v in actual)
  numeric_response=(not choices and soup.find('input',attrs={'type':'number','name':'answer'}) is not None)
  if not stem or stem not in txt: rejected.append((j,'stem_not_found_verbatim'));continue
  if imgs: rejected.append((j,'html_contains_images'));continue
  if not textual_choices and not numeric_response: rejected.append((j,'choices_not_structured_text'));continue
  if textual_choices and not all(v in txt for v in actual): rejected.append((j,'choice_not_found_verbatim'));continue
  rows.append({'examId':j['examId'],'questionNo':j['questionNo'],'sourceLanguage':j.get('sourceLanguage','en'),'sourceText':stem,'choices':choices,'sourceFile':str(p),'sourceSha256':hashlib.sha256(raw).hexdigest(),'extractionMethod':'official_html','verificationStatus':'SOURCE_VERIFIED','verificationMethod':'deterministic_verbatim_html_numeric_response' if numeric_response else 'deterministic_verbatim_html','assetUrl':j.get('assetUrl')})
 out=root/'private/source-digitization/verified-official-html.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({'questions':rows},ensure_ascii=False,indent=2));
 from collections import Counter
 print(json.dumps({'htmlTotal':sum(1 for j in q['jobs'] if j.get('sourceTextOrigin')=='html'),'verified':len(rows),'rejected':len(rejected),'reasons':dict(Counter(r for _,r in rejected)),'output':str(out)},ensure_ascii=False))
if __name__=='__main__':main()
