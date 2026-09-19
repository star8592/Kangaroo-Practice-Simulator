#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import argparse,json,re,subprocess,tempfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]; PUB=ROOT/'public/local-assets/maa-amc'; EXAMS=ROOT/'private/exams'; DPI=170; SCALE=DPI/72
FORMATS={
 'maa-amc8':dict(count=25,minutes=40,max=25,points=1,blank=0,mode='choice',band='7-8'),
 'maa-amc10':dict(count=25,minutes=75,max=150,points=6,blank=1.5,mode='choice',band='9-10'),
 'maa-amc12':dict(count=25,minutes=75,max=150,points=6,blank=1.5,mode='choice',band='11+'),
 'maa-aime-classic':dict(count=15,minutes=180,max=15,points=1,blank=0,mode='integer',band='11+'),
 'maa-aime-2027':dict(count=15,minutes=180,max=15,points=1,blank=0,mode='integer',band='11+',sections=[
   dict(labelZh='第1部分',labelEn='Part 1',questionStart=1,questionEnd=8,durationSeconds=5400,lockAfter=True),
   dict(labelZh='第2部分',labelEn='Part 2',questionStart=9,questionEnd=15,durationSeconds=5400,lockAfter=True),
 ]),
}
ALLOWED_RIGHTS={'official-public','licensed','user-owned'}
def pdftext(p): return subprocess.check_output(['pdftotext','-layout',str(p),'-'],text=True,errors='ignore')
def answers(entry,fmt,root):
 if entry.get('answers'):
  vals=[str(x).strip().upper() for x in entry['answers']]
 else:
  sol=root/entry['solutions']; t=pdftext(sol)
  if fmt['mode']=='choice': vals=re.findall(r'Answer\s*\(([A-E])\)',t)
  else: vals=[]
 if len(vals)!=fmt['count']: raise RuntimeError(f"{entry['id']}: answer coverage {len(vals)}/{fmt['count']}; integer papers should provide explicit manifest answers if the official PDF is not machine-readable")
 if fmt['mode']=='choice' and any(x not in 'ABCDE' for x in vals): raise RuntimeError(f"{entry['id']}: invalid choice answer")
 if fmt['mode']=='integer' and any(not x.isdigit() or not 0<=int(x)<=999 for x in vals): raise RuntimeError(f"{entry['id']}: invalid integer answer")
 return {i+1:x for i,x in enumerate(vals)}
def bboxseq(pdf,count):
 raw=subprocess.check_output(['pdftotext','-bbox-layout',str(pdf),'-'],text=True,errors='ignore'); raw=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',raw); root=ET.fromstring(raw); ns={'x':'http://www.w3.org/1999/xhtml'}; occ={q:[] for q in range(1,count+1)}
 for pi,page in enumerate(root.findall('.//x:page',ns)):
  for w in page.findall('.//x:word',ns):
   m=re.fullmatch(r'(\d{1,2})\.',(w.text or '').strip())
   if m:
    q=int(m.group(1)); x=float(w.attrib['xMin']); y=float(w.attrib['yMin'])
    if 1<=q<=count and x<180: occ[q].append((pi+1,y,x))
 candidates=[]
 for first in occ[1]:
  seq=[first]; prev=(first[0],first[1]); ok=True
  for q in range(2,count+1):
   xs=[z for z in occ[q] if (z[0],z[1])>prev]
   if not xs: ok=False; break
   z=min(xs,key=lambda a:(a[0],a[1]));seq.append(z);prev=(z[0],z[1])
  if ok and seq[-1][0]>=seq[0][0]: candidates.append(seq)
 if not candidates: raise RuntimeError(f'{pdf}: cannot find ordered 1..{count} question numbers')
 return min(candidates,key=lambda z:(z[0][0],z[0][1],z[-1][0]))
def crop(pdf,count,out):
 seq=bboxseq(pdf,count); first=min(x[0] for x in seq);last=max(x[0] for x in seq);out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='maa-manifest-') as td:
  prefix=Path(td)/'p';subprocess.run(['pdftoppm','-png','-r',str(DPI),'-f',str(first),'-l',str(last),str(pdf),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);pages={first+i:p for i,p in enumerate(sorted(Path(td).glob('p-*.png')))};cache={}
  for i,(pg,y,_) in enumerate(seq):
   im=cache.setdefault(pg,Image.open(pages[pg]).convert('RGB'));w,h=im.size;top=max(0,int((y-10)*SCALE));bottom=int((seq[i+1][1]-5)*SCALE) if i+1<len(seq) and seq[i+1][0]==pg else h-int(28*SCALE);bottom=max(top+55,min(h,bottom));im.crop((int(22*SCALE),top,w-int(22*SCALE),bottom)).save(out/f'q{i+1:02}.png',optimize=True)
def rules(entry,fmt):
 label=entry.get('label',entry['formatId'])
 if entry['formatId']=='maa-amc8': return '25道选择题，40分钟；答对1分，答错或空题0分，满分25分。','25 multiple-choice questions in 40 minutes; 1 point correct, 0 wrong or blank; maximum 25.'
 if entry['formatId'] in {'maa-amc10','maa-amc12'}: return f'25道选择题，75分钟；答对6分，空题1.5分，答错0分，满分150分。',f'25 multiple-choice questions in 75 minutes; 6 points correct, 1.5 blank, 0 wrong; maximum 150.'
 if entry['formatId']=='maa-aime-2027': return '15道0–999整数填答题；第1部分Q1–8限时90分钟，第2部分Q9–15限时90分钟；进入第2部分后不可返回第1部分；每题1分。','15 integer-answer questions (0–999); Part 1 is Q1–8 in 90 minutes and Part 2 is Q9–15 in 90 minutes; Part 1 cannot be revisited after Part 2 begins; 1 point each.'
 return '15道0–999整数填答题，每题1分；答错或空题0分。','15 integer-answer questions (0–999), 1 point each; 0 wrong or blank.'
def build(entry,root):
 if entry.get('rightsStatus') not in ALLOWED_RIGHTS: raise RuntimeError(f"{entry.get('id')}: rightsStatus must be one of {sorted(ALLOWED_RIGHTS)}")
 if entry['formatId'] not in FORMATS: raise RuntimeError(f"{entry['id']}: unknown format {entry['formatId']}")
 fmt=FORMATS[entry['formatId']]; problems=root/entry['problems']; ans=answers(entry,fmt,root); out=PUB/str(entry['year'])/entry['id']; crop(problems,fmt['count'],out); rz,re=rules(entry,fmt);choices=[{'key':k,'label':k} for k in 'ABCDE'];qs=[]
 for q in range(1,fmt['count']+1):
  url=f"/local-assets/maa-amc/{entry['year']}/{entry['id']}/q{q:02}.png"; qs.append(dict(id=f"{entry['id']}-q{q:02}",year=entry['year'],level=entry.get('label',entry['formatId']),grades=entry['grades'],language=entry.get('language','en'),questionNo=q,points=fmt['points'],answerMode=fmt['mode'],concept='official_original',stem=f"{entry.get('label',entry['formatId'])} · Question {q}",choices=choices if fmt['mode']=='choice' else [],answer=ans[q],solution=f"Correct answer: {ans[q]}",sourceFile=str(problems),assetUrl=url,studentAssetUrl=url,verified=True,examReady=True))
 profile=dict(id=entry['id'],name=entry.get('name',entry['id']),nameZh=entry.get('nameZh',entry.get('name',entry['id'])),nameEn=entry.get('nameEn',entry.get('name',entry['id'])),grades=entry['grades'],gradesZh=entry.get('gradesZh',entry['grades']),gradesEn=entry.get('gradesEn',entry['grades']),durationSeconds=fmt['minutes']*60,questionCount=fmt['count'],initialScore=0,maxScore=fmt['max'],wrongPenaltyMode='fixed',wrongPenaltyValue=0,blankScoreValue=fmt['blank'],country='MAA AMC',year=entry['year'],language=entry.get('language','en'),sourceLabel=entry.get('sourceLabel','MAA AMC authorized/local source'),studentReady=True,competitionId='maa-amc',formatId=entry['formatId'],paperType=entry.get('paperType','past'),gradeBand=fmt['band'],timingMode=entry.get('timingMode','official'),formatLabelZh=entry.get('formatLabelZh',entry.get('label',entry['formatId'])),formatLabelEn=entry.get('formatLabelEn',entry.get('label',entry['formatId'])),rulesSummaryZh=rz,rulesSummaryEn=re,**({'timingSections':fmt['sections']} if fmt.get('sections') else {}))
 EXAMS.mkdir(parents=True,exist_ok=True);(EXAMS/f"{entry['id']}.json").write_text(json.dumps({'profile':profile,'questions':qs},ensure_ascii=False,indent=2)+'\n');print('IMPORTED',entry['id'],fmt['count'])
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--manifest',required=True);a=ap.parse_args();mp=Path(a.manifest).resolve();data=json.loads(mp.read_text());root=mp.parent
 for e in data.get('entries',[]): build(e,root)
if __name__=='__main__':main()
