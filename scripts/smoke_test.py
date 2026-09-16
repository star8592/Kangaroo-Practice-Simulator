#!/usr/bin/env python3
import argparse, json, urllib.request

def get(url):
    return json.load(urllib.request.urlopen(url))

def post(url, payload):
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'},method='POST')
    return json.load(urllib.request.urlopen(req))

def main():
    p=argparse.ArgumentParser(); p.add_argument('--base',default='http://127.0.0.1:3027'); a=p.parse_args(); base=a.base.rstrip('/')
    exam=get(base+'/api/exams/level-a'); questions=exam.get('questions',[])
    assert len(questions)==24, f'expected 24 questions, got {len(questions)}'
    pts=[q['points'] for q in questions]
    assert pts.count(3)==8 and pts.count(4)==8 and pts.count(5)==8, pts
    admin=get(base+'/api/admin/questions'); qs=admin.get('questions',admin)
    correct={q['id']:q['answer'] for q in qs}
    full=post(base+'/api/grade',{'answers':correct})
    blank=post(base+'/api/grade',{'answers':{}})
    assert full['score']==120 and full['maxScore']==120, full
    assert blank['score']==24 and blank['maxScore']==120, blank
    print(json.dumps({'questions':24,'distribution':{'3':8,'4':8,'5':8},'full_score':full['score'],'blank_score':blank['score']},ensure_ascii=False))
if __name__=='__main__': main()
