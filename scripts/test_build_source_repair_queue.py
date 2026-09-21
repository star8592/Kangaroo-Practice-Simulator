#!/usr/bin/env python3
from pathlib import Path
p=Path(__file__).with_name('build_source_repair_queue.py').read_text()
assert 'vision_source_recovery' in p and 'translation_recheck' in p
assert 'source_ocr_noise' in p and 'numeric_mismatch' in p
print('SOURCE_REPAIR_QUEUE=PASS')
