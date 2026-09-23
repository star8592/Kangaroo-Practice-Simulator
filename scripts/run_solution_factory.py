#!/usr/bin/env python3
import argparse, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TTS_PY=Path("/mnt/disk1/H3_Studio/envs/indextts/bin/python")

ap=argparse.ArgumentParser(description="Local-only solution materialization factory. Never performs mathematical reasoning.")
ap.add_argument("--limit",type=int,default=3)
ap.add_argument("--video",action="store_true")
ap.add_argument("--dry-run",action="store_true")
args=ap.parse_args()

def run(cmd):
    print("+"," ".join(map(str,cmd)),flush=True)
    subprocess.run(list(map(str,cmd)),cwd=ROOT,check=True)

run(["python3","scripts/audit_solution_pipeline.py","--write","--show","0"])
run(["python3","scripts/build_solution_materialization_queue.py"])
cmd=[TTS_PY,"scripts/materialize_verified_solutions.py","--queue","--limit",str(max(1,args.limit))]
if args.video: cmd.append("--video")
if args.dry_run: cmd.append("--dry-run")
run(cmd)
if not args.dry_run:
    run(["python3","scripts/audit_solution_pipeline.py","--write","--show","0"])
    run(["python3","scripts/build_solution_materialization_queue.py"])
print("SOLUTION_FACTORY=PASS",flush=True)
