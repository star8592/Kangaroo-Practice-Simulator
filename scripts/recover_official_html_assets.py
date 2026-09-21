#!/usr/bin/env python3
"""Recover public official AMC question assets referenced by frozen HTML, preserving provenance and hashes."""
import argparse,json,hashlib,urllib.request,urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);ap.add_argument('--base',default='https://amt-cbr.cuttle.org');ap.add_argument('--workers',type=int,default=12);a=ap.parse_args();root=a.root.resolve();sem=json.loads((root/'private/source-digitization/html-visual-semantics.json').read_text())['questions']; out=[];ok=0;fail=0
 tasks=[]
 for q in sem:
  for x in q['assets']:
   tasks.append((q,x))
 def fetch(item):
  q,x=item;url=urllib.parse.urljoin(a.base,x['src']);ext=Path(urllib.parse.urlparse(url).path).suffix.lower() or '.bin';dst=root/'private/source-digitization/original-official-assets'/q['examId']/f"q{q['questionNo']:02d}"/(f"{x['order']:02d}-{x['role']}"+ext)
  if dst.exists():
   b=dst.read_bytes();return q,{**x,'officialUrl':url,'path':str(dst.relative_to(root)),'sha256':sha(b),'bytes':len(b),'status':'ORIGINAL_OFFICIAL_ASSET_RECOVERED'}
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'});b=urllib.request.urlopen(req,timeout=12).read();head=b[:300].lower();valid=(ext=='.svg' and b'<svg' in head) or (ext=='.png' and b.startswith(b'\x89PNG\r\n\x1a\n'))
   if not valid: raise ValueError('unexpected content')
   dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(b);return q,{**x,'officialUrl':url,'path':str(dst.relative_to(root)),'sha256':sha(b),'bytes':len(b),'status':'ORIGINAL_OFFICIAL_ASSET_RECOVERED'}
  except Exception as e:return q,{**x,'officialUrl':url,'status':'RECOVERY_FAILED','error':str(e)[:160]}
 grouped={}
 with ThreadPoolExecutor(max_workers=a.workers) as ex:
  for q,x in (f.result() for f in as_completed([ex.submit(fetch,t) for t in tasks])):
   grouped.setdefault((q['examId'],q['questionNo'],q['sourceSha256']),[]).append(x)
 for (exam,no,source),assets in sorted(grouped.items()):
  assets.sort(key=lambda x:x['order']);ok+=sum(x['status']=='ORIGINAL_OFFICIAL_ASSET_RECOVERED' for x in assets);fail+=sum(x['status']=='RECOVERY_FAILED' for x in assets);out.append({'examId':exam,'questionNo':no,'sourceSha256':source,'assets':assets})
 p=root/'private/source-digitization/original-official-assets-manifest.json';p.write_text(json.dumps({'questions':out,'recovered':ok,'failed':fail},ensure_ascii=False,indent=2));print(json.dumps({'questions':len(out),'recovered':ok,'failed':fail,'output':str(p)},ensure_ascii=False))
if __name__=='__main__':main()
