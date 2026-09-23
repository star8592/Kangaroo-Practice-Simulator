#!/usr/bin/env python3
import argparse, hashlib, json, os, sys, wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
H3=Path("/mnt/disk1/H3_Studio")
INDEX=H3/"IndexTTS2"
sys.path.insert(0,str(INDEX))
os.environ.setdefault("HF_HOME",str(H3/"runtime/h3studio/hf-cache"))
os.environ.setdefault("XDG_CACHE_HOME",str(H3/"runtime/h3studio/xdg-cache"))
from indextts.infer_v2_5 import IndexTTS2

# IndexTTS emotion order: happy, angry, sad, afraid, disgusted, melancholic,
# surprised, calm. Low-grade math narration should feel calm and encouraging.
WARM_TEACHER_EMO=[0.18, 0.0, 0.0, 0.0, 0.0, 0.0, 0.03, 0.82]
SOLUTION_STANDARD_VERSION=2
VOICE_PROFILE="warm-teacher-v1"
PLAYBACK_PROFILE="continuous-auto-v1"

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

def wav_ms(p):
    with wave.open(str(p),"rb") as w:
        return round(w.getnframes()/w.getframerate()*1000)

ap=argparse.ArgumentParser()
ap.add_argument("question_id")
ap.add_argument("--voice",default=str(INDEX/"examples/voice_09.wav"))
ap.add_argument("--force",action="store_true")
args=ap.parse_args()

solution_path=ROOT/"private/solutions"/f"{args.question_id}.json"
if not solution_path.exists(): raise SystemExit("verified solution not found")
data=json.loads(solution_path.read_text())
if data.get("quality")!="verified": raise SystemExit("refuse non-verified solution")
verification=data.get("verification") or {}
scenes=data.get("scenes") or []
if not (verification.get("officialAnswerMatched") is True and verification.get("solverAgreement") is True
        and isinstance(verification.get("confidence"),(int,float)) and verification.get("confidence",0)>=0.65):
    raise SystemExit("refuse solution below verified-math gate")
if not (2<=len(scenes)<=12 and all(str(s.get("narration") or "").strip() for s in scenes)
        and all(scene_directable(s) for s in scenes)):
    raise SystemExit("refuse solution below V2 director gate")

out_dir=ROOT/"public/generated-solutions"/args.question_id
out_dir.mkdir(parents=True,exist_ok=True)
tts=IndexTTS2(cfg_path=str(INDEX/"checkpoints_25/config.yaml"),model_dir=str(INDEX/"checkpoints_25"),use_bf16=True)

for i,scene in enumerate(data.get("scenes",[]),1):
    out=out_dir/f"scene-{i:02d}.wav"
    if args.force or not out.exists():
        direction=((scene.get("renderSpec") or {}).get("voiceDirection") or "")
        factor=1.0
        if "慢" in direction or "沉稳" in direction: factor=1.12
        if "快" in direction or "兴奋" in direction: factor=0.92
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
    if out.stat().st_size<1000: raise RuntimeError(f"bad tts output: {out}")
    scene["audioUrl"]=f"/generated-solutions/{args.question_id}/{out.name}"
    scene["audioDurationMs"]=wav_ms(out)
    scene["durationMs"]=max(int(scene.get("durationMs") or 0),scene["audioDurationMs"]+650)

data["solutionStandardVersion"]=SOLUTION_STANDARD_VERSION
data["materialization"]={
    **(data.get("materialization") or {}),
    "audioNarrationHash":narration_hash(data),
    "voiceEngine":"IndexTTS2.5",
    "voice":args.voice,
    "audioReady":True,
    "voiceProfile":VOICE_PROFILE,
    "playbackProfile":PLAYBACK_PROFILE,
    "visualReasoningRequired":True,
}
tmp=solution_path.with_suffix(".json.tmp")
tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
tmp.replace(solution_path)
manifest={"questionId":args.question_id,"solutionStandardVersion":SOLUTION_STANDARD_VERSION,"voiceProfile":VOICE_PROFILE,"playbackProfile":PLAYBACK_PROFILE,"voice":args.voice,"scenes":[{"id":s["id"],"audioUrl":s.get("audioUrl"),"audioDurationMs":s.get("audioDurationMs"),"durationMs":s.get("durationMs"),"renderSpec":s.get("renderSpec")} for s in data["scenes"]]}
(out_dir/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({"status":"PASS","questionId":args.question_id,"scenes":len(data["scenes"]),"manifest":str(out_dir/"manifest.json")},ensure_ascii=False))
