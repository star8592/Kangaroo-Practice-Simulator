#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import re
import time
import urllib.request
from pathlib import Path

from quality_tier import classify as quality_tier
from translation_quality import checks as quality_checks

ROOT = Path(__file__).resolve().parents[1]
HARD = {'numeric_mismatch','option_letter_mismatch','choice_labels_unrecovered','visual_asset_missing','source_ocr_noise','source_math_gap','vision_review_failed'}


def ask(model: str, source: str, zh: str, image: Path | None, use_image: bool = False) -> dict:
    prompt = '''你是第二轮数学竞赛翻译审校员。请严格对照英文原文和原题图片，审校中文草稿。\n要求：\n1. 不解题，不添加提示或解释。\n2. 必须完整保留题意、所有数字、算式、单位、变量、条件和选项 A-E。\n3. 若图片中的公式/分式/图表信息在英文文本抽取中排版错乱，以图片为准。\n4. 中文必须自然、适合中学生，但不能改写数学含义。\n5. 如果可以可靠修正，直接给出修正后的完整中文；只有图片或原文确实无法判读时才判失败。\n只输出 JSON：{"ok":true或false,"zh":"完整中文题目","issues":["问题说明"]}。\n\n英文原文：\n''' + source + '\n\n中文草稿：\n' + zh
    payload = {'model': model, 'prompt': prompt, 'stream': False, 'think': False, 'format': 'json', 'options': {'temperature': 0, 'num_predict': 1200}}
    if use_image and image and image.exists():
        payload['images'] = [base64.b64encode(image.read_bytes()).decode()]
    req = urllib.request.Request('http://127.0.0.1:11434/api/generate', data=json.dumps(payload).encode(), headers={'Content-Type':'application/json'})
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                raw = json.load(r)['response'].strip()
            raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw, flags=re.I|re.S).strip()
            m = re.search(r'\{.*\}', raw, re.S)
            if not m:
                raise ValueError('non-JSON reviewer response')
            value = json.loads(m.group(0))
            if not isinstance(value, dict):
                raise ValueError('reviewer JSON is not an object')
            return value
        except Exception as exc:
            last = exc
            if attempt < 3:
                time.sleep(2 ** attempt)
    raise RuntimeError(f'reviewer failed after retries: {last}')


def load_jobs(path: Path) -> dict[tuple[str,int],dict]:
    data = json.loads(path.read_text())
    return {(j['examId'], int(j['questionNo'])): j for j in data.get('jobs', [])}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--queue', type=Path, default=ROOT/'private/translation/cemc.queue.enriched.json')
    ap.add_argument('--draftdir', type=Path, default=ROOT/'private/translations/cemc-auto')
    ap.add_argument('--outdir', type=Path, default=ROOT/'private/translations/cemc-reviewed')
    ap.add_argument('--exam', required=True)
    ap.add_argument('--model', default='qwen3.8:9b')
    ap.add_argument('--use-image', action='store_true')
    ap.add_argument('--limit', type=int, default=25)
    args = ap.parse_args()

    jobs = load_jobs(args.queue.resolve())
    draft_path = args.draftdir.resolve() / f'{args.exam}.draft.json'
    draft = json.loads(draft_path.read_text())
    rows = sorted(draft.get('questions', []), key=lambda x: int(x['questionNo']))[:args.limit]
    reviewed = []
    passed = failed = 0
    for idx, row in enumerate(rows, 1):
        qno = int(row['questionNo'])
        job = jobs[(args.exam, qno)]
        localized = row.get('localized') or {}
        zh0 = ((localized.get('zh') or {}).get('stem') or '').strip()
        source = job['sourceText']
        image = Path(job['assetUrl']) if job.get('assetUrl') else None
        issues = []
        try:
            verdict = ask(args.model, source, zh0, image, args.use_image)
            zh = str(verdict.get('zh') or zh0).strip()
            issues.extend(str(x) for x in (verdict.get('issues') or []))
            ok = verdict.get('ok') is True and bool(zh)
        except Exception as exc:
            verdict = {'ok': False, 'zh': zh0, 'issues': [str(exc)]}
            zh = zh0
            ok = False
            issues.append(str(exc))

        warnings = quality_checks(source, zh, job.get('choices', []), str(image) if image else None)
        if not ok:
            warnings.append('vision_review_failed')
        warnings = list(dict.fromkeys(warnings))
        hard = sorted(set(warnings) & HARD)
        release = ok and not hard and bool(job.get('sourceVisualVerified')) and bool(job.get('answerVerified'))
        status = 'reviewed' if release else 'machine_draft'
        tier = quality_tier(warnings, translation_status=status, visual_verified=bool(job.get('sourceVisualVerified')), answer_verified=bool(job.get('answerVerified')))
        localized['zh'] = {'stem': zh, 'choices': (localized.get('zh') or {}).get('choices', [])}
        reviewed.append({
            'questionNo': qno,
            'localized': localized,
            'examReady': release,
            'review': {
                'translationStatus': status,
                'needsReview': not release,
                'verified': release,
                'visualVerified': bool(job.get('sourceVisualVerified')),
                'answerVerified': bool(job.get('answerVerified')),
                'visualStatus': 'official_source_crop',
                'qualityWarnings': warnings,
                'reviewIssues': issues,
                'reviewModel': args.model,
                **tier,
            },
        })
        passed += release
        failed += not release
        print(json.dumps({'progress':idx,'total':len(rows),'exam':args.exam,'questionNo':qno,'releaseEligible':release,'warnings':warnings,'issues':issues[:2]}, ensure_ascii=False), flush=True)

    args.outdir.mkdir(parents=True, exist_ok=True)
    out = args.outdir / f'{args.exam}.reviewed.json'
    out.write_text(json.dumps({'examId':args.exam,'model':args.model,'questions':reviewed}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'exam':args.exam,'reviewed':len(reviewed),'passed':passed,'failed':failed,'output':str(out)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
