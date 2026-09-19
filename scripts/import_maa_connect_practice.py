#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import json,re,subprocess,tempfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]; SRC=Path('/mnt/disk1/master_data/Education/MAA_AMC_Library/official_practice'); PUB=ROOT/'public/local-assets/maa-amc/practice'; EX=ROOT/'private/exams'; DPI=170; SCALE=DPI/72
TITLES={'ordered-list':'Make an Ordered List','work-backwards':'Work Backwards','casework':'Casework','find-pattern':'Find a Pattern','guess-check':'Guess and Check','simpler-problem':'Solve a Simpler Problem','symmetry':'Use Symmetry','equation':'Write an Equation','number-sense':'Number Sense / Number Theory','functions':'Functions','probability':'Probability / Counting','geometry':'Geometry','algebra':'Algebra'}
def txt(p):return subprocess.check_output(['pdftotext','-layout',str(p),'-'],text=True,errors='ignore')
def bboxseq(pdf,n):
 raw=subprocess.check_output(['pdftotext','-bbox-layout',str(pdf),'-'],text=True,errors='ignore');raw=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',raw);root=ET.fromstring(raw);ns={'x':'http://www.w3.org/1999/xhtml'};occ={q:[] for q in range(1,n+1)}
 for pi,page in enumerate(root.findall('.//x:page',ns)):
  for w in page.findall('.//x:word',ns):
   m=re.fullmatch(r'(\d{1,2})\.',(w.text or '').strip())
   if m:
    q=int(m.group(1));x=float(w.attrib['xMin']);y=float(w.attrib['yMin'])
    if 1<=q<=n and x<180:occ[q].append((pi+1,y,x))
 cand=[]
 for first in occ[1]:
  seq=[first];prev=(first[0],first[1]);ok=True
  for q in range(2,n+1):
   xs=[z for z in occ[q] if (z[0],z[1])>prev]
   if not xs:ok=False;break
   z=min(xs,key=lambda z:(z[0],z[1]));seq.append(z);prev=(z[0],z[1])
  if ok:cand.append(seq)
 if not cand:raise RuntimeError(f'{pdf}: no ordered 1..{n}')
 return min(cand,key=lambda z:(z[0][0],z[-1][0],z[0][1]))
def crop(pdf,n,out):
 seq=bboxseq(pdf,n); first=min(x[0] for x in seq); info=subprocess.check_output(['pdfinfo',str(pdf)],text=True,errors='ignore'); total=int(re.search(r'^Pages:\s*(\d+)',info,re.M).group(1)); last=total; out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='maa-practice-') as td:
  pref=Path(td)/'p';subprocess.run(['pdftoppm','-png','-r',str(DPI),'-f',str(first),'-l',str(last),str(pdf),str(pref)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);pages={first+i:p for i,p in enumerate(sorted(Path(td).glob('p-*.png')))};cache={}
  for i,(pg,y,_) in enumerate(seq):
   nextpos=seq[i+1] if i+1<n else (last,None,None); endpg=nextpos[0] if i+1<n else last; parts=[]
   for cur in range(pg,endpg+1):
    im=cache.setdefault(cur,Image.open(pages[cur]).convert('RGB'));w,h=im.size
    left,right=int(18*SCALE),w-int(18*SCALE)
    top=max(0,int((y-8)*SCALE)) if cur==pg else int(12*SCALE)
    if i+1<n and cur==endpg: bottom=int((nextpos[1]-4)*SCALE)
    else: bottom=h-int(12*SCALE)
    bottom=max(top+20,min(h,bottom))
    if bottom>top+20: parts.append(im.crop((left,top,right,bottom)))
   if not parts: raise RuntimeError(f'{pdf}: empty crop q{i+1}')
   if len(parts)==1: final=parts[0]
   else:
    width=max(x.width for x in parts);height=sum(x.height for x in parts);final=Image.new('RGB',(width,height),'white');yy=0
    for part in parts: final.paste(part,(0,yy));yy+=part.height
   final.save(out/f'q{i+1:02}.png',optimize=True)
def choose_files(d):
 fs=list(d.glob('*.pdf')); probs=[p for p in fs if 'solution' not in p.name.lower() and 'extension' not in p.name.lower() and not p.name.startswith('file')];sols=[p for p in fs if 'solution' in p.name.lower() and 'extension' not in p.name.lower()]
 return (probs[0],sols[0]) if probs and sols else (None,None)
def build(d):
 m=re.fullmatch(r'(amc8|amc10|amc12)-(.+)',d.name)
 if not m:return False
 stage,slug=m.groups();problems,solutions=choose_files(d)
 if not problems or not solutions:return False
 pt,st=txt(problems),txt(solutions);answers=re.findall(r'Solution:\s*\(([A-E])\)',st,re.I);sources=[re.sub(r'\s+',' ',x).strip() for x in re.findall(r'Source:\s*([^\n\r]+)',pt,re.I)]
 n=len(answers)
 if n<3 or len(sources)!=n:raise RuntimeError(f'{d.name}: questions={n} sources={len(sources)}')
 fmt={'amc8':'maa-amc8','amc10':'maa-amc10','amc12':'maa-amc12'}[stage];band={'amc8':'7-8','amc10':'9-10','amc12':'11+'}[stage];label={'amc8':'AMC 8','amc10':'AMC 10','amc12':'AMC 12'}[stage];topic=TITLES.get(slug,slug.replace('-',' ').title());eid=f'maa-{stage}-practice-{slug}';out=PUB/stage/slug;crop(problems,n,out);choices=[{'key':k,'label':k} for k in 'ABCDE'];qs=[]
 for i,a in enumerate(answers,1):
  url=f'/local-assets/maa-amc/practice/{stage}/{slug}/q{i:02}.png';qs.append(dict(id=f'{eid}-q{i:02}',year=2026,level=label,grades={'amc8':'Grades 7–8','amc10':'Grades 9–10','amc12':'Grades 11–12'}[stage],language='en',questionNo=i,points=1,answerMode='choice',concept=f'maa_practice_{slug.replace("-","_")}',stem=f'{label} · {topic} · Question {i}',choices=choices,answer=a.upper(),solution=f'Correct answer: {a.upper()}',sourceFile=str(problems),assetUrl=url,studentAssetUrl=url,verified=True,examReady=True,sourceMeta={'originalSource':sources[i-1],'maaConnectSet':d.name}))
 profile=dict(id=eid,name=f'MAA {label} · {topic} · Official Practice',nameZh=f'美国 MAA {label} · {topic} · 官方专项训练',nameEn=f'MAA {label} · {topic} · Official Practice',grades={'amc8':'Grades 7–8','amc10':'Grades 9–10','amc12':'Grades 11–12'}[stage],gradesZh={'amc8':'7–8年级','amc10':'9–10年级','amc12':'11–12年级'}[stage],gradesEn={'amc8':'Grades 7–8','amc10':'Grades 9–10','amc12':'Grades 11–12'}[stage],durationSeconds=0,questionCount=n,initialScore=0,maxScore=n,wrongPenaltyMode='fixed',wrongPenaltyValue=0,blankScoreValue=0,country='MAA AMC',year=2026,language='en',sourceLabel='MAA Programs · Math Club Resource Hub · official practice set',sourceLabelZh='MAA Programs · Math Club Resource Hub 官方专项练习',sourceLabelEn='MAA Programs · Math Club Resource Hub · official practice set',studentReady=True,competitionId='maa-amc',formatId=fmt,paperType='practice',gradeBand=band,timingMode='untimed',formatLabelZh=f'美国 MAA {label} · 官方专项训练',formatLabelEn=f'MAA {label} · Official Practice',rulesSummaryZh=f'{n}道 MAA 官方专题精选题；不限时训练，每题1分，仅用于专项练习，不作为正式 {label} 模拟成绩。',rulesSummaryEn=f'{n} official MAA topic-practice questions; untimed, 1 point each; practice only, not a formal {label} mock score.')
 EX.mkdir(parents=True,exist_ok=True);(EX/f'{eid}.json').write_text(json.dumps({'profile':profile,'questions':qs},ensure_ascii=False,indent=2)+'\n');print('IMPORTED',eid,n);return True
count=0
for d in sorted(SRC.iterdir()):
 if d.is_dir() and build(d):count+=1
print('PRACTICE_IMPORTED',count)
