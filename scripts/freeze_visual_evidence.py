#!/usr/bin/env python3
"""Freeze lossless question-crop evidence for visual questions.
This does not pretend to reconstruct missing original SVGs; it preserves exact local PNG evidence with dimensions/hash and official ref inventory.
"""
import argparse,json,hashlib,shutil
from pathlib import Path
from PIL import Image

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve(); audit=json.loads((root/'private/source-digitization/visual-audit.json').read_text());out=[]
 for x in audit['questions']:
  if x['status']!='CROP_EVIDENCE_ONLY':continue
  src=root/x['questionCrop']; dst=root/'private/source-digitization/visual-evidence'/x['examId']/f"q{x['questionNo']:02d}"/'question.png';dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
  with Image.open(dst) as im:w,h=im.size;fmt=im.format
  out.append({'examId':x['examId'],'questionNo':x['questionNo'],'evidencePath':str(dst.relative_to(root)),'sha256':sha(dst),'width':w,'height':h,'format':fmt,'officialImageRefs':x['officialRefs'],'status':'VISUAL_EVIDENCE_FROZEN','originalVectorAssetsRecovered':False})
 p=root/'private/source-digitization/visual-evidence-manifest.json';p.write_text(json.dumps({'questions':out},ensure_ascii=False,indent=2));print(json.dumps({'frozen':len(out),'originalVectorAssetsRecovered':0,'officialRefsPending':sum(len(x['officialImageRefs']) for x in out),'output':str(p)},ensure_ascii=False))
if __name__=='__main__':main()
