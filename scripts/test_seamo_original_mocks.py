#!/usr/bin/env python3
"""Independently validate original SEAMO foundational practice sets."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src'/'data'/'seamo-original-mocks'
ids=set()
for grade,count,minutes in ((1,15,40),(2,25,90)):
    path=DATA/f'seamo-original-g{grade}-mock-1.json'
    data=json.loads(path.read_text())
    profile=data['profile']; questions=data['questions']
    assert profile['competitionId']=='seamo'
    assert profile['paperType']=='practice'
    assert profile['durationSeconds']==minutes*60
    assert profile['questionCount']==len(questions)==count
    assert profile['maxScore']==count and profile['initialScore']==0
    assert profile['wrongPenaltyValue']==0
    assert '原创' in profile['nameZh'] and '非官方' in profile['sourceLabelZh']
    assert [q['questionNo'] for q in questions]==list(range(1,count+1))
    for i,q in enumerate(questions,1):
        assert q['id'] not in ids
        ids.add(q['id'])
        assert q['year']==2026 and q['points']==1
        assert q['stem'] and q['stemEn'] and q['solution']
        assert q['language']=='zh/en' and q['sourceFile']=='original-generated-seamo-practice'
        # Compute the expected numerical answer independently from question position.
        kind=(i-1)%5
        if kind==0: expected=grade*3+i+4-(grade+2)+(i%4+2)
        elif kind==1: expected=i+1+3*(grade+2)
        elif kind==2: expected=(grade+2)*(i%4+2)
        elif kind==3: expected=i+grade+5+grade+4
        else: expected=2*(grade+2+i%5+2)
        assert 0<=expected<=999
        if grade==1 or i<=20:
            assert q['answerMode']=='choice'
            choices=q['choices']
            assert len(choices)==len(q['choicesEn'])==5
            assert [c['key'] for c in choices]==list('ABCDE')
            values=[int(c['label']) for c in choices]
            assert len(set(values))==5
            assert values[ord(q['answer'])-65]==expected,(grade,i,expected,values)
        else:
            assert q['answerMode']=='integer' and q['choices']==[]
            assert int(q['answer'])==expected,(grade,i,expected)
    print(f'SEAMO_ORIGINAL_G{grade}=PASS questions={count} integer={sum(q["answerMode"]=="integer" for q in questions)}')
print('SEAMO_ORIGINAL_VALIDATION=PASS total=40')
