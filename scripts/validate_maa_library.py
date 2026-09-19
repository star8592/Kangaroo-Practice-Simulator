#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1];errors=[];papers=questions=practice_papers=practice_questions=0
rules={'maa-amc8':(25,2400,25,0,'choice',1),'maa-amc10':(25,4500,150,1.5,'choice',6),'maa-amc12':(25,4500,150,1.5,'choice',6),'maa-aime-classic':(15,10800,15,0,'integer',1),'maa-aime-2027':(15,10800,15,0,'integer',1)}
for p in sorted((ROOT/'private/exams').glob('maa-*.json')):
 d=json.loads(p.read_text());pr=d['profile'];fid=pr.get('formatId');ptype=pr.get('paperType');qs=d.get('questions',[]);papers+=1;questions+=len(qs)
 if pr.get('competitionId')!='maa-amc':errors.append(f'{p.name}: competitionId')
 if fid not in rules:errors.append(f'{p.name}: formatId {fid}');continue
 if ptype=='practice':
  practice_papers+=1;practice_questions+=len(qs)
  if pr.get('timingMode')!='untimed' or pr.get('durationSeconds')!=0:errors.append(f'{p.name}: practice must be untimed')
  if pr.get('questionCount')!=len(qs) or pr.get('maxScore')!=len(qs):errors.append(f'{p.name}: practice count/max mismatch')
  expected_mode='choice' if fid in {'maa-amc8','maa-amc10','maa-amc12'} else 'integer';expected_pts=1
 else:
  n,dur,maxs,blank,expected_mode,expected_pts=rules[fid]
  for k,v in [('questionCount',n),('durationSeconds',dur),('maxScore',maxs),('blankScoreValue',blank)]:
   if pr.get(k,0)!=v:errors.append(f'{p.name}: {k}={pr.get(k)} expected {v}')
  if len(qs)!=n:errors.append(f'{p.name}: {len(qs)} questions expected {n}')
  if fid=='maa-amc8' and ptype=='past' and '-user-owned' in p.name and pr.get('year') in list(range(2000,2021))+[2022,2024]:
   year=int(pr.get('year'))
   rules_en=str(pr.get('rulesSummaryEn') or '')
   if year<=2007 and 'calculators permitted' not in rules_en:errors.append(f'{p.name}: historical calculator policy should permit calculators')
   if 2008<=year<=2022 and 'calculators are not allowed' not in rules_en:errors.append(f'{p.name}: calculator prohibition missing')
  if fid=='maa-aime-2027':
   secs=pr.get('timingSections') or []
   expected=[(1,8,5400),(9,15,5400)]
   got=[(x.get('questionStart'),x.get('questionEnd'),x.get('durationSeconds')) for x in secs]
   if got!=expected or not all(x.get('lockAfter') is True for x in secs):errors.append(f'{p.name}: AIME 2027 timingSections {got}')
 for i,q in enumerate(qs,1):
  if q.get('questionNo')!=i or q.get('answerMode')!=expected_mode or q.get('points')!=expected_pts:errors.append(f'{p.name}: q{i} structure')
  a=str(q.get('answer',''))
  if expected_mode=='choice' and a not in 'ABCDE':errors.append(f'{p.name}: q{i} answer {a}')
  if expected_mode=='integer' and (not a.isdigit() or not 0<=int(a)<=999):errors.append(f'{p.name}: q{i} integer {a}')
  asset=q.get('studentAssetUrl') or q.get('assetUrl');fp=ROOT/'public'/str(asset or '').lstrip('/')
  if not asset or not fp.exists() or fp.stat().st_size<1000:errors.append(f'{p.name}: q{i} asset')
if errors:
 print('MAA_LIBRARY=FAIL');print('\n'.join(errors[:100]));sys.exit(1)
print(f'MAA_LIBRARY=PASS papers={papers} questions={questions} practice_papers={practice_papers} practice_questions={practice_questions}')
