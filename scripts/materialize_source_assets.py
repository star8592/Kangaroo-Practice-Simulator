#!/usr/bin/env python3
"""Materialize immutable local evidence for digitized questions.
Copies existing question crops and records unresolved official HTML image refs; never claims missing SVG refs are stored.
"""
import json,hashlib,shutil,argparse
from pathlib import Path
from bs4 import BeautifulSoup

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve();q=json.loads((root/'private/translation/queue.enriched.json').read_text()); dest=root/'private/source-digitization/assets'; manifest=[]; copied=0; unresolved=[]
 for j in q.get('jobs',[]):
  exam=str(j.get('examId')); no=int(j.get('questionNo')); rec={'examId':exam,'questionNo':no,'assets':[],'unresolvedOfficialRefs':[]}
  url=j.get('assetUrl') or ''
  if url.startswith('/local-assets/'):
   src=root/'public'/url.lstrip('/');
   if src.exists():
    out=dest/exam/f'q{no:02d}'/src.name;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,out);rec['assets'].append({'role':'question_crop','path':str(out.relative_to(root)),'sha256':sha(out)});copied+=1
  sf=Path(j.get('sourceFile',''))
  if j.get('sourceTextOrigin')=='html' and sf.exists():
   soup=BeautifulSoup(sf.read_text(errors='ignore'),'html.parser')
   for im in soup.find_all('img'):
    ref=im.get('src');
    if ref: rec['unresolvedOfficialRefs'].append(ref);unresolved.append((exam,no,ref))
  if rec['assets'] or rec['unresolvedOfficialRefs']:manifest.append(rec)
 out=root/'private/source-digitization/assets-manifest.json';out.write_text(json.dumps({'questions':manifest},ensure_ascii=False,indent=2));print(json.dumps({'questionRecords':len(manifest),'copiedQuestionCrops':copied,'unresolvedOfficialImageRefs':len(unresolved),'output':str(out)},ensure_ascii=False))
if __name__=='__main__':main()
