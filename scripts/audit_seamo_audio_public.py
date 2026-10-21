#!/usr/bin/env python3
"""Verify every SEAMO bilingual MP3 is byte-identical over the live public HTTPS route."""
import argparse
import concurrent.futures
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='https://socthink.cn')
    parser.add_argument('--worklist',type=Path,default=ROOT/'reports/seamo-readaloud-worklist.json')
    parser.add_argument('--workers',type=int,default=8)
    args=parser.parse_args()
    if not args.base.startswith('https://'):raise SystemExit('Only HTTPS verification is supported')
    tasks=json.loads(args.worklist.read_text())['tasks']
    if len(tasks)!=80:raise SystemExit('Expected all 80 tracks')
    def verify(task):
        expected=Path(task['file']).read_bytes()
        url=args.base.rstrip('/')+task['url']
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'SEAMO-Audio-Release-Acceptance/1.0'}),timeout=25) as r:
            actual=r.read(len(expected)+1024)
            if r.status!=200 or r.headers.get('content-type','').split(';')[0].strip() not in ('audio/mpeg','audio/mp3'):
                raise ValueError('bad response for '+task['url'])
        if len(actual)!=len(expected) or sha(actual)!=sha(expected):raise ValueError('checksum mismatch '+task['url'])
        return task['language']
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(12,args.workers))) as pool:
        results=list(pool.map(verify,tasks))
    zh=results.count('zh');en=results.count('en')
    if zh!=40 or en!=40:raise SystemExit('Bilingual HTTP coverage mismatch')
    print(f'SEAMO_PUBLIC_AUDIO=PASS total=80 zh={zh} en={en} checksum=80/80 mime=audio/mpeg')
if __name__=='__main__':main()
