#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import json,re,subprocess,tempfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
LIB=Path('/mnt/disk1/master_data/Education/MAA_AMC_Library/official_samples')
PUB=ROOT/'public/local-assets/maa-amc'
EXAMS=ROOT/'private/exams'
DPI=170; SCALE=DPI/72
SETS=[
 dict(key='2023_AMC8',id='maa-amc8-2023-sample',year=2023,label='AMC 8',grades='Grade 8 and below',band='7-8',format='maa-amc8',minutes=40,points=1,max=25,blank=0,source='MAA · official Sample Competition: 2023 AMC 8'),
 dict(key='2022_AMC10A',id='maa-amc10-2022-a-sample',year=2022,label='AMC 10 A',grades='Grade 10 and below',band='9-10',format='maa-amc10',minutes=75,points=6,max=150,blank=1.5,source='MAA · official Sample Competition: 2022 AMC 10 A'),
]
def text(pdf): return subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True,errors='ignore')
def answers(cfg,pdf):
 t=text(pdf)
 seq=re.findall(r'Answer\s*\(([A-E])\)',t)
 if len(seq)!=25: raise RuntimeError(f"{cfg['key']} sequential answer coverage {len(seq)}/25")
 return {i+1:a for i,a in enumerate(seq)}
def bbox_sequence(pdf):
 raw=subprocess.check_output(['pdftotext','-bbox-layout',str(pdf),'-'],text=True,errors='ignore')
 raw=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',raw); root=ET.fromstring(raw); ns={'x':'http://www.w3.org/1999/xhtml'}
 occ={q:[] for q in range(1,26)}
 for pi,page in enumerate(root.findall('.//x:page',ns)):
  for w in page.findall('.//x:word',ns):
   m=re.fullmatch(r'(\d{1,2})\.',(w.text or '').strip())
   if not m: continue
   q=int(m.group(1)); x=float(w.attrib['xMin']); y=float(w.attrib['yMin'])
   if 1<=q<=25 and pi>=1 and x<170: occ[q].append((pi+1,y,x))
 candidates=[]
 for first in occ[1]:
  seq=[first]; prev=(first[0],first[1]); ok=True
  for q in range(2,26):
   xs=[z for z in occ[q] if (z[0],z[1])>prev]
   if not xs: ok=False; break
   z=min(xs,key=lambda a:(a[0],a[1]));seq.append(z);prev=(z[0],z[1])
  if ok and seq[-1][0]>seq[0][0]: candidates.append(seq)
 if not candidates: raise RuntimeError(f'no 1..25 sequence in {pdf}')
 return min(candidates,key=lambda z:(z[0][0],z[0][1],z[-1][0]))
def crop_questions(pdf,outdir):
 seq=bbox_sequence(pdf); first=min(x[0] for x in seq); last=max(x[0] for x in seq)
 outdir.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='maa-amc-') as td:
  prefix=Path(td)/'page'; subprocess.run(['pdftoppm','-png','-r',str(DPI),'-f',str(first),'-l',str(last),str(pdf),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  pages={first+i:p for i,p in enumerate(sorted(Path(td).glob('page-*.png')))}; cache={}
  for i,(pg,y,_) in enumerate(seq):
   q=i+1; im=cache.setdefault(pg,Image.open(pages[pg]).convert('RGB')); w,h=im.size
   top=max(0,int((y-10)*SCALE))
   if i+1<len(seq) and seq[i+1][0]==pg: bottom=int((seq[i+1][1]-5)*SCALE)
   else: bottom=h-int(28*SCALE)
   bottom=max(top+55,min(h,bottom)); im.crop((int(22*SCALE),top,w-int(22*SCALE),bottom)).save(outdir/f'q{q:02}.png',optimize=True)
def build(cfg):
 base=LIB/cfg['key']; ans=answers(cfg,base/'solutions.pdf'); out=PUB/str(cfg['year'])/cfg['label'].replace(' ','_'); crop_questions(base/'problems.pdf',out)
 choices=[{'key':k,'label':k} for k in 'ABCDE']; qs=[]
 for q in range(1,26):
  url=f"/local-assets/maa-amc/{cfg['year']}/{cfg['label'].replace(' ','_')}/q{q:02}.png"
  qs.append(dict(id=f"{cfg['id']}-q{q:02}",year=cfg['year'],level=cfg['label'],grades=cfg['grades'],language='en',questionNo=q,points=cfg['points'],answerMode='choice',concept='official_original',stem=f"{cfg['label']} · Question {q}",choices=choices,answer=ans[q],solution=f"Correct answer: {ans[q]}",sourceFile=str(base/'problems.pdf'),assetUrl=url,studentAssetUrl=url,verified=True,examReady=True))
 rules='25 multiple-choice questions, 40 minutes; 1 point correct, 0 wrong or blank; maximum 25.' if cfg['format']=='maa-amc8' else '25 multiple-choice questions, 75 minutes; 6 points correct, 1.5 points blank, 0 wrong; maximum 150.'
 ruleszh='25道选择题，40分钟，答对1分，答错或空题0分，满分25分。' if cfg['format']=='maa-amc8' else '25道选择题，75分钟，答对6分，空题1.5分，答错0分，满分150分。'
 profile=dict(id=cfg['id'],name=f"{cfg['year']} MAA {cfg['label']} · Official Sample",nameZh=f"{cfg['year']} 美国 MAA {cfg['label']} · 官方公开样题",nameEn=f"{cfg['year']} MAA {cfg['label']} · Official Sample",grades=cfg['grades'],gradesZh=cfg['grades'],gradesEn=cfg['grades'],durationSeconds=cfg['minutes']*60,questionCount=25,initialScore=0,maxScore=cfg['max'],wrongPenaltyMode='fixed',wrongPenaltyValue=0,blankScoreValue=cfg['blank'],country='MAA AMC',year=cfg['year'],language='en',sourceLabel=cfg['source'],sourceLabelZh=cfg['source'],sourceLabelEn=cfg['source'],studentReady=True,competitionId='maa-amc',formatId=cfg['format'],paperType='sample',gradeBand=cfg['band'],timingMode='official',formatLabelZh=f"美国 MAA {cfg['label']} 正式赛制",formatLabelEn=f"MAA {cfg['label']} official format",rulesSummaryZh=ruleszh,rulesSummaryEn=rules)
 EXAMS.mkdir(parents=True,exist_ok=True); (EXAMS/f"{cfg['id']}.json").write_text(json.dumps({'profile':profile,'questions':qs},ensure_ascii=False,indent=2)+'\n')
 print(cfg['id'],'answers=25 assets=',len(list(out.glob('q*.png'))))
for cfg in SETS: build(cfg)
