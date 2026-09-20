#!/usr/bin/env python3
from translation_quality import checks
assert checks('What is 2+3? A) 4 B) 5','2+3是多少？A) 4 B) 5')==[]
w=checks('Veja a figura. A) 2 B) 3','见图。A) 2 B) 3',[{'key':x,'label':x} for x in 'ABCDE'],'/q.png')
assert 'visual_review_required' in w and 'choice_labels_unrecovered' in w
assert 'numeric_mismatch' in checks('2+3','2+4')
assert 'option_letter_mismatch' in checks('A) 1 B) 2','A) 1 C) 2')
print('TRANSLATION_QUALITY=PASS')
