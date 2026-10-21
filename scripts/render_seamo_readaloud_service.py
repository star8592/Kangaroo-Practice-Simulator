#!/usr/bin/env python3
"""Render SEAMO bilingual read-aloud audio via an existing local IndexTTS2.5 service.

Does not initialize another model, kill other GPU jobs, or publish assets.
An on-disk resume cache avoids repeated synthesis. Asset promotion requires its own review.
"""
import argparse
import json
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEST=(ROOT/'public/exam-read-aloud/v1').resolve()
WORK=ROOT/'reports/seamo-readaloud-worklist.json'
REPORT=ROOT/'reports/seamo-index-tts-report.json'
SERVICE='http://127.0.0.1:39010/synthesize'
VOICE='/mnt/disk1/H3_Studio/IndexTTS2/examples/voice_09.wav'

def duration(p):
    try:
        result=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],capture_output=True,text=True,timeout=15,check=True)
        return float(result.stdout.strip())
    except (subprocess.SubprocessError,ValueError):return 0.0

def valid(p):return p.is_file() and p.stat().st_size>1024 and duration(p)>.8

def one(item):
    target=Path(item['file']).resolve()
    if target.parent!=DEST or target.suffix!='.mp3' or item['url']!='/exam-read-aloud/v1/'+target.name:
        raise ValueError('unsafe audio filename or URL')
    if valid(target):return {'status':'cached','file':target.name,'duration':round(duration(target),2)}
    wav=target.with_suffix('.partial.wav')
    mp3=target.with_suffix('.partial.mp3')
    for p in (wav,mp3):p.unlink(missing_ok=True)
    try:
        body=json.dumps({'text':item['text'],'spk_audio_prompt':VOICE,'output_path':str(wav),'language':'ZH' if item['language']=='zh' else 'EN','length_scale':1.05,'use_random':False,'interval_silence':230}).encode('utf-8')
        req=urllib.request.Request(SERVICE,data=body,headers={'Content-Type':'application/json'},method='POST')
        start=time.monotonic()
        with urllib.request.urlopen(req,timeout=240) as reply:
            if reply.status!=200:raise RuntimeError(f'service status {reply.status}')
            response=json.loads(reply.read(2_000_000))
        if not valid(wav):raise RuntimeError('IndexTTS did not produce playable WAV: '+str(response)[:240])
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-ar','22050','-ac','1','-b:a','64k',str(mp3)],check=True,timeout=120)
        if not valid(mp3):raise RuntimeError('converted MP3 invalid')
        mp3.replace(target)
        return {'status':'rendered','file':target.name,'duration':round(duration(target),2),'seconds':round(time.monotonic()-start,2)}
    finally:
        for p in (wav,mp3):p.unlink(missing_ok=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--limit',type=int,default=0);p.add_argument('--report',type=Path,default=REPORT);args=p.parse_args()
    if not WORK.is_file():raise SystemExit('Run npx tsx scripts/prepare_seamo_readaloud.ts first')
    all_tasks=json.loads(WORK.read_text())['tasks']
    if len(all_tasks)!=80:raise SystemExit('Expected exactly 80 bilingual tracks')
    if len({t['url'] for t in all_tasks})!=80:raise SystemExit('Duplicate audio URLs')
    DEST.mkdir(parents=True,exist_ok=True)
    if DEST.is_symlink():raise SystemExit('Refusing symlinked asset root')
    remaining=all_tasks[:args.limit or None]
    outcome=[]
    for index,item in enumerate(remaining,1):
        try:result=one(item)
        except Exception as e:result={'status':'failed','file':Path(item['file']).name,'error':str(e)[:500]}
        outcome.append(result)
        print('SEAMO_INDEX_TTS',index,'/',len(remaining),item['language'],result['status'],result.get('duration',''),flush=True)
        if result['status']=='failed':print('SEAMO_INDEX_TTS_ERROR',result['error'],flush=True)
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps({'generated':sum(x['status']=='rendered' for x in outcome),'cached':sum(x['status']=='cached' for x in outcome),'failed':sum(x['status']=='failed' for x in outcome),'processed':len(outcome),'expected':len(all_tasks),'results':outcome},ensure_ascii=False,indent=2))
    if any(x['status']=='failed' for x in outcome):raise SystemExit(1)

if __name__=='__main__':main()
