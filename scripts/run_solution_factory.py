#!/usr/bin/env python3
import argparse, os, subprocess, time, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TTS_PY=Path("/mnt/disk1/H3_Studio/envs/indextts/bin/python")

ap=argparse.ArgumentParser(description="Local-only solution materialization factory. Never performs mathematical reasoning.")
ap.add_argument("--limit",type=int,default=3)
ap.add_argument("--video",action="store_true")
ap.add_argument("--dry-run",action="store_true")
ap.add_argument("--publish",action="store_true",help="restart production service so newly generated public media becomes visible")
ap.add_argument("--base-url",default="http://127.0.0.1:3027")
args=ap.parse_args()

def run(cmd,env=None):
    print("+"," ".join(map(str,cmd)),flush=True)
    subprocess.run(list(map(str,cmd)),cwd=ROOT,check=True,env=env)

def publish():
    uid=os.getuid()
    env=os.environ.copy()
    env.setdefault("XDG_RUNTIME_DIR",f"/run/user/{uid}")
    env.setdefault("DBUS_SESSION_BUS_ADDRESS",f"unix:path=/run/user/{uid}/bus")
    run(["systemctl","--user","restart","math-competition-lab.service"],env=env)
    last=None
    for _ in range(20):
        try:
            with urllib.request.urlopen(args.base_url+"/login",timeout=3) as r:
                if 200 <= r.status < 500:
                    print("PUBLISH_HEALTH=PASS",r.status,args.base_url,flush=True)
                    return
        except Exception as e:
            last=e
        time.sleep(0.5)
    raise RuntimeError(f"production service health check failed: {last}")

run(["python3","scripts/audit_solution_pipeline.py","--write","--show","0"])
run(["python3","scripts/validate_solution_standard_v2.py","--write","--show","0","--enforce-tagged"])
run(["python3","scripts/build_solution_materialization_queue.py"])
cmd=[TTS_PY,"scripts/materialize_verified_solutions.py","--queue","--limit",str(max(1,args.limit))]
if args.video: cmd.append("--video")
if args.dry_run: cmd.append("--dry-run")
run(cmd)
if not args.dry_run:
    run(["python3","scripts/audit_solution_pipeline.py","--write","--show","0"])
    run(["python3","scripts/validate_solution_standard_v2.py","--write","--show","0","--enforce-tagged"])
    run(["python3","scripts/build_solution_materialization_queue.py"])
    if args.publish:
        publish()
print("SOLUTION_FACTORY=PASS",flush=True)
