#!/usr/bin/env python3
from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
FORBIDDEN_UI=[
    r"Kangaroo Practice Lab",
    r"Local Math Kangaroo practice and mock-exam simulator",
    r"袋鼠数学\s*(?:<br\s*/?>)?\s*(?:<[^>]+>)?\s*模拟考试系统",
    r"placeholder=\"例如 MK",
    r'className=\"brand-mark\">K<',
]
FORBIDDEN_OPS=[
    "kangaroo-practice-simulator",
    "kangaroo-practice.service",
    "kangaroo-gateway",
    "Kangaroo Practice Simulator",
]
errors=[]
for p in (ROOT/'src').rglob('*'):
    if not p.is_file() or p.suffix not in {'.ts','.tsx','.js','.jsx'}: continue
    text=p.read_text(encoding='utf-8',errors='ignore')
    for pat in FORBIDDEN_UI:
        if re.search(pat,text,re.I|re.S): errors.append(f"{p.relative_to(ROOT)}: forbidden legacy branding /{pat}/")
for rel in ['package.json','package-lock.json','README.md']:
    p=ROOT/rel
    if not p.exists(): continue
    text=p.read_text(encoding='utf-8',errors='ignore')
    for token in FORBIDDEN_OPS:
        if token in text: errors.append(f"{rel}: forbidden legacy operational name {token!r}")
pkg=json.loads((ROOT/'package.json').read_text())
if pkg.get('name')!='math-competition-lab': errors.append('package.json: package name must be math-competition-lab')
service=ROOT/'ops/systemd/math-competition-lab.service'
if not service.exists(): errors.append('missing ops/systemd/math-competition-lab.service')
if (ROOT/'ops/systemd/kangaroo-practice.service').exists(): errors.append('obsolete ops/systemd/kangaroo-practice.service still exists')
if errors:
    print('BRAND_AUDIT=FAIL'); print('\n'.join(errors)); sys.exit(1)
print('BRAND_AUDIT=PASS')
