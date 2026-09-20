#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re
from pathlib import Path
from urllib.parse import quote
import fitz

LETTERS = set("ABCDE")

def question_anchors(page: fitz.Page):
    found=[]
    for block in page.get_text("dict").get("blocks",[]):
        for line in block.get("lines",[]):
            for span in line.get("spans",[]):
                text=span.get("text","").strip()
                m=re.fullmatch(r"(\d{1,2})\.", text)
                if m and fitz.Rect(span["bbox"]).x0 < 80:
                    found.append((int(m.group(1)), fitz.Rect(span["bbox"])))
    return sorted(found)

def footer_y(page: fitz.Page, after_y: float):
    candidates=[]
    for needle in ("www.mat.uc.pt/canguru/", "Alunos do"):
        for r in page.search_for(needle):
            if r.y0 > after_y: candidates.append(r.y0)
    return min(candidates) if candidates else page.rect.height-24

def crop_questions(pdf: Path, out_dir: Path, scale: float=2.4):
    doc=fitz.open(pdf); out_dir.mkdir(parents=True,exist_ok=True)
    candidates=[]
    for page_index,page in enumerate(doc):
        for qno,anchor in question_anchors(page):
            candidates.append((qno,page_index,anchor))

    # Deduplicate before computing any bottom edge. The previous implementation
    # cropped against the next raw anchor, so a false number-like anchor could
    # cut away the rest of the problem or all answer options.
    chosen={}
    for qno,page_index,anchor in sorted(candidates,key=lambda x:(x[0],x[1],x[2].y0,x[2].x0)):
        chosen.setdefault(qno,(page_index,anchor))

    rows=[]
    for qno in sorted(chosen):
        page_index,anchor=chosen[qno]; page=doc[page_index]
        top=max(0,anchor.y0-7)
        nxt=chosen.get(qno+1)
        if nxt and nxt[0]==page_index:
            bottom=max(top+35,nxt[1].y0-8)
        else:
            bottom=max(top+35,footer_y(page,top)-7)
        rect=fitz.Rect(26,top,page.rect.width-22,min(bottom,page.rect.height-18))
        pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=rect,alpha=False)
        name=f"q{qno:02d}.png"; pix.save(out_dir/name)
        raw=" ".join(page.get_text("text",clip=rect).split())
        rows.append({"questionNo":qno,"page":page_index+1,"crop":[round(v,2) for v in rect],"rawText":raw,"asset":name})
    return rows

def _answer_from_simple_table(page: fitz.Page):
    words=page.get_text("words"); rows=[]
    for w in words:
        text=str(w[4]).strip().rstrip('.')
        if text.isdigit() and 1 <= int(text) <= 15:
            q=int(text); cy=(w[1]+w[3])/2
            letters=[x for x in words if str(x[4]).strip() in LETTERS and abs(((x[1]+x[3])/2)-cy)<4]
            if len(letters)==1: rows.append((q,str(letters[0][4]).strip()))
    answers=dict(rows)
    return dict(sorted(answers.items())) if len(answers)==15 else {}

def _answer_from_coloured_cells(page: fitz.Page):
    words=page.get_text("words"); letters=[]; qwords=[]
    for w in words:
        text=str(w[4]).strip(); rect=fitz.Rect(w[:4])
        if text in LETTERS: letters.append((text,rect))
        mnum=re.fullmatch(r'(\d{1,2})(?:\.[aª])?\.?', text)
        if mnum and 1 <= int(mnum.group(1)) <= 15: qwords.append((int(mnum.group(1)),rect))
    cells=[]
    for d in page.get_drawings():
        fill=d.get("fill"); r=d.get("rect")
        if not fill or r is None: continue
        if not (12 <= r.width <= 45 and 8 <= r.height <= 28): continue
        avg=sum(fill)/3; spread=max(fill)-min(fill)
        if spread < .04 and (avg > .92 or avg < .08): continue
        cx=(r.x0+r.x1)/2; cy=(r.y0+r.y1)/2
        nearest=None
        for letter,lr in letters:
            lx=(lr.x0+lr.x1)/2; ly=(lr.y0+lr.y1)/2
            dist=((lx-cx)**2+(ly-cy)**2)**0.5
            if nearest is None or dist < nearest[0]: nearest=(dist,letter)
        if nearest and nearest[0] < 14: cells.append((r,nearest[1]))
    answers={}
    for q,qr in qwords:
        qx=qr.x1; qy=(qr.y0+qr.y1)/2; same=[]
        for r,letter in cells:
            cx=(r.x0+r.x1)/2; cy=(r.y0+r.y1)/2
            if cx > qx and abs(cy-qy) < 7: same.append((cx-qx,letter))
        if same: answers[q]=min(same,key=lambda x:x[0])[1]
    return dict(sorted(answers.items())) if len(answers)==15 else {}

def extract_answers(key_pdf: Path):
    page=fitz.open(key_pdf)[0]
    for strategy in (_answer_from_simple_table,_answer_from_coloured_cells):
        answers=strategy(page)
        if len(answers)==15: return answers
    raise RuntimeError("Could not extract all 15 answers with known key layouts")

def build_bundle(problem_pdf:Path,key_pdf:Path,exam_id:str,year:int,root:Path):
    assets=root/'public'/'local-assets'/exam_id
    bundle_path=root/'private'/'exams'/f'{exam_id}.json'
    meta=crop_questions(problem_pdf,assets); answers=extract_answers(key_pdf)
    if len(meta)!=15 or len(answers)!=15:
        raise RuntimeError(f'Expected 15 questions/answers, got {len(meta)}/{len(answers)}')
    questions=[]
    for m in meta:
        q=m['questionNo']; points=3 if q<=5 else 4 if q<=10 else 5
        questions.append({'id':f'{exam_id}-q{q:02d}','year':year,'level':'Mini-Escolar I','grades':'2.º ano','language':'pt','questionNo':q,'points':points,'concept':'Original oficial','stem':f'Questão {q} — veja a imagem original.','choices':[{'key':c,'label':c} for c in 'ABCDE'],'answer':answers[q],'solution':'','sourceFile':str(problem_pdf),'assetUrl':f'/local-assets/{quote(exam_id)}/q{q:02d}.png','verified':True,'sourceMeta':m})
    profile={'id':exam_id,'name':f'Portugal {year} · Grade 2','nameZh':f'{year} 袋鼠数学 · 二年级（葡萄牙赛区）','nameEn':f'{year} Math Kangaroo · Grade 2 (Portugal)','grades':'Grade 2','gradesZh':'二年级','gradesEn':'Grade 2','durationSeconds':75*60,'questionCount':15,'initialScore':15,'maxScore':75,'wrongPenaltyMode':'quarter-points','wrongPenaltyValue':0.25,'country':'Portugal','year':year,'language':'pt','sourceLabel':'University of Coimbra · Math Kangaroo','sourceLabelZh':'科英布拉大学 · 袋鼠数学','sourceLabelEn':'University of Coimbra · Math Kangaroo'}
    bundle_path.parent.mkdir(parents=True,exist_ok=True)
    bundle_path.write_text(json.dumps({'profile':profile,'questions':questions},ensure_ascii=False,indent=2),encoding='utf-8')
    return {'exam':exam_id,'questions':15,'answers':answers,'bundle':str(bundle_path)}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--problem-pdf',required=True,type=Path); ap.add_argument('--key-pdf',required=True,type=Path)
    ap.add_argument('--exam-id',required=True); ap.add_argument('--year',required=True,type=int)
    ap.add_argument('--repo-root',type=Path,default=Path(__file__).resolve().parents[1])
    args=ap.parse_args()
    result=build_bundle(args.problem_pdf,args.key_pdf,args.exam_id,args.year,args.repo_root.resolve())
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
