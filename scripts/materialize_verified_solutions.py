#!/usr/bin/env python3
import argparse, hashlib, json, os, subprocess, sys, wave, urllib.request, urllib.error
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOL=ROOT/"private/solutions"
PUB=ROOT/"public"
H3=Path("/mnt/disk1/H3_Studio")
INDEX=H3/"IndexTTS2"
VOICE_DEFAULT=INDEX/"examples/voice_09.wav"

TTS_SERVICE_DEFAULT=os.environ.get("MATH_TTS_SERVICE","http://127.0.0.1:39010").rstrip("/")

# IndexTTS emotion order: happy, angry, sad, afraid, disgusted, melancholic,
# surprised, calm. Keep narration warm, steady and non-distracting for children.
WARM_TEACHER_EMO=[0.18,0.0,0.0,0.0,0.0,0.0,0.03,0.82]
SOLUTION_STANDARD_VERSION=2
VOICE_PROFILE="warm-teacher-v1"
PLAYBACK_PROFILE="continuous-auto-v1"

def tts_service_ready(base):
    try:
        with urllib.request.urlopen(base+"/health",timeout=2) as r:
            d=json.loads(r.read().decode())
            return r.status==200 and d.get("model_loaded") is True
    except Exception:
        return False

def tts_service_synthesize(base, *, voice, text, output_path, length_scale):
    payload={
        "text":text,"spk_audio_prompt":str(voice),"output_path":str(output_path),
        "language":"ZH","length_scale":float(length_scale),
        "emo_vector":WARM_TEACHER_EMO,
        "use_random":False,
        "interval_silence":260,
        "max_text_tokens_per_segment":120,"max_mel_tokens":1200,
    }
    req=urllib.request.Request(base+"/synthesize",data=json.dumps(payload,ensure_ascii=False).encode("utf-8"),headers={"content-type":"application/json"},method="POST")
    with urllib.request.urlopen(req,timeout=180) as r:
        body=json.loads(r.read().decode("utf-8"))
        if r.status!=200: raise RuntimeError(f"TTS service HTTP {r.status}")
        return body

def core_hash(data):
    core=[]
    for s in data.get("scenes") or []:
        core.append({
            "id":s.get("id"),"title":s.get("title"),"narration":s.get("narration"),
            "caption":s.get("caption"),"checkpoint":s.get("checkpoint"),
            "visual":s.get("visual"),"renderSpec":s.get("renderSpec"),
        })
    raw=json.dumps(core,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
    return hashlib.sha256(raw).hexdigest()

def narration_hash(data):
    core=[]
    for scene in data.get("scenes") or []:
        core.append({
            "id":scene.get("id"),
            "narration":scene.get("narration"),
            "voiceDirection":((scene.get("renderSpec") or {}).get("voiceDirection") or ""),
        })
    raw=json.dumps(core,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
    return hashlib.sha256(raw).hexdigest()

def scene_directable(scene):
    spec=scene.get("renderSpec") or {}
    visual=scene.get("visual") or {}
    return bool(spec.get("script") or []) or visual.get("type") in {"source-image","number-line","fraction-bar","solid3d"}

def valid_verified(data):
    v=data.get("verification") or {}
    scenes=data.get("scenes") or []
    return (data.get("quality")=="verified" and v.get("officialAnswerMatched") is True and
            v.get("solverAgreement") is True and isinstance(v.get("confidence"),(int,float)) and
            v.get("confidence",0)>=0.65 and 2<=len(scenes)<=12 and
            all(str(s.get("narration") or "").strip() for s in scenes) and
            all(scene_directable(s) for s in scenes))

def wav_ms(p):
    with wave.open(str(p),"rb") as w:
        return round(w.getnframes()/w.getframerate()*1000)

def audio_ok(scene):
    url=scene.get("audioUrl")
    if not url or not url.startswith("/"): return False
    p=PUB/url.lstrip("/")
    return p.exists() and p.stat().st_size>1000

def video_ok(qid):
    p=PUB/"generated-solutions"/qid/f"{qid}.mp4"
    return p.exists() and p.stat().st_size>10000

ap=argparse.ArgumentParser()
ap.add_argument("question_ids",nargs="*")
ap.add_argument("--limit",type=int,default=0)
ap.add_argument("--voice",default=str(VOICE_DEFAULT))
ap.add_argument("--video",action="store_true")
ap.add_argument("--force-audio",action="store_true")
ap.add_argument("--dry-run",action="store_true")
ap.add_argument("--tts-service",default=TTS_SERVICE_DEFAULT)
ap.add_argument("--no-tts-service",action="store_true")
ap.add_argument("--queue",action="store_true",help="use demand-ranked local materialization queue")
args=ap.parse_args()

items=[]
target_order=list(dict.fromkeys(args.question_ids))
if args.queue and not target_order:
    qp=SOL/"_meta/materialization-queue.json"
    if not qp.exists(): raise SystemExit("materialization queue missing; run npm run solution:materialize-queue")
    qd=json.loads(qp.read_text())
    target_order=[r["questionId"] for r in (qd.get("queue") or [])]
if args.limit>0 and target_order:
    target_order=target_order[:args.limit]
wanted=set(target_order)
order={qid:i for i,qid in enumerate(target_order)}

for p in sorted(SOL.glob("*.json")):
    if p.name=="queue.json": continue
    try:d=json.loads(p.read_text())
    except: continue
    qid=d.get("questionId") or p.stem
    if wanted and qid not in wanted: continue
    if not valid_verified(d): continue
    mat=d.get("materialization") or {}
    narration=narration_hash(d)
    director=core_hash(d)
    audio_ready=(all(audio_ok(s) for s in d.get("scenes") or []) and mat.get("audioNarrationHash")==narration)
    video_ready=(video_ok(qid) and mat.get("videoDirectorHash")==director and mat.get("videoAudioHash")==narration)
    fully_ready=(audio_ready and (not args.video or video_ready))
    if not args.force_audio and fully_ready: continue
    items.append((qid,p,d))

if order: items.sort(key=lambda x:order.get(x[0],10**9))
elif args.limit>0: items=items[:args.limit]

if target_order:
    found={q for q,_,_ in items}
    invalid=[q for q in target_order if not (SOL/f"{q}.json").exists()]
    completed=[q for q in target_order if q not in found and q not in invalid]
    if invalid: print("MISSING",",".join(invalid),file=sys.stderr)
    if completed: print("ALREADY_READY",",".join(completed),file=sys.stderr)

print(json.dumps({"targets":[q for q,_,_ in items],"count":len(items),"video":args.video,"dryRun":args.dry_run},ensure_ascii=False))
if args.dry_run or not items: raise SystemExit(0)

need_tts=any(
    args.force_audio
    or (d.get("materialization") or {}).get("audioNarrationHash")!=narration_hash(d)
    or any(not audio_ok(s) for s in d.get("scenes") or [])
    for _,_,d in items
)
tts=None
use_tts_service=False
if need_tts:
    use_tts_service=(not args.no_tts_service and tts_service_ready(args.tts_service))
    if use_tts_service:
        print("INDEXTTS_SERVICE_READY",args.tts_service)
    else:
        sys.path.insert(0,str(INDEX))
        os.environ.setdefault("HF_HOME",str(H3/"runtime/h3studio/hf-cache"))
        os.environ.setdefault("XDG_CACHE_HOME",str(H3/"runtime/h3studio/xdg-cache"))
        from indextts.infer_v2_5 import IndexTTS2
        print("LOADING_INDEXTTS_2_5")
        tts=IndexTTS2(cfg_path=str(INDEX/"checkpoints_25/config.yaml"),model_dir=str(INDEX/"checkpoints_25"),use_bf16=True)
        print("INDEXTTS_READY")

for qid,p,data in items:
    before=core_hash(data)
    narration_before=narration_hash(data)
    mat_before=data.get("materialization") or {}
    regen_audio=(args.force_audio or mat_before.get("audioNarrationHash")!=narration_before)
    out_dir=PUB/"generated-solutions"/qid
    out_dir.mkdir(parents=True,exist_ok=True)
    for i,scene in enumerate(data.get("scenes") or [],1):
        out=out_dir/f"scene-{i:02d}.wav"
        if regen_audio or not audio_ok(scene):
            direction=((scene.get("renderSpec") or {}).get("voiceDirection") or "")
            factor=1.0
            if "慢" in direction or "沉稳" in direction: factor=1.12
            if "快" in direction or "兴奋" in direction: factor=0.92
            if use_tts_service:
                tts_service_synthesize(args.tts_service,voice=args.voice,text=scene["narration"],output_path=out,length_scale=factor)
            else:
                if tts is None: raise RuntimeError("TTS not initialized")
                tts.infer(
                    spk_audio_prompt=args.voice,
                    text=scene["narration"],
                    lang="ZH",
                    output_path=str(out),
                    duration_factor=factor,
                    emo_vector=WARM_TEACHER_EMO,
                    use_random=False,
                    interval_silence=260,
                    verbose=False,
                )
        if not out.exists() or out.stat().st_size<1000:
            raise RuntimeError(f"bad TTS output: {out}")
        scene["audioUrl"]=f"/generated-solutions/{qid}/{out.name}"
        scene["audioDurationMs"]=wav_ms(out)
        scene["durationMs"]=max(int(scene.get("durationMs") or 0),scene["audioDurationMs"]+650)
    after=core_hash(data)
    if before!=after: raise RuntimeError(f"director core mutated during local materialization: {qid}")
    data["solutionStandardVersion"]=SOLUTION_STANDARD_VERSION
    data["materialization"]={
        **(data.get("materialization") or {}),
        "directorHash":before,"audioNarrationHash":narration_before,
        "voiceEngine":"IndexTTS2.5","voice":args.voice,"audioReady":True,
        "voiceProfile":VOICE_PROFILE,
        "playbackProfile":PLAYBACK_PROFILE,
        "visualReasoningRequired":True,
    }
    tmp=p.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
    tmp.replace(p)
    manifest={"questionId":qid,"solutionStandardVersion":SOLUTION_STANDARD_VERSION,
              "voiceProfile":VOICE_PROFILE,"playbackProfile":PLAYBACK_PROFILE,
              "visualReasoningRequired":True,
              "directorHash":before,"audioNarrationHash":narration_before,"scenes":[
        {"id":s["id"],"audioUrl":s.get("audioUrl"),"audioDurationMs":s.get("audioDurationMs"),
         "durationMs":s.get("durationMs"),"renderSpec":s.get("renderSpec")} for s in data["scenes"]
    ]}
    (out_dir/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
    print("VOICE_READY",qid,len(data["scenes"]))

    if args.video:
        subprocess.run([sys.executable,str(ROOT/"scripts/export_solution_video.py"),qid,"--skip-tts"],check=True)
        data=json.loads(p.read_text())
        data["materialization"]={
            **(data.get("materialization") or {}),
            "videoReady":True,
            "videoUrl":f"/generated-solutions/{qid}/{qid}.mp4",
            "videoDirectorHash":core_hash(data),
            "videoAudioHash":narration_hash(data),
        }
        tmp=p.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
        tmp.replace(p)
        print("VIDEO_READY",qid)

print("MATERIALIZE_PASS",len(items))
