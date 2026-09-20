#!/usr/bin/env python3
"""Deterministic quality checks for competition-question translation drafts."""
from __future__ import annotations
import re
VISUAL_RE=re.compile(r'figura|desenho|imagem|cart(?:ão|ões)|tabela|diagrama|quadrado|triângulo|círculo|gráfico|figure|diagram|image|table|grid|triangle|square|circle',re.I)
OPTION_RE=re.compile(r'(?<!\w)([A-E])\s*[\)\.]')

def numeric_tokens(s): return [x.replace(',', '.') for x in re.findall(r'\d+(?:[.,]\d+)?',s or '')]
WORD_NUMBERS={
    'zero':'0','one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10',
    'um':'1','uma':'1','dois':'2','duas':'2','três':'3','tres':'3','quatro':'4','cinco':'5','seis':'6','sete':'7','oito':'8','nove':'9','dez':'10'
}
def normalized_numeric_tokens(s):
    # Ignore layout-only section headings such as '- 4 Point Questions -'.
    s=re.sub(r'-?\s*\d+\s*Point Questions\s*-?', '', s or '', flags=re.I)
    tokens=numeric_tokens(s)
    # Only normalize spelled-out numbers in explicit mathematical quantity contexts.
    # This handles "three times" -> "3倍" without treating every prose number word as a digit.
    low=s.lower()
    for word,value in WORD_NUMBERS.items():
        pat=rf'(?<!\w){re.escape(word)}\s+(?:times|vezes)(?!\w)'
        tokens.extend([value]*len(re.findall(pat,low,re.I)))
    return tokens
def option_letters(s): return OPTION_RE.findall(s or '')
def visual_dependent(s): return bool(VISUAL_RE.search(s or ''))
def checks(source,zh,choices=None,asset_url=None):
    warnings=[]
    src_nums=normalized_numeric_tokens(source); zh_nums=normalized_numeric_tokens(zh)
    # Translation may reorder clauses or expand 'three' to 3; compare numeric multisets.
    # Extra digits remain a hard failure; order alone is not semantic loss.
    from collections import Counter
    if Counter(src_nums)!=Counter(zh_nums): warnings.append('numeric_mismatch')
    src_opts=option_letters(source); zh_opts=option_letters(zh)
    if src_opts and src_opts!=zh_opts: warnings.append('option_letter_mismatch')
    if choices and len(choices)==5 and all(c.get('label')==c.get('key') for c in choices) and not option_letters(source): warnings.append('choice_labels_unrecovered')
    if visual_dependent(source):
        warnings.append('visual_review_required')
        if not asset_url: warnings.append('visual_asset_missing')
    return warnings
