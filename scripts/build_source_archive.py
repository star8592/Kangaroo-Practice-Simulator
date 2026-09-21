#!/usr/bin/env python3
import argparse,json,os,shutil,hashlib,re
from pathlib import Path

def safe(s): return re.sub(r'[^A-Za-z0-9._-]+','_',str(s or 'unknown')).strip('_') or 'unknown'
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--queue',default='private/translation/queue.enriched.json'); ap.add_argument('--out',default='private/source-archive'); ap.add_argument('--symlink',action='store_true',help='Use symlinks instead of default hard copies'); a=ap.parse_args()
 root=Path(a.out); files=root/'files'; files.mkdir(parents=True,exist_ok=True)
 d=json.load(open(a.queue)); jobs=d.get('jobs',d if isinstance(d,list) else [])
 by={}
 for j in jobs:
  src=j.get('sourceFile')
  if src: by.setdefault(src,[]).append((j.get('examId'),j.get('questionNo')))
 manifest=[]; missing=[]; used=set()
 for src,refs in sorted(by.items()):
  p=Path(src); exam=next((x[0] for x in refs if x[0]),'unknown'); qs=sorted({int(q) for _,q in refs if q is not None})
  if not p.exists(): missing.append({'sourceFile':src,'refs':refs}); continue
  # One authoritative source gets one stable unique archive path. Per-question HTML receives Qxx directory.
  qpart=f'q{qs[0]:02d}' if len(qs)==1 else 'paper'
  rel=Path(safe(exam))/qpart/p.name
  dst=files/rel
  if str(rel) in used:
   rel=Path(safe(exam))/qpart/(p.stem+'__'+hashlib.sha1(src.encode()).hexdigest()[:10]+p.suffix)
   dst=files/rel
  used.add(str(rel)); dst.parent.mkdir(parents=True,exist_ok=True)
  if dst.exists() or dst.is_symlink(): dst.unlink()
  if a.symlink: os.symlink(p,dst); mode='symlink'
  else: shutil.copy2(p,dst); mode='copy'
  manifest.append({'examId':exam,'archivePath':str(dst),'sourceFile':src,'mode':mode,'questions':qs,'size':p.stat().st_size})
 json.dump({'sources':manifest,'missing':missing},open(root/'manifest.json','w'),ensure_ascii=False,indent=2)
 with open(root/'README.md','w') as f:
  f.write('# Original Source Archive\n\nSelf-contained hard-copy archive for localization and QA. Layout: `files/<examId>/<paper|qNN>/<original filename>`. `manifest.json` maps every authoritative source to its archive copy and covered question numbers.\n')
 print(json.dumps({'uniqueSources':len(by),'copied':len(manifest),'missing':len(missing),'archive':str(root.resolve())},ensure_ascii=False))
if __name__=='__main__': main()
