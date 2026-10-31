#!/usr/bin/env python3
import hashlib,json,os
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'data/discovery/seven-lane-batch-20261031.json'
d=json.loads(p.read_text())
assert d['yearPriorityPolicy']['priority']==[2027,2026]
assert len(d['lanes'])==7
expected={'school','math-competition','language','university','career','professional','interest'}
assert {l['domainId'] for l in d['lanes']}==expected
root=Path(os.environ['SOCTHINK_SEVEN_LANE_ASSETS_DIR']) if os.environ.get('SOCTHINK_SEVEN_LANE_ASSETS_DIR') else None
local=0
for l in d['lanes']:
    assert l['yearPriority']==[2027,2026]
    asset=l['product']
    assert asset['purchaseEnabled'] is False and asset['status']=='local_draft'
    assert asset['paperYear'] is None
    assert all(s['commercialRedistributionVerified'] is False for s in l['sourceReferences'])
    if l['domainId'] in ('university','professional'):
        assert asset['examYear']==2027
        assert any(s['examYear']==2027 and s['verifiedAt']=='2026-10-31' for s in l['sourceReferences'])
    else:
        assert asset['examYear'] is None
    if root is not None:
        file=root/asset['fileName']
        assert file.is_file()
        b=file.read_bytes()
        assert len(b)==asset['sizeBytes'] and hashlib.sha256(b).hexdigest()==asset['sha256']
        assert asset['yearClaim'].encode('utf-8') in b
        local+=1
print(f'SEVEN_LANE_YEAR_PRIORITY=PASS lanes=7 assets_verified={local}')
print('PURCHASE_ENABLED=0')
