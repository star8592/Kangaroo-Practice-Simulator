#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORTER = ROOT / 'competition-agent' / 'importer' / 'import_pipeline.py'

with tempfile.TemporaryDirectory() as tmp:
    base = Path(tmp)
    source = base / 'sources'
    output = base / 'output'
    source.mkdir()
    (source / 'kangaroo-2025-g2.pdf').write_bytes(b'%PDF-1.4\n')

    subprocess.run([sys.executable, str(IMPORTER), str(source), str(output)], check=True)
    metadata = json.loads((output / 'metadata.json').read_text(encoding='utf-8'))
    questions = json.loads((output / 'questions.en.json').read_text(encoding='utf-8'))
    queue = json.loads((output / 'translation_queue.json').read_text(encoding='utf-8'))

    assert len(metadata) == len(questions) == len(queue) == 1
    assert metadata[0]['competition'] == 'Kangaroo'
    assert metadata[0]['year'] == 2025
    assert metadata[0]['grade'] == 'G2'
    assert questions[0]['source'].endswith('kangaroo-2025-g2.pdf')
    assert queue[0]['source'].endswith('kangaroo-2025-g2.pdf')

print('IMPORT_PIPELINE=PASS')
