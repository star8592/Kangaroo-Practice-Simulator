#!/usr/bin/env python3
"""Validate new SEAMO paper IDs, uniqueness, original v1 preservation, bilingual answer integrity."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'src/data/seamo-original-mocks'
all_ids=set()
for grade,count,minutes in [(1,15,40),(2,25,90)]:
    original=json.loads((ROOT/f'seamo-original-g{grade}-mock-1.json').read_text())
    revised=json.loads((ROOT/f'seamo-original-g{grade}-revised-1.json').read_text())
    p=revised['profile'];q=revised['questions']
    assert p['competitionId']=='seamo' and p['paperType']=='practice'
    assert p['durationSeconds']==minutes*60 and p['questionCount']==count
    assert p['maxScore']==count and p['initialScore']==0 and p['wrongPenaltyValue']==0
    assert original['profile']['id']!=p['id']
    assert len(q)==count and len({x['stem'] for x in q})==count and len({x['stemEn'] for x in q})==count
    assert [x['questionNo'] for x in q]==list(range(1,count+1))
    for n,x in enumerate(q,1):
        assert x['id'] not in all_ids and x['id'] not in {v['id'] for v in original['questions']}
        all_ids.add(x['id'])
        assert x['language']=='zh/en' and x['solution'] and x['localized']['en']['solution']
        assert x['answerMode']==('choice' if grade==1 or n<=20 else 'integer')
        if x['answerMode']=='choice':
            opts=x['choices'];assert len(opts)==5 and len({v['label'] for v in opts})==5
            assert x['answer'] in [v['key'] for v in opts]
            assert x['choicesEn']==opts
        else:
            assert x['choices']==[] and x['choicesEn']==[] and x['answer'].isdigit()
    print(f'SEAMO_REVISED_G{grade}=PASS questions={count} unique={count} historical_id_preserved=true')
print('SEAMO_REVISED_VALIDATION=PASS total=40')
