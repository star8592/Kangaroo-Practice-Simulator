#!/usr/bin/env python3
"""Project the current approved research bank from an explicit AccentLab checkout.
Default checks for drift; --write intentionally updates the frozen projection.
Never publishes answer keys to the public frontend."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('accent_checkout',type=Path)
p.add_argument('--write',action='store_true')
a=p.parse_args()
source=a.accent_checkout.resolve()/'content/wuhan-2027'
names=['full-report-rubric-v1.json','reading-rubric-v1.json','oral-rubric-v1.json']
h=hashlib.sha256()
for name in names:
    b=(source/name).read_bytes()
    h.update(len(b).to_bytes(8,'big'));h.update(b)
data=json.loads((source/names[0]).read_text())
assert data['schemaVersion']==1 and data['scope']=='research_candidate_only'
assert len(data['papers'])==10
assert all(len(p['tasks'])==18 for p in data['papers'])
data['rubricSha256']=h.hexdigest()
target=ROOT/'backend/socthink-core/src/wuhan-research-report-contract.json'
payload=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
if a.write:target.write_text(payload)
else:assert target.read_text()==payload,'Frozen rubric projection differs; explicit review/update required'
print('WUHAN_RESEARCH_CONTRACT_PROJECTION_PASS 10 papers 180 tasks')
