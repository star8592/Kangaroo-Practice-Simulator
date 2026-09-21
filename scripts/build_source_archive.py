#!/usr/bin/env python3
import argparse,json,os,shutil,hashlib
from pathlib import Path

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--queue',default='private/translation/queue.enriched.json'); ap.add_argument('--out',default='private/source-archive'); ap.add_argument('--copy',action='store_true'); a=ap.parse_args()
 root=Path(a.out); files=root/'files'; files.mkdir(parents=True,exist_ok=True)
 d=json.load(open(a.queue)); jobs=d.get('jobs',d if isinstance(d,list) else [])
 by={}
 for j in jobs:
  src=j.get('sourceFile');
  if not src: continue
  by.setdefault(src,[]).append((j.get('examId'),j.get('questionNo')))
 manifest=[]; missing=[]
 for src,refs in sorted(by.items()):
  p=Path(src); exam=next((x[0] for x in refs if x[0]),'unknown'); suffix=p.suffix.lower() or '.bin'; name=f'{exam}__{p.stem}{suffix}'; dst=files/name
  if not p.exists(): missing.append({'sourceFile':src,'refs':refs}); continue
  if dst.exists() or dst.is_symlink(): dst.unlink()
  if a.copy: shutil.copy2(p,dst); mode='copy'
  else: os.symlink(p,dst); mode='symlink'
  manifest.append({'examId':exam,'archivePath':str(dst),'sourceFile':src,'mode':mode,'questions':sorted({int(q) for _,q in refs if q is not None}),'size':p.stat().st_size})
 json.dump({'sources':manifest,'missing':missing},open(root/'manifest.json','w'),ensure_ascii=False,indent=2)
 with open(root/'README.md','w') as f:
  f.write('# Original Source Archive\n\nGenerated index for localization/QA. `files/` uses symlinks by default, so original PDFs are not duplicated. `manifest.json` maps each exam to its authoritative source path and covered question numbers.\n')
 print(json.dumps({'uniqueSources':len(by),'linked':len(manifest),'missing':len(missing),'archive':str(root.resolve())},ensure_ascii=False))
if __name__=='__main__': main()
