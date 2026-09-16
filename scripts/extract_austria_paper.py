#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re
from pathlib import Path
from urllib.parse import quote
import fitz

LEVELS = {
    "Felix": {"grades":"Grades 1–2","gradesZh":"1–2年级","count":15,"duration":60,"start":15,"max":75,"cuts":(5,10)},
    "Ecolier": {"grades":"Grades 3–4","gradesZh":"3–4年级","count":24,"duration":60,"start":24,"max":120,"cuts":(8,16)},
    "Benjamin": {"grades":"Grades 5–6","gradesZh":"5–6年级","count":24,"duration":60,"start":24,"max":120,"cuts":(8,16)},
    "Kadett": {"grades":"Grades 7–8","gradesZh":"7–8年级","count":30,"duration":75,"start":30,"max":150,"cuts":(10,20)},
}

def anchors(page):
    out=[]
    for b in page.get_text("dict").get("blocks",[]):
        for line in b.get("lines",[]):
            for s in line.get("spans",[]):
                t=s.get("text","").strip(); m=re.fullmatch(r"(\d{1,2})\.",t)
                if m: out.append((int(m.group(1)),fitz.Rect(s["bbox"])))
    return sorted(out)

def crop_questions(pdf:Path,out_dir:Path,expected:int,scale:float=2.2):
    doc=fitz.open(pdf); out_dir.mkdir(parents=True,exist_ok=True); rows=[]
    for pi,page in enumerate(doc):
        aa=anchors(page)
        for i,(qno,a) in enumerate(aa):
            top=max(0,a.y0-6); bottom=(aa[i+1][1].y0-7) if i+1<len(aa) else page.rect.height-30
            r=fitz.Rect(24,top,page.rect.width-20,max(top+20,bottom))
            pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=r,alpha=False)
            name=f"q{qno:02d}.png"; pix.save(out_dir/name)
            raw=" ".join(page.get_text("text",clip=r).split())
            rows.append({"questionNo":qno,"page":pi+1,"crop":[round(x,2) for x in r],"rawText":raw,"asset":name})
    rows=sorted({x['questionNo']:x for x in rows}.values(),key=lambda x:x['questionNo'])
    if len(rows)!=expected: raise RuntimeError(f"expected {expected} questions, got {len(rows)}")
    return rows

def extract_answers(solution_pdf:Path,expected:int):
    doc=fitz.open(solution_pdf); text=" ".join(pg.get_text("text") for pg in doc); doc.close()
    text=" ".join(text.split())
    m=re.search(r"(?:Lösungsvektor|Loesungsvektor).*?((?:\b[A-E]\b\s*){%d})"%expected,text,re.I)
    if m:
        vals=re.findall(r"\b[A-E]\b",m.group(1))
        if len(vals)==expected: return {i+1:v for i,v in enumerate(vals)}
    vals=re.findall(r"\bLösung\s*:?[ ]*([A-E])\b",text,re.I)
    if len(vals)==expected: return {i+1:v for i,v in enumerate(vals)}
    vals=re.findall(r"\bLoesung\s*:?[ ]*([A-E])\b",text,re.I)
    if len(vals)==expected: return {i+1:v for i,v in enumerate(vals)}
    raise RuntimeError(f"could not extract {expected} answers; found {len(vals)} explicit")

def points_for(q:int,cuts:tuple[int,int]):
    return 3 if q<=cuts[0] else 4 if q<=cuts[1] else 5

def build(problem:Path,solution:Path,year:int,level:str,root:Path):
    cfg=LEVELS[level]; exam_id=f"at-{year}-{level.lower()}"
    assets=root/'public'/'local-assets'/exam_id
    meta=crop_questions(problem,assets,cfg['count']); answers=extract_answers(solution,cfg['count'])
    questions=[]
    for m in meta:
        q=m['questionNo']; pts=points_for(q,cfg['cuts'])
        questions.append({
            'id':f'{exam_id}-q{q:02d}','year':year,'level':level,'grades':cfg['grades'],'language':'en',
            'questionNo':q,'points':pts,'concept':'official_original',
            'stem':'Read the official English problem shown below.',
            'choices':[{'key':c,'label':c} for c in 'ABCDE'],
            'answer':answers[q],'solution':'','sourceFile':str(problem),
            'assetUrl':f'/local-assets/{quote(exam_id)}/q{q:02d}.png','verified':True,'sourceMeta':m,
        })
    profile={
        'id':exam_id,'name':f'Austria {year} · {level}','nameZh':f'{year} 袋鼠数学 · {cfg["gradesZh"]}（奥地利赛区）',
        'nameEn':f'{year} Math Kangaroo · {cfg["grades"]} (Austria)','grades':cfg['grades'],'gradesZh':cfg['gradesZh'],'gradesEn':cfg['grades'],
        'durationSeconds':cfg['duration']*60,'questionCount':cfg['count'],'initialScore':cfg['start'],'maxScore':cfg['max'],
        'wrongPenaltyMode':'quarter-points','wrongPenaltyValue':0.25,'country':'Austria','year':year,'language':'en',
        'sourceLabel':'Austrian Math Kangaroo official English paper','sourceLabelZh':'奥地利袋鼠数学官方英文卷','sourceLabelEn':'Austrian Math Kangaroo official English paper',
        'studentReady':True,
    }
    out=root/'private'/'exams'/f'{exam_id}.json'; out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps({'profile':profile,'questions':questions},ensure_ascii=False,indent=2),encoding='utf-8')
    return {'examId':exam_id,'questions':len(questions),'answers':answers,'bundle':str(out)}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--problem-pdf',type=Path,required=True); ap.add_argument('--solution-pdf',type=Path,required=True)
    ap.add_argument('--year',type=int,required=True); ap.add_argument('--level',choices=sorted(LEVELS),required=True)
    ap.add_argument('--repo-root',type=Path,default=Path(__file__).resolve().parents[1]); args=ap.parse_args()
    print(json.dumps(build(args.problem_pdf,args.solution_pdf,args.year,args.level,args.repo_root.resolve()),ensure_ascii=False,indent=2))

if __name__=='__main__': main()
