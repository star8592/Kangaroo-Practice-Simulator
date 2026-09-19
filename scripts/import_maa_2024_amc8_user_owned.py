#!/usr/bin/env python3
"""Import the user's bilingual 2024 MAA AMC 8 PDF without OCR.

Pages 2-12 of this PDF contain broken/absent text layers. We render the
original pages and detect only question-start rows from the stable left-margin
layout. Question content, formulas, Chinese text, and diagrams remain pixels
from the source PDF.
"""
from pathlib import Path
from PIL import Image
import json, subprocess, tempfile
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SRC=Path('/mnt/disk1/master_data/Education/MAA_AMC_Library/user_owned/2024_AMC8/2024_AMC8_bilingual.pdf')
OUT=ROOT/'public/local-assets/maa-amc/2024/AMC_8_bilingual'
BUNDLE=ROOT/'private/exams/maa-amc8-2024-user-owned.json'
DPI=170
ANS=list('BCEEBDEDEBDEBACDEACDEBCBC')

def run(cmd):
    subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL)

def render():
    td=tempfile.TemporaryDirectory(prefix='maa-amc8-2024-')
    base=Path(td.name)/'page'
    run(['pdftoppm','-png','-r',str(DPI),'-f','1','-l','12',str(SRC),str(base)])
    pages=sorted(Path(td.name).glob('page-*.png'))
    if len(pages)!=12: raise RuntimeError(f'expected 12 problem pages, got {len(pages)}')
    return td,{i+1:p for i,p in enumerate(pages)}

def starts(pages):
    found=[]
    for p,path in pages.items():
        a=np.array(Image.open(path).convert('L'))
        # Calibrated from vector Q1-Q3: xMin ~86pt => ~203px at 170 dpi.
        strip=a[:,185:235] < 170
        body=a[:,235:int(a.shape[1]*.93)] < 190
        s,b=strip.sum(1),body.sum(1)
        active=(s>=2)&(b>=8)
        groups=[]
        for y in np.where(active)[0]:
            if not groups or y>groups[-1][-1]+3: groups.append([int(y)])
            else: groups[-1].append(int(y))
        bands=[(g[0],g[-1]) for g in groups if len(g)>=2]
        found.extend((p,y0,y1) for y0,y1 in bands)
    if len(found)!=25:
        raise RuntimeError(f'question-start detector expected 25 starts, got {len(found)}: {found}')
    expected=[3,3,3,2,2,2,2,2,2,1,1,2]
    actual=[sum(1 for p,_,__ in found if p==i) for i in range(1,13)]
    if actual!=expected:
        raise RuntimeError(f'page question distribution mismatch: {actual} != {expected}')
    return found

def crop():
    td,pages=render()
    try:
        seq=starts(pages)
        OUT.mkdir(parents=True,exist_ok=True)
        for i,(pg,y0,y1) in enumerate(seq):
            q=i+1
            im=Image.open(pages[pg]).convert('RGB')
            w,h=im.size
            top=max(0,y0-26)
            if i+1<len(seq) and seq[i+1][0]==pg:
                bottom=max(top+80,seq[i+1][1]-24)
            else:
                bottom=min(h-90,int(h*.955))
            box=(145,top,w-90,bottom)
            out=OUT/f'q{q:02}.png'
            im.crop(box).save(out,optimize=True)
            if out.stat().st_size<7000: raise RuntimeError(f'Q{q}: suspiciously small crop {out.stat().st_size}')
        return seq
    finally:
        td.cleanup()

def build(seq):
    choices=[{'key':k,'label':k} for k in 'ABCDE']
    profile={
      'id':'maa-amc8-2024-user-owned','name':'2024 MAA AMC 8 · Bilingual Past Paper',
      'nameZh':'2024 美国 MAA AMC 8 · 中英双语真题','nameEn':'2024 MAA AMC 8 · Bilingual Past Paper',
      'grades':'Grade 8 and below','gradesZh':'8年级及以下','gradesEn':'Grade 8 and below',
      'durationSeconds':2400,'questionCount':25,'initialScore':0,'maxScore':25,
      'wrongPenaltyMode':'fixed','wrongPenaltyValue':0,'blankScoreValue':0,
      'country':'MAA AMC','year':2024,'language':'zh/en',
      'sourceLabel':'User-owned bilingual 2024 MAA AMC 8 paper',
      'sourceLabelZh':'用户自有资料 · 2024 MAA AMC 8 中英双语真题',
      'sourceLabelEn':'User-owned bilingual 2024 MAA AMC 8 paper',
      'studentReady':True,'competitionId':'maa-amc','formatId':'maa-amc8','paperType':'past',
      'gradeBand':'7-8','timingMode':'official','formatLabelZh':'美国 MAA AMC 8 正式赛制',
      'formatLabelEn':'MAA AMC 8 official format',
      'rulesSummaryZh':'25道选择题，40分钟；答对1分，空题0分，答错0分，满分25分；禁止使用计算器。',
      'rulesSummaryEn':'25 multiple-choice questions in 40 minutes; 1 point correct, 0 blank, 0 wrong; maximum 25; calculators are not allowed.'
    }
    qs=[]
    for q,(pg,_,__) in enumerate(seq,1):
        url=f'/local-assets/maa-amc/2024/AMC_8_bilingual/q{q:02}.png'
        qs.append({
          'id':f'maa-amc8-2024-q{q:02}','year':2024,'level':'AMC 8',
          'grades':'Grade 8 and below','language':'zh/en','questionNo':q,'points':1,
          'answerMode':'choice','concept':'official_original',
          'stem':'请查看下方官方中英双语原题图。','stemEn':'See the official bilingual problem image below.',
          'choices':choices,'choicesEn':choices,'answer':ANS[q-1],
          'solution':f'Correct answer: {ANS[q-1]}','sourceFile':str(SRC),
          'assetUrl':url,'assetUrlZh':url,'assetUrlEn':url,'studentAssetUrl':url,
          'studentAssetUrlZh':url,'studentAssetUrlEn':url,'verified':True,'examReady':True,
          'sourceMeta':{'rightsStatus':'user-owned','sourcePdfPage':pg,'cropMethod':'visual-left-margin-question-start'}
        })
    BUNDLE.parent.mkdir(parents=True,exist_ok=True)
    BUNDLE.write_text(json.dumps({'profile':profile,'questions':qs},ensure_ascii=False,indent=2))
    print(f'IMPORTED {BUNDLE.name} questions={len(qs)} assets={len(list(OUT.glob("q*.png")))}')

if __name__=='__main__':
    seq=crop(); build(seq)
    print('PAGE_DISTRIBUTION',[sum(1 for p,_,__ in seq if p==i) for i in range(1,13)])
    print('ANSWERS',''.join(ANS))
