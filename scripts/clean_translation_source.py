#!/usr/bin/env python3
"""Conservative cleanup for OCR/PDF text before machine translation."""
from __future__ import annotations
import re

NOISE_PATTERNS = [
 r'©\s*Canguru Matemático[^\n]*',
 r'Este material pode ser reproduzido apenas com autorização[^\n]*',
 r'SPM[‐-]Centro,?\s*Departamento de Matemática.*?Universidade de Coimbra',
 r'Canguru Matemático sem fronteiras\s*\d*',
 r'Categoria:\s*[A-Za-zÀ-ÿ]+',
]
TRAILING_NOISE = [
 r'\s+do Canguru M\s*$', r'\s+com autorização\s*$', r'\s+r reproduzido apenas\s*$',
 r'\s+rial pode se\s*$', r'\s+g Este mate\s*$',
]

def clean_source(text:str)->tuple[str,list[str]]:
    s=(text or '').replace('\u00ad','').replace('\f',' ')
    flags=[]
    for pat in NOISE_PATTERNS:
        ns,n=re.subn(pat,' ',s,flags=re.I)
        if n: flags.append('removed_page_noise')
        s=ns
    for pat in TRAILING_NOISE:
        ns,n=re.subn(pat,'',s,flags=re.I)
        if n: flags.append('removed_ocr_tail')
        s=ns
    s=re.sub(r'\s+',' ',s).strip()
    # PDF page number can be injected immediately before the real question number.
    s=re.sub(r'^\d+\s+(?=\d+\.\s)', '', s)
    return s,sorted(set(flags))
