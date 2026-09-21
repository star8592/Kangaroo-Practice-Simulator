#!/usr/bin/env python3
"""Create conservative candidate choice-region crops for questions with five official visual-choice refs.
Candidates are evidence derivatives only and are NEVER marked SOURCE_VERIFIED automatically.
"""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageChops

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def content_bbox(im):
 g=im.convert('L'); bg=Image.new('L',g.size,255); d=ImageChops.difference(g,bg); return d.point(lambda p:255 if p>12 else 0).getbbox()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve();s=json.loads((root/'private/source-digitization/visual-structure.json').read_text());rows=[]
 for q in s['questions']:
  if not q['hasCompleteVisualChoices']:continue
  src=root/q['evidencePath']; im=Image.open(src).convert('RGB'); box=content_bbox(im) or (0,0,*im.size); l,t,r,b=box
  # Bottom half is a deliberately broad candidate region: preserves all five choices but may include nearby text.
  y=max(t, t+(b-t)//2); crop=im.crop((l,y,r,b)); dst=root/'private/source-digitization/visual-choice-candidates'/q['examId']/f"q{q['questionNo']:02d}"/'choices-region.png';dst.parent.mkdir(parents=True,exist_ok=True);crop.save(dst,format='PNG',optimize=False)
  rows.append({'examId':q['examId'],'questionNo':q['questionNo'],'parentEvidence':q['evidencePath'],'candidatePath':str(dst.relative_to(root)),'cropBox':[l,y,r,b],'sha256':sha(dst),'status':'CANDIDATE_NEEDS_VISUAL_REVIEW','choiceRefs':[x for x in q['refs'] if x['role'].startswith('choice_')]})
 p=root/'private/source-digitization/visual-choice-candidates.json';p.write_text(json.dumps({'questions':rows},ensure_ascii=False,indent=2));print(json.dumps({'candidateSets':len(rows),'status':'CANDIDATE_NEEDS_VISUAL_REVIEW','output':str(p)},ensure_ascii=False))
if __name__=='__main__':main()
