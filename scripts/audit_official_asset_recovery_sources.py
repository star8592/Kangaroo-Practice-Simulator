#!/usr/bin/env python3
"""Inventory local authoritative recovery routes for missing official visual assets."""
import argparse,json
from pathlib import Path
from collections import Counter

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve(); lib=Path('/mnt/disk1/master_data/Education/Australian_AMC_Library'); sem=json.loads((root/'private/source-digitization/html-visual-semantics.json').read_text())['questions']; pubs=json.loads((lib/'99_Metadata/problemo_published_sets.json').read_text()); pm={(int(x['year']),x['division']):x for x in pubs}; rows=[]
 for q in sem:
  parts=q['examId'].split('-');year=int(parts[2]); division={'middle-primary':'Middle Primary','upper-primary':'Upper Primary','junior':'Junior','intermediate':'Intermediate','senior':'Senior'}.get('-'.join(parts[3:])); meta=pm.get((year,division));
  rows.append({'examId':q['examId'],'questionNo':q['questionNo'],'missingAssets':len(q['assets']),'publishedSetId':meta.get('problem_set_id') if meta else None,'officialPdfLink':meta.get('pdf_link') if meta else None,'metadataUrl':meta.get('metadata_url') if meta else None,'recoveryStatus':'OFFICIAL_SET_METADATA_AVAILABLE' if meta else 'NO_SET_METADATA'})
 p=root/'private/source-digitization/official-asset-recovery-routes.json';p.write_text(json.dumps({'questions':rows},ensure_ascii=False,indent=2)); c=Counter(x['recoveryStatus'] for x in rows);print(json.dumps({'questions':len(rows),'assets':sum(x['missingAssets'] for x in rows),'statuses':dict(c),'sets':len({x['publishedSetId'] for x in rows if x['publishedSetId']}),'output':str(p)},ensure_ascii=False))
if __name__=='__main__':main()
