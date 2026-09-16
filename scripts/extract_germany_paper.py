#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re
from pathlib import Path
from urllib.parse import quote
import fitz

GRADES = {
    "34": {"grades":"Grades 3–4","gradesZh":"3–4年级","count":24,"per":8,"start":24,"max":120,"heading":"3 und 4"},
    "56": {"grades":"Grades 5–6","gradesZh":"5–6年级","count":24,"per":8,"start":24,"max":120,"heading":"5 und 6"},
    "78": {"grades":"Grades 7–8","gradesZh":"7–8年级","count":30,"per":10,"start":30,"max":150,"heading":"7 und 8"},
    "910":{"grades":"Grades 9–10","gradesZh":"9–10年级","count":30,"per":10,"start":30,"max":150,"heading":"9 und 10"},
    "1113":{"grades":"Grades 11–13","gradesZh":"11–13年级","count":30,"per":10,"start":30,"max":150,"heading":"11 bis 13"},
}

def anchors(page: fitz.Page, per: int):
    out=[]
    for block in page.get_text("dict").get("blocks",[]):
        for line in block.get("lines",[]):
            spans=line.get("spans",[])
            if not spans: continue
            text="".join(s.get("text","") for s in spans).strip()
            m=re.match(r"^([ABC])(\d{1,2})\b", text)
            if not m or not (1 <= int(m.group(2)) <= per): continue
            x0=min(s["bbox"][0] for s in spans); y0=min(s["bbox"][1] for s in spans)
            out.append((m.group(1),int(m.group(2)),fitz.Rect(x0,y0,x0+25,y0+14)))
    return sorted(out,key=lambda x:(x[2].y0,x[2].x0))

def qno(section:str, n:int, per:int):
    return {"A":0,"B":per,"C":2*per}[section]+n

def crop_questions(pdf:Path,out_dir:Path,per:int,expected:int,scale:float=2.2):
    doc=fitz.open(pdf); out_dir.mkdir(parents=True,exist_ok=True); rows=[]
    for pi,page in enumerate(doc):
        aa=anchors(page,per)
        for i,(sec,n,a) in enumerate(aa):
            q=qno(sec,n,per); top=max(0,a.y0-5)
            next_y=aa[i+1][2].y0-6 if i+1<len(aa) else page.rect.height-25
            # Keep section headings out of the previous question crop.
            for phrase in ("4 point problems","5 point problems","4 Point", "5 Point"):
                for r in page.search_for(phrase):
                    if top+10 < r.y0 < next_y: next_y=min(next_y,r.y0-5)
            rect=fitz.Rect(14,top,page.rect.width-15,max(top+22,next_y))
            pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=rect,alpha=False)
            name=f"q{q:02d}.png"; pix.save(out_dir/name)
            raw=" ".join(page.get_text("text",clip=rect).split())
            rows.append({"questionNo":q,"sourceKey":f"{sec}{n}","page":pi+1,
                         "crop":[round(v,2) for v in rect],"rawText":raw,"asset":name})
    chosen={}
    for row in sorted(rows,key=lambda x:(x["questionNo"],x["page"],x["crop"][1])): chosen.setdefault(row["questionNo"],row)
    rows=[chosen[q] for q in sorted(chosen)]
    if len(rows)!=expected or [x["questionNo"] for x in rows]!=list(range(1,expected+1)):
        missing=sorted(set(range(1,expected+1))-set(x["questionNo"] for x in rows))
        raise RuntimeError(f"expected {expected} questions, got {len(rows)}; missing={missing}")
    return rows

def extract_answers(solution_pdf:Path, grade_code:str, year:int):
    cfg=GRADES[grade_code]; doc=fitz.open(solution_pdf)
    text="\n".join(page.get_text("text") for page in doc); doc.close()
    # A solution PDF may contain one year or the complete historical answer archive.
    ym=re.search(rf"Mathematikwettbewerb\s+{year}\b",text,re.I)
    if not ym: raise RuntimeError(f"solution year not found: {year}")
    year_rest=text[ym.end():]
    next_year=re.search(r"Mathematikwettbewerb\s+(?:19|20)\d{2}\b",year_rest,re.I)
    year_text=year_rest[:next_year.start()] if next_year else year_rest
    start=re.search(rf"Klassenstufen\s+{re.escape(cfg['heading'])}",year_text,re.I)
    if not start: raise RuntimeError(f"solution section not found: {year} / {cfg['heading']}")
    rest=year_text[start.end():]
    nxt=re.search(r"Klassenstufen\s+(?:3 und 4|5 und 6|7 und 8|9 und 10|11 bis 13)",rest,re.I)
    section=rest[:nxt.start()] if nxt else rest
    marks=[m.end() for m in re.finditer(r"Antwort",section,re.I)]
    vals=[]
    for pos in marks[:3]:
        tail=section[pos:]
        letters=re.findall(r"(?m)^\s*([A-E])\s*$",tail)
        if len(letters)>=cfg["per"]: vals.extend(letters[:cfg["per"]])
    if len(vals)!=cfg["count"]: raise RuntimeError(f"expected {cfg['count']} answers, got {len(vals)} marks={len(marks)}")
    return {i+1:v for i,v in enumerate(vals)}

def points_for(q:int, per:int): return 3 if q<=per else 4 if q<=2*per else 5

def build(problem:Path,solution:Path,year:int,grade_code:str,root:Path):
    cfg=GRADES[grade_code]; exam_id=f"de-{year}-{grade_code}"
    assets=root/"public"/"local-assets"/exam_id
    meta=crop_questions(problem,assets,cfg["per"],cfg["count"]); answers=extract_answers(solution,grade_code,year)
    questions=[]
    for m in meta:
        q=m["questionNo"]
        questions.append({"id":f"{exam_id}-q{q:02d}","year":year,"level":grade_code,"grades":cfg["grades"],
            "language":"en","questionNo":q,"points":points_for(q,cfg["per"]),"concept":"official_original",
            "stem":"Read the official English problem shown below.","choices":[{"key":c,"label":c} for c in "ABCDE"],
            "answer":answers[q],"solution":"","sourceFile":str(problem),"assetUrl":f"/local-assets/{quote(exam_id)}/q{q:02d}.png",
            "verified":True,"sourceMeta":m})
    profile={"id":exam_id,"name":f"Germany {year} · {cfg['grades']}","nameZh":f"{year} 袋鼠数学 · {cfg['gradesZh']}（德国赛区）",
        "nameEn":f"{year} Math Kangaroo · {cfg['grades']} (Germany)","grades":cfg["grades"],"gradesZh":cfg["gradesZh"],"gradesEn":cfg["grades"],
        "durationSeconds":75*60,"questionCount":cfg["count"],"initialScore":cfg["start"],"maxScore":cfg["max"],
        "wrongPenaltyMode":"quarter-points","wrongPenaltyValue":0.25,"country":"Germany","year":year,"language":"en",
        "sourceLabel":"German Math Kangaroo official English paper","sourceLabelZh":"德国袋鼠数学官方英文卷","sourceLabelEn":"German Math Kangaroo official English paper","studentReady":True}
    out=root/"private"/"exams"/f"{exam_id}.json"; out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps({"profile":profile,"questions":questions},ensure_ascii=False,indent=2),encoding="utf-8")
    return {"examId":exam_id,"questions":len(questions),"answers":"".join(answers[i] for i in range(1,cfg["count"]+1)),"bundle":str(out)}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--problem-pdf",type=Path,required=True); ap.add_argument("--solution-pdf",type=Path,required=True)
    ap.add_argument("--year",type=int,required=True); ap.add_argument("--grade-code",choices=sorted(GRADES),required=True)
    ap.add_argument("--repo-root",type=Path,default=Path(__file__).resolve().parents[1]); args=ap.parse_args()
    print(json.dumps(build(args.problem_pdf,args.solution_pdf,args.year,args.grade_code,args.repo_root.resolve()),ensure_ascii=False,indent=2))
if __name__=="__main__": main()
