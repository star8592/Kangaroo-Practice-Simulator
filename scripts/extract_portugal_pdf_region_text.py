#!/usr/bin/env python3
"""Extract deterministic text from the authoritative Portugal PDF crop for every existing-OCR question."""
import argparse,json,re,subprocess,hashlib,math
from pathlib import Path
from collections import Counter

def clean(s): return re.sub(r'\s+',' ',s or '').strip()

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);ap.add_argument('--left-trim',type=float,default=40.0);a=ap.parse_args();root=a.root.resolve()
 prov=json.loads((root/'private/source-digitization/portugal-pdf-region-provenance.json').read_text())['questions']
 out=[];stats=Counter()
 for i,r in enumerate(prov,1):
  if r.get('status')!='PDF_REGION_BOUND':
   out.append({**r,'textStatus':'SOURCE_REGION_UNAVAILABLE'});stats['SOURCE_REGION_UNAVAILABLE']+=1;continue
  x0,y0,x1,y1=[float(v) for v in r['crop']]; x=max(x0,a.left_trim)
  cmd=['pdftotext','-layout','-f',str(r['page']),'-l',str(r['page']),'-r','72',
       '-x',str(max(0,math.floor(x))),'-y',str(max(0,math.floor(y0))),
       '-W',str(max(1,math.ceil(x1)-math.floor(x))),'-H',str(max(1,math.ceil(y1)-math.floor(y0))),
       r['sourceFile'],'-']
  p=subprocess.run(cmd,capture_output=True)
  if p.returncode:
   rec={**r,'textStatus':'PDF_TEXT_EXTRACTION_FAILED','error':p.stderr.decode(errors='ignore')[:160]};stats[rec['textStatus']]+=1;out.append(rec);continue
  txt=clean(p.stdout.decode(errors='ignore').replace('\x0c',' '))
  qpat=re.compile(r'^(?:'+re.escape(str(r['questionNo']))+r')\s*[\.\)\-:]\s*')
  has_q=bool(qpat.search(txt))
  markers=re.findall(r'(?<!\w)([ABCDE])\s*[\)\.]',txt)
  noise=bool(re.search(r'Canguru Matem[aá]tico|Todos os direitos|Universidade de Coimbra|SPM.?Centro|Departamento de Matem[aá]tica',txt,re.I))
  status='REGION_TEXT_CAPTURED' if txt else 'REGION_TEXT_EMPTY'
  stats[status]+=1
  out.append({**r,'regionText':txt,'regionTextSha256':hashlib.sha256(txt.encode()).hexdigest(),'textStatus':status,'questionMarkerAtStart':has_q,'choiceMarkers':markers,'choiceMarkerCount':len(markers),'knownNoiseDetected':noise,'textCrop':[round(x,2),round(y0,2),round(x1,2),round(y1,2)]})
 dst=root/'private/source-digitization/portugal-pdf-region-text.json';dst.write_text(json.dumps({'questions':out,'summary':{'questions':len(out),'statuses':dict(stats),'leftTrim':a.left_trim}},ensure_ascii=False,indent=2))
 print(json.dumps({'questions':len(out),'statuses':dict(stats),'output':str(dst)},ensure_ascii=False))
if __name__=='__main__': main()
