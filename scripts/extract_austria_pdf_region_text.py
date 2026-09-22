#!/usr/bin/env python3
import argparse,json,re,subprocess,math,hashlib
from pathlib import Path
from collections import Counter
def clean(s):return re.sub(r'\s+',' ',s or '').strip()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 rows=json.loads((root/'private/source-digitization/austria-pdf-region-provenance.json').read_text())['questions'];out=[];c=Counter()
 for r in rows:
  x0,y0,x1,y1=[float(v) for v in r['crop']];cmd=['pdftotext','-layout','-f',str(r['page']),'-l',str(r['page']),'-r','72','-x',str(max(0,math.floor(x0))),'-y',str(max(0,math.floor(y0))),'-W',str(max(1,math.ceil(x1)-math.floor(x0))),'-H',str(max(1,math.ceil(y1)-math.floor(y0))),r['sourceFile'],'-']
  p=subprocess.run(cmd,capture_output=True);txt=clean(p.stdout.decode(errors='ignore').replace('\x0c',' ')) if p.returncode==0 else '';status='REGION_TEXT_CAPTURED' if txt else 'REGION_TEXT_EMPTY';c[status]+=1
  out.append({**r,'freshRegionText':txt,'freshRegionTextSha256':hashlib.sha256(txt.encode()).hexdigest() if txt else None,'textStatus':status})
 dst=root/'private/source-digitization/austria-pdf-region-text.json';dst.write_text(json.dumps({'questions':out,'summary':{'questions':len(out),'statuses':dict(c)}},ensure_ascii=False,indent=2));print(json.dumps({'questions':len(out),'statuses':dict(c),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__':main()
