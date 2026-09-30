#!/usr/bin/env python3
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
EXAMS=ROOT/'private'/'exams'
SOL=ROOT/'private'/'solutions'
OUT=ROOT/'data'/'verified-solutions'/'grade1-v1.json'


def valid_scene(scene):
    return isinstance(scene,dict) and all([
        isinstance(scene.get('id'),str) and scene['id'].strip(),
        isinstance(scene.get('title'),str) and scene['title'].strip(),
        isinstance(scene.get('narration'),str) and scene['narration'].strip(),
        isinstance(scene.get('visual'),dict) and isinstance(scene['visual'].get('type'),str),
    ])

exams=[]
for p in sorted(EXAMS.glob('*.json')):
    try: d=json.loads(p.read_text())
    except Exception: continue
    if not isinstance(d,dict): continue
    profile=d.get('profile') or {}
    if str(profile.get('gradeBand') or '')!='1-2': continue
    exams.append((p,profile,d.get('questions') or []))

if not exams:
    raise SystemExit('no gradeBand=1-2 exams found')

solutions={}
source_rows=[]
for p,profile,questions in exams:
    eid=str(profile.get('id') or p.stem)
    for q in questions:
        qid=str(q.get('id') or '')
        if not qid: raise SystemExit(f'{eid}: question without id')
        sp=SOL/f'{qid}.json'
        if not sp.exists(): raise SystemExit(f'{qid}: missing verified solution source')
        s=json.loads(sp.read_text())
        v=s.get('verification') or {}
        if s.get('version')!=1 or s.get('quality')!='verified': raise SystemExit(f'{qid}: not verified v1')
        if v.get('officialAnswerMatched') is not True or v.get('solverAgreement') is not True: raise SystemExit(f'{qid}: verification flags incomplete')
        if float(v.get('confidence') or 0)<0.65: raise SystemExit(f'{qid}: confidence too low')
        if str(v.get('derivedAnswer'))!=str(q.get('answer')): raise SystemExit(f'{qid}: derived answer mismatch')
        scenes=s.get('scenes') or []
        if not (2<=len(scenes)<=12) or not all(valid_scene(x) for x in scenes): raise SystemExit(f'{qid}: invalid scenes')
        payload={
            'version':1,
            'questionId':qid,
            'quality':'verified',
            'verification':{
                'officialAnswerMatched':True,
                'solverAgreement':True,
                'confidence':float(v['confidence']),
                'officialAnswer':str(v.get('officialAnswer') or q.get('answer')),
                'derivedAnswer':str(v.get('derivedAnswer')),
            },
            'scenes':scenes,
        }
        solutions[qid]=payload
        source_rows.append(f"{eid}:{qid}:{hashlib.sha256(sp.read_bytes()).hexdigest()}")

source_digest=hashlib.sha256('\n'.join(sorted(source_rows)).encode()).hexdigest()
bundle={
    'version':1,
    'scope':'gradeBand:1-2',
    'examIds':sorted(str(profile.get('id') or p.stem) for p,profile,_ in exams),
    'examQuestionCounts':{str(profile.get('id') or p.stem):len(questions) for p,profile,questions in sorted(exams,key=lambda x:str(x[1].get('id') or x[0].stem))},
    'questionCount':len(solutions),
    'sourceDigest':source_digest,
    'solutions':{k:solutions[k] for k in sorted(solutions)},
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+'\n')
print(f"GRADE1_SOLUTION_BUNDLE_BUILD=PASS exams={len(exams)} questions={len(solutions)} bytes={OUT.stat().st_size} digest={source_digest[:16]}")
