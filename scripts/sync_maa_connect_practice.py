#!/usr/bin/env python3
from pathlib import Path
import urllib.request,re,html as H,json,time
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/153 Safari/537.36'
ROOT=Path('/mnt/disk1/master_data/Education/MAA_AMC_Library/official_practice')
COMM='23b1e210-33fb-4cc6-b294-019eb20eba58'
SETS=[
 ('amc8','ordered-list','Make an Ordered List','make-an-ordered-list'),('amc8','work-backwards','Work Backwards','work-backwards'),('amc8','casework','Casework','casework'),('amc8','find-pattern','Find a Pattern','find-a-pattern'),('amc8','guess-check','Guess and Check','guess-and-check'),('amc8','simpler-problem','Solve a Simpler Problem','solve-a-simpler-problem'),('amc8','symmetry','Use Symmetry','use-symmetry'),('amc8','equation','Write an Equation','write-an-equation-problem-set'),
 ('amc10','number-sense','Number Sense / Number Theory','amc-10-number-sense-number-theory'),('amc10','functions','Functions','amc-10-functions'),('amc10','probability','Probability / Counting','amc-10-probability'),('amc10','geometry','Geometry','amc-10-geometry'),('amc10','algebra','Algebra','amc-10-algebra'),
 ('amc12','number-sense','Number Sense / Number Theory','amc-12-number-sense-number-theory'),('amc12','functions','Functions','amc-12-functions'),('amc12','probability','Probability / Counting','amc-12-probability'),('amc12','geometry','Geometry','amc-12-geometry'),('amc12','algebra','Algebra','amc-12-algebra'),
]
def get(url,ref=None):
 h={'User-Agent':UA};
 if ref:h['Referer']=ref
 return urllib.request.urlopen(urllib.request.Request(url,headers=h),timeout=30).read()
def safe(s):return re.sub(r'[^A-Za-z0-9._-]+','_',s).strip('_')
ROOT.mkdir(parents=True,exist_ok=True); catalog=[]
for stage,slug,title,page_slug in SETS:
 page=f'https://connect.maa.org/viewdocument/{page_slug}?CommunityKey={COMM}&tab=librarydocuments'
 raw=get(page).decode('utf-8','ignore'); files=[]; seen=set()
 pat=re.compile(r'<a[^>]+title=["\']([^"\']+\.pdf)["\'][^>]+href=["\']([^"\']*DocumentFileKey=([0-9a-f-]+)[^"\']*)["\']',re.I)
 for name,href,key in pat.findall(raw):
  if key in seen:continue
  seen.add(key); name=H.unescape(name); href=H.unescape(href)
  if href.startswith('/'):href='https://connect.maa.org'+href
  d=ROOT/f'{stage}-{slug}';d.mkdir(exist_ok=True);dest=d/safe(name)
  if not dest.exists() or dest.stat().st_size<1000: dest.write_bytes(get(href,page));time.sleep(.1)
  low=name.lower();kind='solutions' if 'solution' in low else 'extension' if 'extension' in low else 'problems'
  files.append({'kind':kind,'name':name,'path':str(dest.relative_to(ROOT)),'documentFileKey':key,'bytes':dest.stat().st_size})
 kinds={x['kind'] for x in files}
 if not {'problems','solutions'}<=kinds:
  print('SOURCE_ANOMALY',stage,slug,'missing required files',kinds,flush=True);catalog.append({'stage':stage,'slug':slug,'title':title,'page':page,'publisher':'MAA Programs','published':'2026-07','files':files,'rightsStatus':'official-public','status':'source-anomaly'});continue
 catalog.append({'stage':stage,'slug':slug,'title':title,'page':page,'publisher':'MAA Programs','published':'2026-07','files':files,'rightsStatus':'official-public'})
 print(stage,slug,[(x['kind'],x['bytes']) for x in files],flush=True)
(ROOT/'catalog.json').write_text(json.dumps({'syncedAt':'2026-09-18','sets':catalog},ensure_ascii=False,indent=2)+'\n')
print('SYNCED',len(catalog),'sets',sum(len(x['files']) for x in catalog),'files')
