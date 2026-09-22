#!/usr/bin/env python3
"""Validate bilingual exam bundles before student exposure."""
from __future__ import annotations
import argparse, json, re
from collections import Counter
from pathlib import Path
from typing import Any
from translation_quality import normalized_numeric_tokens

DIGIT_RE = re.compile(r"\d+(?:[.,]\d+)?(?:%|°)?")
SOURCE_HINTS = {
    "pt": ("qual", "quantos", "figura", "abaixo", "resposta", "mostra", "cada"),
    "de": ("welche", "abbildung", "antwort", "zeigt", "wie viele"),
    "fr": ("quelle", "figure", "réponse", "combien", "montre"),
}

def load_questions(path: Path) -> list[dict[str, Any]]:
    data=json.loads(path.read_text(encoding='utf-8'))
    if isinstance(data,list): return data
    if isinstance(data,dict) and isinstance(data.get('questions'),list): return data['questions']
    raise ValueError('Expected question array or object containing questions[]')

def source_lang(q: dict[str, Any]) -> str:
    src=q.get('source')
    if isinstance(src,dict) and src.get('language'): return str(src['language'])
    return str(q.get('language',''))

def source_choice_keys(q: dict[str, Any]) -> list[str]:
    src=q.get('source')
    if isinstance(src,dict) and isinstance(src.get('choices'),list): rows=src['choices']
    else: rows=q.get('choices',[])
    return [str(x.get('key','')) for x in rows if isinstance(x,dict)]

def localized_choice_keys(q: dict[str, Any], lang: str) -> list[str]:
    rows=q.get('localized',{}).get(lang,{}).get('choices',[])
    return [str(x.get('key','')) for x in rows if isinstance(x,dict)]

def visible_text(q: dict[str, Any], lang: str) -> str:
    loc=q.get('localized',{}).get(lang,{})
    bits=[str(loc.get('stem','')),str(loc.get('solution',''))]
    bits += [str(x.get('label','')) for x in loc.get('choices',[]) if isinstance(x,dict)]
    return ' '.join(bits)


def student_assets(q: dict[str, Any]) -> tuple[str,str]:
    visual=q.get('visual') if isinstance(q.get('visual'),dict) else {}
    common=str(visual.get('diagramOnly') or q.get('studentAssetUrl') or '')
    zh=str(visual.get('localizedZh') or q.get('studentAssetUrlZh') or common)
    en=str(visual.get('localizedEn') or q.get('studentAssetUrlEn') or common)
    return zh,en

def validate(q: dict[str, Any], assets_root: Path|None) -> list[str]:
    errors=[]; qid=str(q.get('id','<missing-id>')); localized=q.get('localized',{})
    keys=source_choice_keys(q)
    texts={}
    for lang in ('zh','en'):
        loc=localized.get(lang)
        if not isinstance(loc,dict) or not str(loc.get('stem','')).strip():
            errors.append(f'{qid}: missing {lang} stem'); continue
        if localized_choice_keys(q,lang) != keys:
            errors.append(f'{qid}: {lang} choice keys differ from source')
        texts[lang]=visible_text(q,lang)
    if 'zh' in texts and 'en' in texts and Counter(normalized_numeric_tokens(texts['zh'])) != Counter(normalized_numeric_tokens(texts['en'])):
        errors.append(f'{qid}: zh/en numeric tokens differ')
    answer=str(q.get('answer',''))
    if answer not in keys: errors.append(f'{qid}: answer {answer!r} is not a source choice key')
    sl=source_lang(q)
    for lang,text in texts.items():
        low=text.lower(); hits=[w for w in SOURCE_HINTS.get(sl,()) if w in low]
        if len(hits)>=2: errors.append(f'{qid}: {lang} contains likely {sl} residue: {hits[:4]}')
    review=q.get('review',{})
    zh_asset,en_asset=student_assets(q)
    if review.get('visualStatus') in ('diagram_only','localized') and (not zh_asset or not en_asset):
        errors.append(f'{qid}: student visual is incomplete')
    if review.get('visualStatus')=='localized' and zh_asset==en_asset:
        errors.append(f'{qid}: localized visual requires distinct zh/en assets')
    if assets_root:
        for label,asset in [('zh',zh_asset),('en',en_asset)]:
            if asset:
                candidate=assets_root / asset.lstrip('/')
                if not candidate.exists() or candidate.stat().st_size==0:
                    errors.append(f'{qid}: missing/empty {label} student asset: {candidate}')
    source_verified=bool(q.get('verified') or review.get('verified'))
    gate_ok=(not errors and review.get('translationStatus')=='reviewed' and source_verified and review.get('visualVerified') is True and review.get('needsReview') is not True)
    if bool(q.get('examReady')) != gate_ok:
        errors.append(f'{qid}: examReady={q.get("examReady")} but computed gate={gate_ok}')
    return errors

def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument('bundle',type=Path); ap.add_argument('--assets-root',type=Path)
    args=ap.parse_args(); qs=load_questions(args.bundle); errors=[]; ready=0
    for q in qs:
        errors.extend(validate(q,args.assets_root)); ready += bool(q.get('examReady'))
    print(json.dumps({'questions':len(qs),'ready':ready,'errors':len(errors),'ok':not errors},ensure_ascii=False))
    for e in errors: print('ERROR',e)
    return 1 if errors else 0
if __name__=='__main__': raise SystemExit(main())
