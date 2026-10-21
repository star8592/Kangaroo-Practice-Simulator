#!/usr/bin/env python3
"""Mutation tests for additive SEAMO audio publication with existing legacy tracks."""
import hashlib
import json
import tempfile
from pathlib import Path
from seamo_audio_additive_release import apply,sha,validate_received_audio

ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/'reports/seamo-audio-additive.tar.gz'
WORK=ROOT/'reports/seamo-readaloud-worklist.json'
if not ARCHIVE.exists() or not WORK.exists():
    raise SystemExit('Generate and validate the 80-track bundle before this test')
with tempfile.TemporaryDirectory(prefix='seamo-additive-contract-') as temp:
    dest=Path(temp)/'v1';dest.mkdir()
    existing=dest/'legacy-unrelated.mp3'
    source=Path(json.loads(WORK.read_text())['tasks'][0]['file'])
    existing.write_bytes(source.read_bytes())
    baseline=sha(existing.read_bytes())
    apply(ARCHIVE,dest,dry_run=True)
    assert len(list(dest.iterdir()))==1,'dry-run must never write files'
    apply(ARCHIVE,dest,dry_run=False)
    assert len(list(dest.glob('*.mp3')))==81,'additive publish must preserve one legacy plus 80 new tracks'
    assert sha(existing.read_bytes())==baseline,'legacy track must remain byte-identical'
    apply(ARCHIVE,dest,dry_run=False)
    assert len(list(dest.glob('*.mp3')))==81,'idempotent republish'
    track=dest/source.name
    track.write_bytes(b'CONFLICT that must never be silently replaced')
    try:apply(ARCHIVE,dest,dry_run=False)
    except ValueError as e:assert 'collision' in str(e)
    else:raise AssertionError('modified existing MP3 must block publication')
    assert track.read_bytes().startswith(b'CONFLICT'),'colliding MP3 must not be overwritten'
    assert sha(existing.read_bytes())==baseline,'legacy track still untouched after rejection'
from unittest.mock import patch
with tempfile.TemporaryDirectory() as temp:
    candidate=Path(temp)/'valid.mp3'
    candidate.write_bytes(source.read_bytes())
    with patch('seamo_audio_additive_release.shutil.which',return_value=None):
        validate_received_audio(candidate,5.0)
        candidate.write_bytes(b'not an MP3')
        try:validate_received_audio(candidate,5.0)
        except ValueError as e:assert 'header' in str(e)
        else:raise AssertionError('non-MP3 file must fail even without ffprobe')
print('SEAMO_NO_FFPROBE_FALLBACK=PASS content_hash_already_verified=true invalid_header=rejected')
print('SEAMO_ADDITIVE_PUBLISH=PASS dryrun=true legacy=preserved 80_tracks=verified idempotent=true collision=refused')
