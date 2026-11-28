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

# Minimal review-only reference projection. Import from a server-only module.
# Keep the same frozen revision as the report; never reinterpret an old bank.
oral=json.loads((source/names[2]).read_text())['records']
reading=json.loads((source/names[1]).read_text())['records']
review={'rubricSha256':h.hexdigest(),'records':[]}
# Independently pin the bounded expression bank and its ordered fact groups.
machine_bytes=(source/'machine-semantic-r78.json').read_bytes()
machine=json.loads(machine_bytes)
retells=[{'paperId':r['paperId'],'taskId':r['taskId'],'groups':[g[0] for g in r['groups']]} for r in machine['records'] if r['kind']=='retell']
assert len(retells)==10 and all(1<=len(r['groups'])<=12 for r in retells)
assert len({(r['paperId'],r['taskId']) for r in retells})==10
review['retellBankSha256']=hashlib.sha256(machine_bytes).hexdigest()
review['retellGroups']=retells

for r in oral:
    review['records'].append({'paperId':r['paperId'],'taskId':r['taskId'],'kind':r['kind'],'question':r['question'],'reference':r['reference']})
for r in reading:
    review['records'].append({'paperId':r['paperId'],'taskId':r['taskId'],'kind':'read','question':'','reference':r['reference']})
assert len(review['records'])==100
assert len({(r['paperId'],r['taskId']) for r in review['records']})==100
assert all(r['reference'] and len(r['reference'])<=4000 for r in review['records'])
target=ROOT/'src/lib/wuhan-review-reference.json'
payload=json.dumps(review,ensure_ascii=False,indent=2)+'\n'
if a.write:target.write_text(payload)
else:assert target.read_text()==payload,'Review reference projection drift'
print('WUHAN_REVIEW_REFERENCE_PROJECTION_PASS 100 oral tasks')
