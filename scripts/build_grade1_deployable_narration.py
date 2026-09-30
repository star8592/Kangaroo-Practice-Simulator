#!/usr/bin/env python3
import argparse, asyncio, hashlib, json, os, subprocess, tempfile
from pathlib import Path
import edge_tts

ROOT=Path(__file__).resolve().parents[1]
BUNDLE=ROOT/'data'/'verified-solutions'/'grade1-v1.json'
BASE=ROOT/'public'/'grade1-narration'/'v1'
VOICE='zh-CN-XiaoxiaoNeural'
RATE='-6%'
PROXY_DEFAULT=os.environ.get('MATH_TTS_PROXY','http://127.0.0.1:20171')


def sha256(p:Path):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1<<20),b''): h.update(chunk)
    return h.hexdigest()


def duration_ms(p:Path):
    out=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True).strip()
    return round(float(out)*1000)


def media_ok(p:Path):
    if not p.exists() or p.stat().st_size<8000: return False
    try: return duration_ms(p)>500
    except Exception: return False

async def render_one(item, sem, proxy, force=False):
    qid, idx, text, out=item
    if media_ok(out) and not force: return 'skip',qid,idx
    out.parent.mkdir(parents=True,exist_ok=True)
    async with sem:
        last=None
        for attempt in range(1,5):
            raw=Path(str(out)+'.raw.mp3')
            try:
                raw.unlink(missing_ok=True)
                comm=edge_tts.Communicate(text,VOICE,rate=RATE,proxy=proxy,connect_timeout=15,receive_timeout=90)
                await comm.save(str(raw))
                subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(raw),'-ar','22050','-ac','1','-b:a','64k',str(out)],check=True)
                raw.unlink(missing_ok=True)
                if not media_ok(out): raise RuntimeError('output media invalid')
                return 'render',qid,idx
            except Exception as e:
                last=e
                raw.unlink(missing_ok=True)
                out.unlink(missing_ok=True)
                await asyncio.sleep(min(8,attempt*2))
        raise RuntimeError(f'{qid} scene-{idx:02d}: {last}')

async def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--proxy',default=PROXY_DEFAULT)
    ap.add_argument('--concurrency',type=int,default=4)
    ap.add_argument('--force',action='store_true')
    ap.add_argument('--limit',type=int,default=0)
    args=ap.parse_args()
    bundle=json.loads(BUNDLE.read_text())
    solutions=bundle.get('solutions') or {}
    tasks=[]
    for qid in sorted(solutions):
        for idx,scene in enumerate(solutions[qid].get('scenes') or [],1):
            text=str(scene.get('narration') or '').strip()
            if not text: raise SystemExit(f'{qid} scene-{idx:02d}: blank narration')
            out=BASE/qid/f'scene-{idx:02d}.mp3'
            if args.force or not media_ok(out): tasks.append((qid,idx,text,out))
    if args.limit>0: tasks=tasks[:args.limit]
    print(f'GRADE1_NARRATION_BUILD targets={len(tasks)} questions={len(solutions)} concurrency={args.concurrency} voice={VOICE}')
    sem=asyncio.Semaphore(max(1,args.concurrency))
    done=0; rendered=0; skipped=0
    for coro in asyncio.as_completed([render_one(x,sem,args.proxy,args.force) for x in tasks]):
        status,qid,idx=await coro; done+=1
        rendered+=status=='render'; skipped+=status=='skip'
        if done<=10 or done%25==0 or done==len(tasks): print(f'PROGRESS {done}/{len(tasks)} rendered={rendered} skipped={skipped} last={qid}/scene-{idx:02d}',flush=True)

    entries=[]
    for qid in sorted(solutions):
        scenes=solutions[qid].get('scenes') or []
        for idx,_scene in enumerate(scenes,1):
            p=BASE/qid/f'scene-{idx:02d}.mp3'
            if not media_ok(p): raise SystemExit(f'missing/invalid narration {qid} scene-{idx:02d}')
            entries.append({'questionId':qid,'scene':f'scene-{idx:02d}','url':f'/grade1-narration/v1/{qid}/scene-{idx:02d}.mp3','durationMs':duration_ms(p),'mp3Sha256':sha256(p),'bytes':p.stat().st_size})
    manifest={'version':1,'codec':'mp3','sampleRate':22050,'channels':1,'bitrateKbps':64,'questionCount':len(solutions),'sceneCount':len(entries),'entries':entries}
    (BASE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'GRADE1_NARRATION_BUILD=PASS questions={len(solutions)} scenes={len(entries)} bytes={sum(x["bytes"] for x in entries)}')

if __name__=='__main__': asyncio.run(main())
