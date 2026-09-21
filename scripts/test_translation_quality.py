#!/usr/bin/env python3
from translation_quality import checks
assert checks('What is 2+3? A) 4 B) 5','2+3是多少？A) 4 B) 5')==[]
w=checks('Veja a figura. A) 2 B) 3','见图。A) 2 B) 3',[{'key':x,'label':x} for x in 'ABCDE'],'/q.png')
assert 'visual_review_required' in w and 'choice_labels_unrecovered' not in w
assert 'numeric_mismatch' in checks('2+3','2+4')
assert 'option_letter_mismatch' in checks('A) 1 B) 2','A) 1 C) 2')
print('TRANSLATION_QUALITY=PASS')

w=checks('Veja a figura.','见图。',[{'key':x,'label':x} for x in 'ABCDE'],'/q.png')
assert 'choice_labels_unrecovered' in w
assert 'numeric_mismatch' not in checks('rectangle 5 × 4. (A) 2 (B) 3 - 4 Point Questions -','矩形5×4。(A) 2 (B) 3')
assert 'numeric_mismatch' not in checks('A 1×1 cube from a 3×3 cube','从3×3立方体切去1×1立方体')
assert 'numeric_mismatch' in checks('There are 6 goals','有6个球，后来又进了3个')
assert 'numeric_mismatch' not in checks('three times as many fish, he would have 12 more','鱼的数量是3倍，那么会多12条')
assert 'numeric_mismatch' not in checks('três vezes mais, 12 peixes','3倍，12条鱼')
assert 'numeric_mismatch' in checks('three times as many fish, 12 more','4倍，12条鱼')
assert 'numeric_mismatch' not in checks('6 goals, then another three goals. (A) 3 (B) 4','6个球，后来又进3个球。(A) 3 (B) 4')
assert 'numeric_mismatch' in checks('6 goals, then another three goals','6个球，后来又进4个球')

def test_chinese_spelled_quantities_match_english_words():
    assert checks('A tractor pulls three times as much.','拖拉机能拉三倍。') == []
    assert checks('Carly has six cards numbered 2, 4, 5, 6, 7, 8.','卡莉有六张卡片，数字为 2、4、5、6、7、8。') == []
