#!/usr/bin/env python3
"""Verify official AMC HTML questions with recovered original visual assets."""
import json,re,hashlib
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
def clean(x):return re.sub(r'\s+',' ',x).strip()
q=json.loads((ROOT/'private/translation/queue.enriched.json').read_text())['jobs']
m=json.loads((ROOT/'private/source-digitization/original-official-assets-manifest.json').read_text())['questions']
M={(x['examId'],x['questionNo']):x for x in m};out=[];reject=[]
for j in q:
 if j.get('sourceTextOrigin')!='html':continue
 k=(j['examId'],j['questionNo']); am=M.get(k)
 if not am:continue
 p=Path(j['sourceFile']);raw=p.read_bytes();soup=BeautifulSoup(raw.decode(errors='ignore'),'html.parser');txt=clean(soup.get_text(' ',strip=True));stem=clean(j.get('sourceText',''));choices=j.get('choices') or [];labels=[clean(x.get('label','')) for x in choices];roles=[a['role'] for a in am['assets']]
 if not stem or stem not in txt:reject.append((k,'stem'));continue
 if not all(a['status']=='ORIGINAL_OFFICIAL_ASSET_RECOVERED' and Path(a['path']).is_file() and hashlib.sha256(Path(a['path']).read_bytes()).hexdigest()==a['sha256'] for a in am['assets']):reject.append((k,'asset'));continue
 visual_choices=len(choices)==5 and labels==list('ABCDE') and all('choice_'+x in roles for x in 'ABCDE')
 textual_choices=len(choices)==5 and all(v and v not in 'ABCDE' and v in txt for v in labels)
 numeric=not choices and soup.find('input',attrs={'type':'number','name':'answer'}) is not None
 if not (visual_choices or textual_choices or numeric):reject.append((k,'answer_structure'));continue
 method='official_html_original_assets_visual_choices' if visual_choices else ('official_html_original_assets_numeric_response' if numeric else 'official_html_original_assets_text_choices')
 out.append({'examId':j['examId'],'questionNo':j['questionNo'],'sourceLanguage':j.get('sourceLanguage','en'),'sourceText':stem,'choices':choices,'sourceFile':str(p),'sourceSha256':hashlib.sha256(raw).hexdigest(),'assets':am['assets'],'extractionMethod':'official_html','verificationStatus':'SOURCE_VERIFIED','verificationMethod':method,'assetUrl':j.get('assetUrl')})
p=ROOT/'private/source-digitization/verified-official-html-visual.json';p.write_text(json.dumps({'questions':out,'rejected':reject},ensure_ascii=False,indent=2));print(json.dumps({'visualTotal':len(M),'verified':len(out),'rejected':len(reject),'output':str(p)},ensure_ascii=False))
