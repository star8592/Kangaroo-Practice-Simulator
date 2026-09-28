#!/usr/bin/env python3
import json,re,subprocess,os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=Path(os.environ.get('KANGAROO_GRADE1_2_SAMPLE_SOURCE','/mnt/disk1/master_data/Education/Math_Kangaroo_Library/01_Official_USA/Sample_Questions_2006_2026'))
OUT=ROOT/'private/exams/kangaroo-grade1-2-official-samples-2006-2026.json'
ASSET='/local-assets/kangaroo/grade-1-2/samples'

ANS={
2006:['D','E','C'],2007:['D','C','D'],2008:['D','D','C'],2009:['D','D','B'],
2010:['C','B','B'],2011:['B','B','B'],2012:['C','B','C'],2013:['D','C','C'],
2014:['B','E','A'],2015:['D','C','D'],2016:['B','C','D'],2017:['C','D','C'],
2018:['D','D','A'],2019:['B','A','A'],2020:['A','E','C'],2021:['D','B','A'],
2022:['B','A','C'],2023:['E','C','A'],2024:['E','D','D'],2025:['B','C','D'],2026:['A','D','D'],
}

def page_text(pdf):
    return subprocess.check_output(['pdftotext','-f','1','-l','1','-layout',str(pdf),'-'],stderr=subprocess.DEVNULL,text=True,errors='ignore')

def clean_block(block):
    lines=[]
    for raw in block.splitlines():
        line=re.sub(r'\s+',' ',raw).strip()
        if not line: continue
        if re.search(r'Math Kangaroo|Sample Questions|LEVELS? 1 AND 2|GRADES? 1 AND 2|Copyright|All rights reserved|www\.mathkangaroo',line,re.I): continue
        if re.search(r'^©',line): continue
        # options begin; the official cropped image keeps all option art/text.
        if re.search(r'(^|\s)(?:\(A\)|A\))\s*',line): break
        lines.append(line)
    text=' '.join(lines)
    text=re.sub(r'^\d{1,2}\.\s*','',text)
    return text.strip()

def sections(text):
    hits=[]
    rx=re.compile(r'SAMPLE QUESTION FOR\s+([345])\s+POINTS?',re.I)
    for m in rx.finditer(text): hits.append((m.start(),m.end(),int(m.group(1))))
    out={}
    for i,(start,end,pts) in enumerate(hits):
        nxt=hits[i+1][0] if i+1<len(hits) else len(text)
        out[pts]=clean_block(text[end:nxt])
    return out

questions=[]
for pdf in sorted(SRC.glob('*.pdf')):
    m=re.search(r'(20\d\d)',pdf.name)
    if not m: continue
    year=int(m.group(1))
    blocks=sections(page_text(pdf))
    if set(blocks)!={3,4,5}: raise SystemExit(f'{year}: section parse failed {blocks.keys()}')
    for idx,pts in enumerate((3,4,5)):
        qid=f'mk-g12-{year}-{pts}pt'
        asset=f'{ASSET}/{year}/{pts}pt.png'
        asset_path=ROOT/'public'/asset.lstrip('/')
        if not asset_path.exists(): raise SystemExit(f'missing asset {asset_path}')
        stem=blocks[pts]
        if not stem: raise SystemExit(f'{year} {pts}: empty stem')
        questions.append({
            'id':qid,'year':year,'level':'Levels 1-2','grades':[1,2],'gradeBand':'1-2',
            'language':'en','questionNo':len(questions)+1,'points':pts,'difficultyPoints':pts,
            'answerMode':'choice','concept':'official_sample','stem':stem,'stemEn':stem,
            'choices':[{'key':k,'label':k} for k in 'ABCDE'],
            'choicesEn':[{'key':k,'label':k} for k in 'ABCDE'],
            'answer':ANS[year][idx],'solution':'',
            'sourceFile':str(pdf),'assetUrl':asset,'assetUrlEn':asset,'studentAssetUrlEn':asset,
            'verified':True,'examReady':False,
            'sourceMeta':{'competition':'Math Kangaroo USA','collection':'Official Sample Questions','official':True,'year':year,'points':pts,'sourcePageQuestion':1,'sourcePageAnswer':2}
        })

data={
 'profile':{
  'id':'kangaroo-grade1-2-official-samples-2006-2026',
  'name':'Math Kangaroo Grades 1–2 · Official Sample Bank 2006–2026',
  'nameZh':'袋鼠数学 Grades 1–2 · 官方样题库 2006–2026',
  'nameEn':'Math Kangaroo Grades 1–2 · Official Sample Bank 2006–2026',
  'grades':[1,2],'gradesZh':'1–2年级','gradesEn':'Grades 1–2','gradeBand':'1-2',
  'durationSeconds':0,'timingMode':'untimed','questionCount':len(questions),
  'initialScore':0,'maxScore':sum(q['points'] for q in questions),
  'country':'Math Kangaroo USA','competitionId':'kangaroo','formatId':'kangaroo-grade1-2-sample-bank',
  'paperType':'sample-bank','formatLabelZh':'Grades 1–2 官方样题库','formatLabelEn':'Grades 1–2 official sample bank',
  'rulesSummaryZh':'2006–2026 官方 Sample Questions，共63题；每年3/4/5分题各1题。该集合用于题库与智能模拟选题，不等同于某一届正式完整试卷。',
  'rulesSummaryEn':'Official Sample Questions from 2006–2026, 63 questions total; one 3-, 4-, and 5-point sample per year. This is a source bank, not a single official full exam.',
  'language':'en','sourceLabel':'Math Kangaroo USA official sample questions 2006–2026',
  'sourceLabelZh':'Math Kangaroo USA 官方 Sample Questions 2006–2026','sourceLabelEn':'Math Kangaroo USA official Sample Questions 2006–2026',
  'studentReady':False
 },
 'questions':questions
}
OUT.parent.mkdir(parents=True,exist_ok=True)
tmp=OUT.with_suffix('.json.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(OUT)
print('KANGAROO_GRADE1_2_SAMPLE_BANK=PASS questions',len(questions),'points',sum(q['points'] for q in questions))
for q in questions[:6]: print(q['id'],q['answer'],q['stem'][:120])
