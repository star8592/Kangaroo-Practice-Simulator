#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]; EX=ROOT/'private/exams'; errors=[]; counts={'australian-amc':0,'maa-amc':0,'kangaroo':0}
for p in sorted(EX.glob('*.json')):
 try:d=json.loads(p.read_text())
 except Exception:continue
 pr=d.get('profile',{}); cid=pr.get('competitionId'); fid=str(pr.get('formatId') or '')
 if cid in counts: counts[cid]+=1
 if cid=='amc': errors.append(f'{p.name}: ambiguous legacy competitionId=amc')
 if p.name.startswith('au-amc-'):
  if cid!='australian-amc': errors.append(f'{p.name}: expected australian-amc, got {cid}')
  if not fid.startswith('australian-amc-'): errors.append(f'{p.name}: Australian formatId must start australian-amc-, got {fid}')
 if p.name.startswith('maa-'):
  if cid!='maa-amc': errors.append(f'{p.name}: expected maa-amc, got {cid}')
  if not fid.startswith('maa-'): errors.append(f'{p.name}: MAA formatId must start maa-, got {fid}')
 if cid=='australian-amc' and fid.startswith('maa-'): errors.append(f'{p.name}: MAA format attached to Australian AMC')
 if cid=='maa-amc' and fid.startswith('australian-amc-'): errors.append(f'{p.name}: Australian format attached to MAA AMC')
if counts['australian-amc']<87: errors.append(f"Australian AMC paper count regressed: {counts['australian-amc']} < 87")
if counts['maa-amc']<2: errors.append(f"MAA AMC paper count regressed: {counts['maa-amc']} < 2")
if errors:
 print('COMPETITION_IDENTITY=FAIL');print('\n'.join(errors[:200]));sys.exit(1)
print('COMPETITION_IDENTITY=PASS',counts)
