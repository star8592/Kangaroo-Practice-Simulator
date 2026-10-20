#!/usr/bin/env python3
"""SEAMO originals must work in clean CI checkouts without private/exams."""
import os
import subprocess
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RUNNER=ROOT/'node_modules'/'.bin'/'tsx'
TEST=ROOT/'scripts'/'test_seamo_integration.ts'
with tempfile.TemporaryDirectory(prefix='seamo-no-private-') as temp:
    env={**os.environ,'TSX_TSCONFIG_PATH':str(ROOT/'tsconfig.json')}
    result=subprocess.run([str(RUNNER),str(TEST)],cwd=temp,env=env,text=True,
                          capture_output=True,timeout=60)
    if result.returncode:
        raise SystemExit('SEAMO_NO_PRIVATE=FAIL\n'+result.stdout+'\n'+result.stderr)
    assert 'SEAMO_INTEGRATION=PASS' in result.stdout
print('SEAMO_NO_PRIVATE=PASS originals_available_without_private_archive')
