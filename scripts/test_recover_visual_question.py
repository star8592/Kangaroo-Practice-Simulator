#!/usr/bin/env python3
import importlib.util
from pathlib import Path
p=Path(__file__).with_name('recover_visual_question.py');s=importlib.util.spec_from_file_location('rv',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
good={'sourceText':'5. Qual figura?','choices':[{'key':x,'label':'[visual]'} for x in 'ABCDE']}
assert m.valid(good,5)
assert not m.valid(good,15)
assert not m.valid({'sourceText':'5. x','choices':[{'key':'A','label':'1'}]},5)
print('VISUAL_RECOVERY_VALIDATION=PASS')
