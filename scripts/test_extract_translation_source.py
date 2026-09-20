#!/usr/bin/env python3
import importlib.util
from pathlib import Path
p=Path(__file__).with_name('extract_translation_source.py'); s=importlib.util.spec_from_file_location('extract_translation_source',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
text='''Header\n1. Which number is equal to 2 + 3?\n(A) 4 (B) 5 (C) 6\n2. A square has side length 4. What is its perimeter?\n(A) 8 (B) 12 (C) 16\n'''
r=m.segments(text)
assert r[1].startswith('Which number') and '(B) 5' in r[1]
assert r[2].startswith('A square') and '(C) 16' in r[2]
print('TRANSLATION_SOURCE_EXTRACTOR=PASS')
