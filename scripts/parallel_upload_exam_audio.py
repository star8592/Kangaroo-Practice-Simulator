#!/usr/bin/env python3
"""Resumable, parallel SSH/rsync transfer for a verified audio archive.

The receiver reconstructs the chunks and verifies the whole archive SHA-256
before any production resource is promoted. No user data is uploaded.
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
import os
import shlex
import subprocess
import tempfile
import time
from pathlib import Path

def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as source:
        for buf in iter(lambda: source.read(1024 * 1024), b""):
            h.update(buf)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--archive", required=True)
    ap.add_argument("--remote-host", required=True)
    ap.add_argument("--remote-directory", required=True)
    ap.add_argument("--ssh-config", default="/dev/null")
    ap.add_argument("--workers", type=int, default=20)
    ap.add_argument("--chunk-mb", type=int, default=2)
    args=ap.parse_args()
    archive=Path(args.archive)
    if not archive.is_file():
        raise SystemExit("missing audio archive")
    workers=max(1,min(args.workers,32))
    chunk_size=max(1,min(args.chunk_mb,32))*1024*1024
    archive_sha=sha(archive)
    count=math.ceil(archive.stat().st_size/chunk_size)
    remote=args.remote_directory.rstrip("/")
    if not remote.startswith("/tmp/socthink-exam-voice-"):
        raise SystemExit("remote directory outside temporary audio staging")
    ssh=["ssh","-F",args.ssh_config,"-o","BatchMode=yes","-o","ConnectTimeout=12"]
    ready=subprocess.run(ssh+[args.remote_host,"mkdir -p "+shlex.quote(remote+"/parts")],
                         text=True,capture_output=True,timeout=25)
    if ready.returncode:
        raise SystemExit("remote staging unavailable: "+ready.stderr[-300:])
    begin=time.monotonic()
    failed=[]
    with tempfile.TemporaryDirectory(prefix="kps-audio-chunks-") as temp:
        files=[]
        with archive.open("rb") as source:
            for index in range(count):
                block=source.read(chunk_size)
                if not block:
                    raise SystemExit("early EOF")
                part=Path(temp)/(f"{index:04d}.part")
                part.write_bytes(block)
                files.append(part)
        def upload(part):
            remote_path=args.remote_host+":"+remote+"/parts/"+part.name
            command=["rsync","-a","--partial","--append-verify",
                     "--no-perms","-e"," ".join(shlex.quote(x) for x in ssh),
                     str(part), remote_path]
            error=""
            for attempt in range(3):
                try:
                    run=subprocess.run(command,text=True,capture_output=True,timeout=180)
                    if run.returncode==0:
                        return (part.name,True,"")
                    error=run.stderr[-450:]
                except subprocess.TimeoutExpired:
                    error="transfer timeout"
                time.sleep(attempt+1)
            return (part.name,False,error)
        print(f"AUDIO_PARALLEL_START chunks={len(files)} workers={workers} bytes={archive.stat().st_size} sha256={archive_sha}",flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
            futures=[pool.submit(upload,p) for p in files]
            for number,future in enumerate(concurrent.futures.as_completed(futures),1):
                name,ok,error=future.result()
                if not ok:
                    failed.append((name,error))
                if number==1 or number%8==0 or number==len(futures):
                    print(f"AUDIO_PARALLEL_PROGRESS {number}/{len(futures)} failures={len(failed)} elapsed={round(time.monotonic()-begin,1)}s",flush=True)
    if failed:
        raise SystemExit("AUDIO_PARALLEL_FAILED "+json.dumps(failed))
    print("AUDIO_PARALLEL_TRANSFER=PASS "+json.dumps({"chunks":count,"sha256":archive_sha,"seconds":round(time.monotonic()-begin,1)}),flush=True)

if __name__=="__main__":
    main()
