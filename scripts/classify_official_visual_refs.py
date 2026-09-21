#!/usr/bin/env python3
"""Classify official HTML visual refs by semantic filename without image interpretation."""
import argparse,json,re
from pathlib import Path
from collections import Counter

def role(ref):
 n=Path(ref).stem.lower()
 m=re.search(r'choice([abcde])$',n)
 if m:return 'choice_'+m.group(1).upper()
 if 'diagram' in n:return 'diagram'
 if re.search(r'(?:^|_)img\d+$',n):return 'illustration'
 if 'image' in n:return 'illustration'
 return 'unclassified'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve();m=json.loads((root/'private/source-digitization/visual-evidence-manifest.json').read_text());rows=[]
 for q in m['questions']:
  refs=[{'ref':r,'role':role(r)} for r in q['officialImageRefs']]; roles=Counter(x['role'] for x in refs); choice_roles={x['role'] for x in refs if x['role'].startswith('choice_')}; complete=choice_roles=={'choice_A','choice_B','choice_C','choice_D','choice_E'}
  rows.append({'examId':q['examId'],'questionNo':q['questionNo'],'refs':refs,'hasCompleteVisualChoices':complete,'roles':dict(roles),'evidencePath':q['evidencePath'],'status':'REFS_CLASSIFIED'})
 p=root/'private/source-digitization/visual-structure.json';p.write_text(json.dumps({'questions':rows},ensure_ascii=False,indent=2)); c=Counter(x['hasCompleteVisualChoices'] for x in rows);rc=Counter(r['role'] for x in rows for r in x['refs']);print(json.dumps({'questions':len(rows),'completeVisualChoiceSets':c[True],'roleCounts':dict(rc),'output':str(p)},ensure_ascii=False))
if __name__=='__main__':main()
