#!/usr/bin/env python3
"""Build/apply checksum-verified additive SEAMO audio bundles, never delete legacy tracks.

`build` on Z890 after generating the full corpus; `apply` on an authorized server
only after inspecting a complete signed/hashed package. Dry-run is default.
"""
import argparse
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'reports/seamo-readaloud-worklist.json'
LOCAL_ASSETS=ROOT/'public/exam-read-aloud/v1'
DEST=Path('/opt/socthink-math/public/exam-read-aloud/v1')
SAFE_NAME=re.compile(r'^(zh|en)-[a-f0-9]{64}\.mp3$')

def sha(data):return hashlib.sha256(data).hexdigest()
def duration(p):
    try:
        x=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],capture_output=True,check=True,text=True,timeout=12)
        return float(x.stdout.strip())
    except (subprocess.CalledProcessError,subprocess.TimeoutExpired,ValueError):return 0

def checks(tracks):
    if len(tracks)!=80 or len(set(x['name'] for x in tracks))!=80:raise ValueError('expected 80 unique MP3 tracks')
    if sum(x['language']=='zh' for x in tracks)!=40 or sum(x['language']=='en' for x in tracks)!=40:raise ValueError('expected 40 zh and 40 en')
    for t in tracks:
        if not SAFE_NAME.fullmatch(t['name']) or not re.fullmatch('[a-f0-9]{64}',t['sha256']):raise ValueError('bad track name or checksum')
        if t['language'] not in ('zh','en') or not t['name'].startswith(t['language']+'-'):raise ValueError('language mismatch')
        if not (1000<t['size']<8_000_000) or not (0.8<t['duration']<180):raise ValueError('invalid track size/duration')

def build(output,worklist=WORK,assets=LOCAL_ASSETS):
    data=json.loads(worklist.read_text());tasks=data['tasks']
    if len(tasks)!=80:raise ValueError('worklist must have exactly 80 entries')
    tracks=[]
    for task in tasks:
        name=Path(task['file']).name
        if task['url'] != '/exam-read-aloud/v1/'+name or not SAFE_NAME.fullmatch(name):raise ValueError('unexpected URL')
        src=assets/name
        if not src.is_file() or src.is_symlink():raise ValueError('missing/nonregular MP3: '+name)
        raw=src.read_bytes();d=duration(src)
        tracks.append({'name':name,'language':task['language'],'questionId':task['questionId'],'size':len(raw),'sha256':sha(raw),'duration':round(d,2)})
    checks(tracks)
    manifest={'version':1,'scope':'seamo-revised-g1g2-independent-foundational','trackCount':80,'tracks':tracks}
    output.parent.mkdir(parents=True,exist_ok=True)
    with tarfile.open(output,'w:gz') as tar:
        content=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
        entry=tarfile.TarInfo('manifest.json');entry.mode=0o644;entry.size=len(content);tar.addfile(entry,io.BytesIO(content))
        for t in tracks:
            src=assets/t['name'];entry=tarfile.TarInfo('v1/'+t['name']);entry.mode=0o644;entry.size=src.stat().st_size
            with src.open('rb') as inp:tar.addfile(entry,inp)
    print('SEAMO_AUDIO_BUNDLE=PASS tracks=80 bytes='+str(output.stat().st_size)+' sha256='+sha(output.read_bytes()))

def unpack(archive,dest):
    with tarfile.open(archive,'r:gz') as tar:
        members={m.name:m for m in tar.getmembers()}
        if 'manifest.json' not in members or not members['manifest.json'].isfile():raise ValueError('missing manifest')
        manifest=json.loads(tar.extractfile(members['manifest.json']).read())
        tracks=manifest['tracks'];checks(tracks)
        expected={'manifest.json'}|{'v1/'+t['name'] for t in tracks}
        if set(members)!=expected or any(not m.isfile() for m in members.values()):raise ValueError('unexpected archive members')
        for t in tracks:
            stream=tar.extractfile(members['v1/'+t['name']]);payload=stream.read()
            if len(payload)!=t['size'] or sha(payload)!=t['sha256']:raise ValueError('corrupted track '+t['name'])
            (dest/t['name']).write_bytes(payload)
            if duration(dest/t['name'])<=.8:raise ValueError('unplayable track '+t['name'])
    return tracks

def apply(archive,destination=DEST,dry_run=True):
    # Destination cannot be a symlink to a path controlled outside the production asset tree.
    if destination.exists() and destination.is_symlink():raise ValueError('asset destination symlink refused')
    if not destination.exists():
        if dry_run:raise ValueError('destination does not exist for dry-run')
        destination.mkdir(parents=True,mode=0o755)
    if not destination.is_dir():raise ValueError('invalid destination')
    with tempfile.TemporaryDirectory(prefix='seamo-audio-safe-') as tmp:
        staged=Path(tmp)
        tracks=unpack(archive,staged)
        before={p.name:sha(p.read_bytes()) for p in destination.glob('*.mp3') if p.is_file() and not p.is_symlink()}
        collisions=[t['name'] for t in tracks if t['name'] in before and before[t['name']]!=t['sha256']]
        if collisions:raise ValueError('hash collision with existing audio, refused: '+','.join(collisions[:3]))
        to_add=[t for t in tracks if t['name'] not in before]
        print('SEAMO_AUDIO_PREFLIGHT=PASS legacy='+str(len(before))+' add='+str(len(to_add))+' reused='+str(80-len(to_add)))
        if dry_run:
            print('SEAMO_AUDIO_ADD=DRY_RUN; no file changed')
            return
        for t in to_add:
            f=destination/t['name']
            # Each file is atomically installed; existing files are never replaced.
            fd,filename=tempfile.mkstemp(prefix='.seamo-audio-',dir=destination)
            os.close(fd)
            pending=Path(filename)
            try:
                shutil.copyfile(staged/t['name'],pending);os.chmod(pending,0o644)
                # Atomic no-clobber creation: hardlink refuses an existing destination.
                os.link(pending,f)
            finally:pending.unlink(missing_ok=True)
        for name,checksum in before.items():
            if sha((destination/name).read_bytes())!=checksum:raise RuntimeError('legacy audio changed: '+name)
        for t in tracks:
            f=destination/t['name']
            if not f.is_file() or sha(f.read_bytes())!=t['sha256']:raise RuntimeError('published audio corrupted: '+t['name'])
        print('SEAMO_AUDIO_ADD=PASS legacy_preserved='+str(len(before))+' tracks=80 added='+str(len(to_add)))

def main():
    p=argparse.ArgumentParser();subs=p.add_subparsers(dest='command',required=True)
    b=subs.add_parser('build');b.add_argument('--output',type=Path,default=ROOT/'reports/seamo-audio-additive.tar.gz');b.add_argument('--worklist',type=Path,default=WORK);b.add_argument('--assets',type=Path,default=LOCAL_ASSETS)
    a=subs.add_parser('apply');a.add_argument('--archive',type=Path,required=True);a.add_argument('--destination',type=Path,default=DEST);a.add_argument('--commit',action='store_true',help='explicitly make additive file changes, default is dry-run')
    args=p.parse_args()
    if args.command=='build':build(args.output,args.worklist,args.assets)
    else:apply(args.archive,args.destination,not args.commit)
if __name__=='__main__':main()
