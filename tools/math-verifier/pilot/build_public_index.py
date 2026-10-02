#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
RESULTS=ROOT/'tools/math-verifier/pilot/results'
OUT=ROOT/'src/lib/generated/math-verification-index.json'
rows=[]
for p in sorted(RESULTS.glob('*.json')):
    d=json.loads(p.read_text())
    if d.get('status')!='verified' or d.get('method')!='lean':
        continue
    rows.append({k:d.get(k) for k in ('problem_id','status','method','competition','year','domain','proof_source','source_sha256','lean_toolchain','mathlib_revision','verifier_revision','verified_at')})
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps({'version':1,'count':len(rows),'items':rows},ensure_ascii=False,indent=2)+'\n')
print(f'wrote {len(rows)} verified items -> {OUT}')
