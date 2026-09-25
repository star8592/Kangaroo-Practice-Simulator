#!/usr/bin/env python3
from __future__ import annotations

import argparse, json, os, re
from datetime import date
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from competition_rights import publication_policy

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'private'/'source-registry'/'hmmt_archive_index.json'
BASE='https://www.hmmt.org'
INDEX='https://beta.hmmt.org/www/archive/problems'
SOURCE_ID='hmmt-official'


def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--proxy',default=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')); a=ap.parse_args()
 policy=publication_policy(SOURCE_ID)
 if policy['publicQuestionDisplay']:
  raise SystemExit('HMMT collector is designed for metadata-only rights state')
 s=requests.Session(); s.headers['User-Agent']='MathCompetitionLab metadata indexer/1.0'
 if a.proxy: s.proxies.update({'http':a.proxy,'https':a.proxy})
 html=s.get(INDEX,timeout=60); html.raise_for_status(); soup=BeautifulSoup(html.text,'html.parser')
 pages=[]; seen=set()
 for link in soup.find_all('a',href=True):
  href=link['href']; m=re.search(r'/www/archive/(\d+)(?:$|[?#])',href)
  if not m: continue
  url=urljoin(BASE,href); aid=int(m.group(1))
  if aid in seen: continue
  seen.add(aid); pages.append((aid,url))
 records=[]
 for aid,url in sorted(pages):
  rr=s.get(url,timeout=60); rr.raise_for_status(); ps=BeautifulSoup(rr.text,'html.parser')
  title=(ps.find('h1').get_text(' ',strip=True) if ps.find('h1') else f'Archive {aid}')
  rounds=[]
  for tr in ps.find_all('tr'):
   cells=tr.find_all(['th','td'])
   if not cells: continue
   name=cells[0].get_text(' ',strip=True)
   if not name or name.lower()=='results': continue
   links=[]
   for lk in tr.find_all('a',href=True):
    txt=lk.get_text(' ',strip=True).lower(); href=urljoin(BASE,lk['href'])
    if 'problem' in txt or 'solution' in txt:
     links.append({'label':lk.get_text(' ',strip=True),'url':href})
   if links: rounds.append({'round':name,'resources':links})
  records.append({'archiveId':aid,'tournament':title,'archiveUrl':url,'rounds':rounds,'sourceRegistryId':SOURCE_ID,'publicQuestionDisplay':False,'collectionMode':'metadata-index-only'})
 by_year=Counter()
 for r in records:
  m=re.search(r'(19|20)\d{2}',r['tournament'])
  if m: by_year[m.group(0)]+=1
 payload={'generatedAt':date.today().isoformat(),'sourceRegistryId':SOURCE_ID,'publicQuestionDisplay':False,'tournamentCount':len(records),'roundResourceCount':sum(len(r['rounds']) for r in records),'years':dict(sorted(by_year.items())),'records':records}
 OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 print(f"HMMT_ARCHIVE_INDEX_OK tournaments={len(records)} rounds={payload['roundResourceCount']} years={len(by_year)}")

if __name__=='__main__': main()
