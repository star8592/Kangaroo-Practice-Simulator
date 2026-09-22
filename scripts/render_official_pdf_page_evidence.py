#!/usr/bin/env python3
"""Render authoritative PDF pages used by Stage-1 records and freeze them with SHA-256 provenance."""
import argparse,json,hashlib,subprocess
from pathlib import Path

def hfile(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);ap.add_argument('--dpi',type=int,default=160);a=ap.parse_args();root=a.root.resolve()
 loc=json.loads((root/'private/source-digitization/pdf-page-locations.json').read_text())['questions']
 pairs={}
 for q in loc:
  if q.get('status')!='PAGE_LOCATED_EXACT': continue
  page=q['pageCandidates'][0]; key=(q['sourceFile'],page,q['sourceSha256']); pairs.setdefault(key,[]).append((q['examId'],q['questionNo']))
 pages=[]
 for (src,page,pdfsha),questions in sorted(pairs.items()):
  srcp=Path(src); outdir=root/'private/source-digitization/pdf-page-evidence'/pdfsha[:16]; outdir.mkdir(parents=True,exist_ok=True); out=outdir/f'page-{page:03d}.png'
  if not out.exists():
   prefix=str(out.with_suffix(''))
   subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-singlefile','-png','-r',str(a.dpi),str(srcp),prefix],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  pages.append({'sourceFile':src,'sourceSha256':pdfsha,'page':page,'evidencePath':str(out.relative_to(root)),'evidenceSha256':hfile(out),'dpi':a.dpi,'questions':[{'examId':e,'questionNo':n} for e,n in sorted(questions)]})
 dst=root/'private/source-digitization/pdf-page-evidence-manifest.json';dst.write_text(json.dumps({'pages':pages,'pageCount':len(pages)},ensure_ascii=False,indent=2));print(json.dumps({'pages':len(pages),'questions':sum(len(x['questions']) for x in pages),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__':main()
