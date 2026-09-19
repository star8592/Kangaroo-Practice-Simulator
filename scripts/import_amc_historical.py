#!/usr/bin/env python3
"""Import AMT official-supplied AMC 2007–2021 bilingual historical papers.

No OCR is used for question content. Vector PDFs are cropped from their PDF text
coordinates; 2016/2021 scanned bilingual papers are split by their printed
question separator lines. Answers come from embedded/official answer keys.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, tempfile, xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LIBRARY = Path('/mnt/disk1/master_data/Education/Australian_AMC_Library/01_AMT_Official/06_Official_Supplied')
EXAMS = ROOT / 'private' / 'exams'
ASSETS = ROOT / 'public' / 'local-assets' / 'australian-amc' / 'historical'
DPI = 130
SCALE = DPI / 72
DIVISIONS = {
    'Middle_Primary': dict(label='Middle Primary', slug='middle-primary', grades='Years 3–4', zh='3–4年级', band='3-4', minutes=60),
    'Upper_Primary': dict(label='Upper Primary', slug='upper-primary', grades='Years 5–6', zh='5–6年级', band='5-6', minutes=60),
    'Junior': dict(label='Junior', slug='junior', grades='Years 7–8', zh='7–8年级', band='7-8', minutes=75),
    'Intermediate': dict(label='Intermediate', slug='intermediate', grades='Years 9–10', zh='9–10年级', band='9-10', minutes=75),
    'Senior': dict(label='Senior', slug='senior', grades='Years 11–12', zh='11–12年级', band='11+', minutes=75),
}
DORDER = list(DIVISIONS)
CHOICES = [{'key': c, 'label': c} for c in 'ABCDE']

# 2016 PDFs are scans; these values were transcribed from each answer page embedded
# in the local official-supplied PDFs and cross-checked against the text-readable MP key.
ANS2016_RAW = {
'Middle_Primary':'C D D C E D E E D C A A D B A A B D E D C D B B B 45 7 8 251 28',
'Upper_Primary':'D D C B C D E D A E A D A D E B E C A B B B C D E 14 32 251 35 832',
'Junior':'E D E E A A C C D D B D A C C B E B B C C B D E B 573 35 629 89 385',
'Intermediate':'A A B D A A B B B C E A E C C A C D D A B D C A D 18 184 186 312 156',
'Senior':'A E B C B E A B B B C D D E D A A E B E D E C E C 312 165 199 156 904',
}
ANS2016 = {d: {i+1: v for i, v in enumerate(vals.split())} for d, vals in ANS2016_RAW.items()}
SCAN_END_2016 = {'Middle_Primary':18, 'Upper_Primary':19, 'Junior':14, 'Intermediate':14, 'Senior':12}


def run(cmd:list[str], **kw):
    return subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **kw)

def pdf_text(pdf:Path) -> str:
    r = subprocess.run(['pdftotext','-layout',str(pdf),'-'], capture_output=True, text=True, errors='ignore')
    return r.stdout.replace('\x08','')

def normalize_answer(q:int, v:str) -> str:
    return str(int(v)) if q >= 26 and v.isdigit() else v

def answers_embedded(pdf:Path, year:int, label:str) -> dict[int,str]:
    t = pdf_text(pdf)
    m = re.search(rf'{re.escape(label)}\s+{year}\s+Answers', t, re.I)
    if not m: return {}
    out:dict[int,str] = {}
    for q, v in re.findall(r'^\s*(\d{1,2})\s+([A-E]|\d{1,3})\s*$', t[m.end():], re.M):
        qn = int(q)
        if 1 <= qn <= 30 and qn not in out: out[qn] = normalize_answer(qn, v)
    return out

def answers_matrix_plain(pdf:Path) -> dict[str,dict[int,str]]:
    out = {d:{} for d in DORDER}; t = pdf_text(pdf)
    pat = re.compile(r'^\s*(\d{1,2})\s+([A-E]|\d{1,3})\s+([A-E]|\d{1,3})\s+([A-E]|\d{1,3})\s+([A-E]|\d{1,3})\s+([A-E]|\d{1,3})\s*$', re.M)
    for m in pat.finditer(t):
        q = int(m.group(1))
        if 1 <= q <= 30:
            for d, v in zip(DORDER, m.groups()[1:]): out[d][q] = normalize_answer(q, v)
    return out

def answers_matrix_colon(pdf:Path) -> dict[str,dict[int,str]]:
    out = {d:{} for d in DORDER}; t = pdf_text(pdf)
    pat = re.compile(r'^\s*(\d{1,2})\s*:\s*([A-E]|\d{1,3})\s+(\d{1,2})\s*:\s*([A-E]|\d{1,3})\s+(\d{1,2})\s*:\s*([A-E]|\d{1,3})\s+(\d{1,2})\s*:\s*([A-E]|\d{1,3})\s+(\d{1,2})\s*:\s*([A-E]|\d{1,3})\s*$', re.M)
    for m in pat.finditer(t):
        g = m.groups(); qs = [int(g[i]) for i in range(0,10,2)]; vs = [g[i] for i in range(1,10,2)]
        if len(set(qs)) == 1 and 1 <= qs[0] <= 30:
            q = qs[0]
            for d, v in zip(DORDER, vs): out[d][q] = normalize_answer(q, v)
    return out

def year_answers(base:Path, year:int) -> dict[str,dict[int,str]]:
    if year == 2016: return ANS2016
    if year in (2017,2018): return answers_matrix_plain(base/str(year)/'Middle_Primary'/'English'/'Question_Paper.pdf')
    if year in (2019,2020): return answers_matrix_colon(base/str(year)/'Middle_Primary'/'Common'/'Answer_Key.pdf')
    if year == 2021: return answers_matrix_plain(base/str(year)/'Middle_Primary'/'Common'/'Answer_Key.pdf')
    return {d: answers_embedded(base/str(year)/d/'English'/'Question_Paper.pdf', year, cfg['label']) for d,cfg in DIVISIONS.items()}

def validate_answers(all_answers:dict[int,dict[str,dict[int,str]]]):
    errors=[]
    for year, ym in all_answers.items():
        for d in DORDER:
            a=ym[d]
            for q in range(1,31):
                v=a.get(q)
                if q <= 25 and v not in set('ABCDE'): errors.append((year,d,q,v))
                if q >= 26 and (v is None or not str(v).isdigit() or not 0 <= int(v) <= 999): errors.append((year,d,q,v))
    if errors: raise RuntimeError(f'answer validation failed: {errors[:20]} (total {len(errors)})')

def bbox_sequence(pdf:Path):
    r = subprocess.run(['pdftotext','-bbox-layout',str(pdf),'-'], capture_output=True, text=True, errors='ignore')
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', r.stdout)
    root = ET.fromstring(s); ns={'x':'http://www.w3.org/1999/xhtml'}; occ={q:[] for q in range(1,31)}
    for pi, page in enumerate(root.findall('.//x:page',ns)):
        for w in page.findall('.//x:word',ns):
            m=re.fullmatch(r'(\d{1,2})\.',(w.text or '').strip())
            if not m: continue
            q=int(m.group(1)); x=float(w.attrib['xMin']); y=float(w.attrib['yMin'])
            if 1<=q<=30 and pi>=1 and x<160: occ[q].append((pi+1,y,x))
    candidates=[]
    for first in occ[1]:
        seq=[first]; prev=(first[0],first[1]); ok=True
        for q in range(2,31):
            xs=[z for z in occ[q] if (z[0],z[1])>prev]
            if not xs: ok=False; break
            z=min(xs,key=lambda a:(a[0],a[1])); seq.append(z); prev=(z[0],z[1])
        if ok and seq[-1][0]-seq[0][0]>=2: candidates.append(seq)
    if not candidates: raise RuntimeError(f'no 1..30 bbox sequence in {pdf}')
    return min(candidates,key=lambda z:(z[0][0],z[0][1],z[-1][0]))

def render_range(pdf:Path, first:int, last:int, tmp:Path) -> dict[int,Path]:
    prefix=tmp/'page'; run(['pdftoppm','-png','-r',str(DPI),'-f',str(first),'-l',str(last),str(pdf),str(prefix)])
    files=sorted(tmp.glob('page-*.png'))
    if len(files) != last-first+1: raise RuntimeError(f'rendered {len(files)} pages, expected {last-first+1}: {pdf}')
    return {first+i:p for i,p in enumerate(files)}

def save_crop(im:Image.Image, box, out:Path):
    out.parent.mkdir(parents=True,exist_ok=True)
    im.crop(box).save(out, optimize=True)

def crop_vector(pdf:Path, outdir:Path):
    if all((outdir/f'q{q:02}.png').exists() for q in range(1,31)): return
    seq=bbox_sequence(pdf); first=min(x[0] for x in seq); last=max(x[0] for x in seq)
    with tempfile.TemporaryDirectory(prefix='amc-vector-') as td:
        pages=render_range(pdf,first,last,Path(td)); cache={}
        for q,(pg,y,_) in enumerate(seq,1):
            im=cache.setdefault(pg,Image.open(pages[pg]).convert('RGB')); w,h=im.size
            if q<30 and seq[q][0]==pg: bottom=int((seq[q][1]-6)*SCALE)
            else: bottom=h-int(35*SCALE)
            top=max(0,int((y-11)*SCALE)); bottom=max(top+35,min(h,bottom))
            save_crop(im,(int(24*SCALE),top,w-int(24*SCALE),bottom),outdir/f'q{q:02}.png')

def scan_candidates(rendered:dict[int,Path], year:int):
    allc=[]; meanmax=205 if year==2016 else 35
    for page,p in rendered.items():
        arr=np.array(Image.open(p).convert('L')); h,w=arr.shape; rows=[]
        for y,row in enumerate(arr):
            mask=row<220; d=np.diff(np.r_[0,mask.astype(np.int8),0]); starts=np.where(d==1)[0]; ends=np.where(d==-1)[0]
            if not len(starts): continue
            lens=ends-starts; j=int(np.argmax(lens)); st,en,ln=int(starts[j]),int(ends[j]),int(lens[j]); mean=float(row[st:en].mean())
            if ln>w*.60 and st<w*.17 and en>w*.80 and 70<y<h*.965 and mean<meanmax: rows.append((y,st,en,ln,mean))
        groups=[]
        for x in rows:
            if not groups or x[0]>groups[-1][-1][0]+3: groups.append([x])
            else: groups[-1].append(x)
        for g in groups:
            z=max(g,key=lambda x:x[3]); allc.append((page,round(sum(x[0] for x in g)/len(g)),z[1],z[2],z[4]))
    return allc

def crop_scan(pdf:Path, year:int, div:str, outdir:Path):
    if all((outdir/f'q{q:02}.png').exists() for q in range(1,31)): return
    if year==2016: first,last=2,SCAN_END_2016[div]
    else:
        info=subprocess.check_output(['pdfinfo',str(pdf)],text=True,errors='ignore'); n=int(re.search(r'^Pages:\s*(\d+)',info,re.M).group(1)); first,last=3,n-1
    with tempfile.TemporaryDirectory(prefix='amc-scan-') as td:
        pages=render_range(pdf,first,last,Path(td)); cs=scan_candidates(pages,year)
        if year==2021:
            h=Image.open(pages[first]).height; cs=[x for x in cs if not (x[0]==first and x[1]<h*.19)]
        if len(cs)<30: raise RuntimeError(f'{year} {div}: only {len(cs)} separator candidates')
        if year==2016 and len(cs)!=32:
            raise RuntimeError(f'{year} {div}: expected 32 separator candidates (25 questions + 2 integer-section rules + 5 questions), got {len(cs)}')
        selected=cs[:25]+cs[-5:]
        if len(selected)!=30 or selected!=sorted(selected,key=lambda x:(x[0],x[1])): raise RuntimeError(f'{year} {div}: invalid separator selection')
        cache={}
        for q,end in enumerate(selected,1):
            prev=selected[q-2] if q>1 else None; pg,y=end[0],end[1]
            im=cache.setdefault(pg,Image.open(pages[pg]).convert('RGB')); w,h=im.size
            top=prev[1]+5 if prev and prev[0]==pg else int(h*.055); bottom=min(h-5,y+5)
            if bottom-top<45: raise RuntimeError(f'{year} {div} q{q}: suspicious crop height {bottom-top}')
            save_crop(im,(int(w*.055),max(0,top),int(w*.945),bottom),outdir/f'q{q:02}.png')

def points(q:int):
    if q<=10:return 3
    if q<=20:return 4
    if q<=25:return 5
    return q-20

def bundle(year:int, div:str, ans:dict[int,str], zh_urls:list[str], en_urls:list[str], base:Path):
    c=DIVISIONS[div]; eid=f"au-amc-{year}-{c['slug']}"; fmt=f"australian-amc-standard-{'11plus' if c['band']=='11+' else c['band']}"
    ruleszh=f"30题，{c['minutes']}分钟，满分135分；1–10题每题3分，11–20题每题4分，21–25题每题5分，26–30题依次6–10分；前25题选择题，后5题为0–999整数填答；答错不倒扣。"
    profile=dict(id=eid,name=f"Australian AMC {year} · {c['label']}",nameZh=f"{year} 澳洲 AMC · {c['label']}",nameEn=f"{year} Australian AMC · {c['label']}",grades=c['grades'],gradesZh=c['zh'],gradesEn=c['grades'],durationSeconds=c['minutes']*60,questionCount=30,initialScore=0,maxScore=135,wrongPenaltyMode='fixed',wrongPenaltyValue=0,country='Australia AMC',year=year,language='zh/en',sourceLabel='Australian Maths Trust · official-supplied bilingual historical paper',sourceLabelZh='澳大利亚数学信托 AMT · 官方提供中英双语历年真题',sourceLabelEn='Australian Maths Trust · official-supplied bilingual historical paper',studentReady=True,competitionId='australian-amc',formatId=fmt,paperType='past',gradeBand=c['band'],timingMode='official',formatLabelZh=f"澳洲 AMC 正式赛制 · {c['label']}",formatLabelEn=f"Australian AMC official format · {c['label']}",rulesSummaryZh=ruleszh,rulesSummaryEn=f"30 questions, {c['minutes']} minutes, 135 points; Q1–10 are 3 points, Q11–20 4 points, Q21–25 5 points, and Q26–30 are worth 6–10 points; Q1–25 multiple choice, Q26–30 integer 0–999; no penalty for wrong answers.")
    qs=[]; zhp=base/str(year)/div/'Chinese'/'Question_Paper.pdf'; enp=base/str(year)/div/'English'/'Question_Paper.pdf'
    for q in range(1,31):
        choice=q<=25
        qs.append(dict(id=f'{eid}-q{q:02}',year=year,level=c['label'],grades=c['grades'],language='zh/en',questionNo=q,points=points(q),answerMode='choice' if choice else 'integer',concept='official_original',stem='请查看下方官方原题图。',stemEn='Refer to the official question image below.',choices=CHOICES if choice else [],choicesEn=CHOICES if choice else [],answer=ans[q],solution=f"官方答案 / Official answer: {ans[q]}",sourceFile=str(zhp),assetUrlZh=zh_urls[q-1],assetUrlEn=en_urls[q-1],verified=True,examReady=True,sourceMeta={'sourceZh':str(zhp),'sourceEn':str(enp),'answerSource':'AMT official/embedded answer key','importer':'import_amc_historical.py'},review={'verified':True,'visualVerified':True,'needsReview':False,'translationStatus':'official_bilingual','visualStatus':'official_original'}))
    return {'profile':profile,'questions':qs}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--library',type=Path,default=DEFAULT_LIBRARY); ap.add_argument('--years',default='2007-2021'); a=ap.parse_args(); base=a.library
    y0,y1=map(int,a.years.split('-')); years=list(range(y0,y1+1)); allans={y:year_answers(base,y) for y in years}; validate_answers(allans)
    print(f'answers: PASS {sum(len(allans[y][d]) for y in years for d in DORDER)}/{len(years)*5*30}')
    EXAMS.mkdir(parents=True,exist_ok=True); made=0
    for year in years:
        for div,c in DIVISIONS.items():
            dest=ASSETS/str(year)/div
            if year in (2016,2021):
                out=dest/'bilingual'; crop_scan(base/str(year)/div/'Chinese'/'Question_Paper.pdf',year,div,out)
                urls=[f'/local-assets/australian-amc/historical/{year}/{div}/bilingual/q{q:02}.png' for q in range(1,31)]; zh_urls=en_urls=urls
            else:
                zho,eno=dest/'zh',dest/'en'; crop_vector(base/str(year)/div/'Chinese'/'Question_Paper.pdf',zho); crop_vector(base/str(year)/div/'English'/'Question_Paper.pdf',eno)
                zh_urls=[f'/local-assets/australian-amc/historical/{year}/{div}/zh/q{q:02}.png' for q in range(1,31)]; en_urls=[f'/local-assets/australian-amc/historical/{year}/{div}/en/q{q:02}.png' for q in range(1,31)]
            b=bundle(year,div,allans[year][div],zh_urls,en_urls,base); path=EXAMS/f"{b['profile']['id']}.json"; path.write_text(json.dumps(b,ensure_ascii=False,indent=2),encoding='utf-8'); made+=1
            print(f"[{made:02}/{len(years)*5}] {year} {div}: 30q -> {path.name}",flush=True)
    print(f'DONE bundles={made} questions={made*30}')
if __name__=='__main__': main()
