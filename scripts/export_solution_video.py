#!/usr/bin/env python3
import argparse, json, shutil, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OM=Path("/mnt/disk1/Code/OpenMontage/remotion-composer")
PUBLIC=ROOT/"public"

def copy_asset(url, asset_dir, name):
    if not url: return ""
    if url.startswith("http://") or url.startswith("https://") or url.startswith("data:"): return url
    src = PUBLIC / url.lstrip("/")
    if not src.exists(): return ""
    suffix = src.suffix or ".bin"
    dst = asset_dir / f"{name}{suffix}"
    shutil.copy2(src, dst)
    return f"math-solution-assets/{asset_dir.name}/{dst.name}"

ap=argparse.ArgumentParser()
ap.add_argument("question_id")
ap.add_argument("--vertical",action="store_true")
ap.add_argument("--skip-tts",action="store_true")
args=ap.parse_args()

src=ROOT/"private/solutions"/f"{args.question_id}.json"
if not src.exists(): raise SystemExit("verified solution not found")
data=json.loads(src.read_text())
if data.get("quality")!="verified": raise SystemExit("refuse non-verified solution")
asset_dir=OM/"public/math-solution-assets"/args.question_id
asset_dir.mkdir(parents=True,exist_ok=True)

if not args.skip_tts and any(not s.get("audioUrl") for s in data.get("scenes",[])):
    py=Path("/mnt/disk1/H3_Studio/envs/indextts/bin/python")
    subprocess.run([str(py),str(ROOT/"scripts/render_solution_tts.py"),args.question_id],check=True)
    data=json.loads(src.read_text())

scenes=[]
for s in data["scenes"]:
    v=s.get("visual") or {}
    source=""
    if v.get("type")=="source-image": source=copy_asset(v.get("url"),asset_dir,f"scene-{len(scenes)+1:02d}-source")
    scenes.append({
        "id":s["id"],"title":s["title"],"narration":s["narration"],
        "caption":s.get("caption",""),"checkpoint":s.get("checkpoint",""),
        "durationMs":s.get("durationMs",6000),
        "audioSrc":copy_asset(s.get("audioUrl",""),asset_dir,f"scene-{len(scenes)+1:02d}-audio"),
        "sourceImage":source,
        "renderSpec":s.get("renderSpec",{}),
    })

props={"questionId":args.question_id,"problemTitle":args.question_id,"scenes":scenes}
props_dir=OM/"public/math-solution-props"; props_dir.mkdir(parents=True,exist_ok=True)
props_path=props_dir/f"{args.question_id}.json"
props_path.write_text(json.dumps(props,ensure_ascii=False,indent=2))

dest=PUBLIC/"generated-solutions"/args.question_id/f"{args.question_id}.mp4"
dest.parent.mkdir(parents=True,exist_ok=True)
npx=shutil.which("npx")
if not npx: raise SystemExit("npx not found")
cmd=[npx,"remotion","render","src/index.tsx","MathSolution",str(dest),"--props",str(props_path),"--codec","h264"]
subprocess.run(cmd,cwd=OM,check=True)
if not dest.exists() or dest.stat().st_size<10000: raise RuntimeError("video render failed")
print(json.dumps({"status":"PASS","questionId":args.question_id,"video":str(dest),"bytes":dest.stat().st_size},ensure_ascii=False))
