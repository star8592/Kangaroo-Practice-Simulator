#!/usr/bin/env python3
import argparse,csv,json,re,html,unicodedata,subprocess,time,base64,urllib.request,threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from bs4 import BeautifulSoup
import requests, websocket

DIVS={
 'Middle_Primary':('Middle Primary','3–4年级','Years 3–4',60),
 'Upper_Primary':('Upper Primary','5–6年级','Years 5–6',60),
 'Junior':('Junior','7–8年级','Years 7–8',75),
 'Intermediate':('Intermediate','9–10年级','Years 9–10',75),
 'Senior':('Senior','11–12年级','Years 11–12',75),
}
KEYS='ABCDE'
def norm(s):
 s=html.unescape(s or '')
 s=unicodedata.normalize('NFKC',s)
 for cmd in ('textsf','text','mathrm','mathbf','dfrac','frac'):
  s=s.replace('\\'+cmd,'')
 s=s.replace('\\circ','°').replace('\\,','').replace('\\ ','').replace('\\times','×').replace('\\div','÷')
 s=re.sub(r'\\[()\[\]]','',s); s=re.sub(r'[{}$\\]','',s)
 return re.sub(r'[^0-9a-zA-Z°.+\-×÷/]+','',s).lower()
def answer_p(soup):
 for p in soup.select('#page_content p'):
  if 'answer:' in p.get_text(' ',strip=True).lower(): return p
 return None
def parse_answer(qhtml,ehtml,qno):
 qs=BeautifulSoup(qhtml,'html.parser'); es=BeautifulSoup(ehtml,'html.parser'); ap=answer_p(es)
 if qno>=26:
  t=ap.get_text(' ',strip=True) if ap else ''
  m=re.search(r'Answer\s*:\s*[^0-9-]*(-?\d{1,3})',t,re.I)
  if not m: m=re.search(r'(-?\d{1,3})',t)
  return (m.group(1) if m else None),'integer'
 elems=qs.select('.question.submit')
 if len(elems)!=5: return None,'choice'
 vals=[]
 for el in elems:
  onclick=el.get('onclick',''); m=re.search(r"SaveAnswer\('(.+?)'\)",onclick)
  vals.append(m.group(1) if m else el.get_text(' ',strip=True))
 if ap:
  img=ap.find('img')
  if img:
   hint=' '.join([img.get('src',''),img.get('title',''),img.get('alt','')]).lower()
   for i,v in enumerate(vals):
    token=norm(v)
    if token and token in norm(hint): return KEYS[i],'choice'
   # common choiceA/choiceB filename convention
   m=re.search(r'choice\s*([a-e])',hint,re.I)
   if m: return m.group(1).upper(),'choice'
  atxt=re.sub(r'^.*?Answer\s*:\s*','',ap.get_text(' ',strip=True),flags=re.I)
  na=norm(atxt)
  for i,v in enumerate(vals):
   nv=norm(BeautifulSoup(v,'html.parser').get_text(' ',strip=True))
   if nv and (nv==na or nv in na or na in nv): return KEYS[i],'choice'
 # One shared 2024 primary card-category item has image-only choices; explanation says 'A seven', which is option E.
 if ap and 'a seven' in ap.get_text(' ',strip=True).lower(): return 'E','choice'
 return None,'choice'

def cdp_connect(port):
 tabs=requests.get(f'http://127.0.0.1:{port}/json').json(); pages=[t for t in tabs if t.get('type')=='page' and not str(t.get('url','')).startswith('chrome-extension://')]; tab=pages[0] if pages else tabs[0]
 ws=websocket.create_connection(tab['webSocketDebuggerUrl'],timeout=20,origin=f'http://127.0.0.1:{port}')
 return ws

def cmd(ws,mid,method,params=None):
 ws.send(json.dumps({'id':mid,'method':method,'params':params or {}}))
 while True:
  d=json.loads(ws.recv())
  if d.get('id')==mid: return d

def screenshot(ws,url,out,mid):
 cmd(ws,mid,'Page.navigate',{'url':url}); mid+=1
 deadline=time.time()+25; box=None
 expr="""(()=>{const e=document.querySelector('#page_content');if(!e)return null;const r=e.getBoundingClientRect();return{x:Math.max(0,r.x),y:Math.max(0,r.y),width:Math.max(1,Math.ceil(r.width)),height:Math.max(1,Math.ceil(r.height))}})()"""
 while time.time()<deadline:
  r=cmd(ws,mid,'Runtime.evaluate',{'expression':expr,'returnByValue':True}); mid+=1
  box=r.get('result',{}).get('result',{}).get('value')
  if box: break
  time.sleep(.2)
 if not box:
  r=cmd(ws,mid,'Runtime.evaluate',{'expression':'location.href+\" | \"+document.title','returnByValue':True}); mid+=1
  raise RuntimeError('page_content missing: '+str(r.get('result',{}).get('result',{}).get('value')))
 # Wait for every diagram / image-choice to finish loading before capture.
 img_deadline=time.time()+20
 while time.time()<img_deadline:
  r=cmd(ws,mid,'Runtime.evaluate',{'expression':"Array.from(document.querySelectorAll('#page_content img')).every(i=>i.complete&&i.naturalWidth>0)",'returnByValue':True}); mid+=1
  if r.get('result',{}).get('result',{}).get('value') is True: break
  time.sleep(.15)
 time.sleep(.35)
 box['scale']=1
 r=cmd(ws,mid,'Page.captureScreenshot',{'format':'png','captureBeyondViewport':True,'clip':box}); mid+=1
 out.parent.mkdir(parents=True,exist_ok=True); out.write_bytes(base64.b64decode(r['result']['data']))
 return mid

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--archive',default='/mnt/disk1/Code/Australian-AMC-Archive/data/problemo_published_questions.csv'); ap.add_argument('--library',default='/mnt/disk1/master_data/Education/Australian_AMC_Library'); ap.add_argument('--repo',default='.'); ap.add_argument('--years',default='2024,2025'); ap.add_argument('--skip-screenshots',action='store_true'); a=ap.parse_args()
 repo=Path(a.repo).resolve(); lib=Path(a.library); years={int(x) for x in a.years.split(',')}
 rows=[r for r in csv.DictReader(open(a.archive,encoding='utf-8-sig')) if int(r['year']) in years]
 parsed=[]; bad=[]
 for r in rows:
  q=(lib/r['question_path']).read_text(errors='ignore'); e=(lib/r['explanation_path']).read_text(errors='ignore')
  ans,mode=parse_answer(q,e,int(r['question_no']));
  if ans is None: bad.append((r['year'],r['division'],r['question_no']))
  parsed.append((r,ans,mode,e))
 if bad: raise SystemExit(f'Unable to determine answers for {len(bad)} questions: {bad[:30]}')
 print(f'answers verified: {len(parsed)}')
 if not a.skip_screenshots:
  tasks=[x for x in parsed if not (repo/'public'/'local-assets'/'australian-amc'/x[0]['year']/x[0]['division']/f"q{int(x[0]['question_no']):02d}.png").exists()]
  chunks=[tasks[i::6] for i in range(6)]
  done=0; lock=threading.Lock()
  def worker(wid,items):
   nonlocal done
   if not items:return
   port=9567+wid; profile=f'/tmp/amc-import-chrome-{wid}'
   proc=subprocess.Popen(['google-chrome','--headless=new','--no-sandbox','--disable-gpu',f'--remote-debugging-port={port}','--remote-allow-origins=*',f'--user-data-dir={profile}','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   try:
    for _ in range(80):
     try: ws=cdp_connect(port); break
     except Exception: time.sleep(.1)
    else: raise RuntimeError(f'chrome debug port unavailable {port}')
    mid=1
    for r,_,_,_ in items:
     out=repo/'public'/'local-assets'/'australian-amc'/r['year']/r['division']/f"q{int(r['question_no']):02d}.png"
     try: mid=screenshot(ws,r['urlquestion'],out,mid)
     except Exception:
      time.sleep(.5); mid=screenshot(ws,r['urlquestion'],out,mid)
     with lock:
      done+=1
      if done%25==0 or done==len(tasks): print('screenshots',done,'/',len(tasks),flush=True)
    ws.close()
   finally:
    proc.terminate()
    try:proc.wait(timeout=5)
    except:proc.kill()
  with ThreadPoolExecutor(max_workers=6) as ex:
   futs=[ex.submit(worker,i,c) for i,c in enumerate(chunks)]
   for f in as_completed(futs): f.result()
 for year in sorted(years):
  for folder,(div,zhg,eng,mins) in DIVS.items():
   subset=[x for x in parsed if int(x[0]['year'])==year and x[0]['division']==folder]
   if len(subset)!=30: raise SystemExit(f'{year} {folder}: expected 30, got {len(subset)}')
   questions=[]
   for r,ans,mode,ehtml in sorted(subset,key=lambda x:int(x[0]['question_no'])):
    qno=int(r['question_no']); pts=3 if qno<=10 else 4 if qno<=20 else 5 if qno<=25 else qno-20
    es=BeautifulSoup(ehtml,'html.parser'); pc=es.select_one('#page_content'); sol=pc.get_text(' ',strip=True) if pc else ''
    questions.append({'id':f'au-amc-{year}-{folder.lower().replace("_","-")}-q{qno:02d}','year':year,'level':div,'grades':eng,'language':'en','questionNo':qno,'points':pts,'concept':'official_original','stem':'Refer to the official question image below.','choices':([{'key':k,'label':k} for k in KEYS] if mode=='choice' else []),'answer':ans,'answerMode':mode,'solution':sol,'sourceFile':str(lib/r['question_path']),'assetUrl':f'/local-assets/australian-amc/{year}/{folder}/q{qno:02d}.png','verified':True,'examReady':True,'sourceMeta':{'questionId':r['question_id'],'identifier':r['identifier'],'urlquestion':r['urlquestion'],'urlexplanation':r['urlexplanation']}})
   profile={'id':f'au-amc-{year}-{folder.lower().replace("_","-")}','name':f'Australian AMC {year} · {div}','nameZh':f'{year} 澳洲 AMC · {div}','nameEn':f'{year} Australian AMC · {div}','grades':eng,'gradesZh':zhg,'gradesEn':eng,'durationSeconds':mins*60,'questionCount':30,'initialScore':0,'maxScore':135,'wrongPenaltyMode':'fixed','wrongPenaltyValue':0,'country':'Australia AMC','year':year,'language':'en','sourceLabel':'Australian Maths Trust · official Problemo archive','sourceLabelZh':'澳大利亚数学信托 AMT · 官方 Problemo 历年题','sourceLabelEn':'Australian Maths Trust · official Problemo archive','studentReady':True}
   out=repo/'private'/'exams'/f"{profile['id']}.json"; out.write_text(json.dumps({'profile':profile,'questions':questions},ensure_ascii=False,indent=2),encoding='utf-8')
   print('bundle',out)
if __name__=='__main__': main()
