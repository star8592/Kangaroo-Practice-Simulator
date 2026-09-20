#!/usr/bin/env python3
from clean_translation_source import clean_source
cases={
 '1. Qual é o menor? A) 2 B) 3 do Canguru M':'1. Qual é o menor? A) 2 B) 3',
 '3. Problema aqui. r reproduzido apenas':'3. Problema aqui.',
 'SPM‐Centro, Departamento de Matemática da Faculdade de Ciências e Tecnologia da Universidade de Coimbra 1 5. A Carolina':'5. A Carolina',
}
for src,want in cases.items():
 got,_=clean_source(src); assert got==want,(got,want)
print('TRANSLATION_SOURCE_CLEANER=PASS')
