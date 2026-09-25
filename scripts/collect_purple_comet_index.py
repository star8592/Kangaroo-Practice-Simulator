#!/usr/bin/env python3
from __future__ import annotations

import argparse, json, os, re
from datetime import date
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from competition_rights import publication_policy

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'private'/'source-registry'/'purple_comet_archive_index.json'
BASE='https://www.purplecomet.org'
INDEX=f'{BASE}/answers'
SOURCE_ID='purple-comet-official'


def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--proxy',default=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')); a=ap.parse_args()
 policy=publication_policy(SOURCE_ID)
 if policy['publicQuestionDisplay']:
  raise SystemExit('Purple Comet index must remain non-public under current copyright registry')
 s=requests.Session(); s.headers['User-Agent']='MathCompetitionLab metadata indexer/1.0'
 if a.proxy: s.proxies.update({'http':a.proxy,'https':a.proxy})
 r=s.get(INDEX,timeout=60); r.raise_for_status(); soup=BeautifulSoup(r.text,'html.parser')
 records=[]
 for tr in soup.find_all('tr'):
  cells=tr.find_all('td')
  if len(cells)<3: continue
  mt=re.search(r'(20\d{2})',cells[0].get_text(' ',strip=True))
  if not mt: continue
  year=int(mt.group(1)); levels=[('high',cells[1]),('middle',cells[2])]
  for level,cell in levels:
   resources=[]
   for lk in cell.find_all('a',href=True):
    label=lk.get_text(' ',strip=True) or 'resource'; resources.append({'label':label,'url':urljoin(BASE,lk['href'])})
   if resources:
    records.append({'year':year,'level':level,'resources':resources,'sourceRegistryId':SOURCE_ID,'rightsClass':policy['rightsClass'],'publicQuestionDisplay':False,'collectionMode':'metadata-index-only'})
 records.sort(key=lambda x:(x['year'],x['level']))
 payload={'generatedAt':date.today().isoformat(),'sourceRegistryId':SOURCE_ID,'publicQuestionDisplay':False,'paperCount':len(records),'yearRange':[min(x['year'] for x in records),max(x['year'] for x in records)] if records else None,'records':records}
 OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 print(f"PURPLE_COMET_INDEX_OK papers={len(records)} years={payload['yearRange']}")

if __name__=='__main__': main()
