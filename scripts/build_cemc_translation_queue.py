#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
EXAMS = ROOT / 'private' / 'exams'
DEFAULT_OUT = ROOT / 'private' / 'translation' / 'cemc.queue.enriched.json'
SCALE = 170 / 72.0


def norm_line(line: str) -> str:
    line = line.replace('\u00ad', '').replace('\ufb00', 'ff').replace('\ufb01', 'fi').replace('\ufb02', 'fl')
    return re.sub(r'\s+', ' ', line).strip()


def split_raw(text: str, qno: int) -> tuple[list[str], list[str]]:
    lines = text.replace('\r', '').splitlines()
    marker = re.compile(r'^\s*' + re.escape(str(qno)) + r'\.\s*')
    idx = next((i for i, line in enumerate(lines) if marker.search(line)), None)
    if idx is None:
        return [], [norm_line(x) for x in lines if norm_line(x)]
    pre = [norm_line(x) for x in lines[:idx] if norm_line(x)]
    body = lines[idx:]
    body[0] = marker.sub('', body[0], count=1)
    body = [norm_line(x) for x in body if norm_line(x)]
    return pre, body


def meaningful_math_prefix(lines: list[str]) -> list[str]:
    if not lines:
        return []
    text = ' '.join(lines)
    # Question-number overhang is usually a fraction numerator or short formula.
    # Reject headers/diagram-label noise unless there is clear mathematical content.
    has_math = bool(re.search(r'\d|[=+−\-×÷/^<>]', text))
    if not has_math or len(text) > 100:
        return []
    return lines[-3:]


def numeric_signature(text: str) -> list[str]:
    return re.findall(r'\d+(?:\.\d+)?', text or '')


def remove_next_prefix_spill(body: list[str], next_prefix: list[str]) -> list[str]:
    if not body or not next_prefix:
        return body
    prefix_text = ' '.join(next_prefix)
    prefix_nums = numeric_signature(prefix_text)
    # Remove up to three trailing math-only lines when their numeric signature
    # matches the next question's pre-number formula. This fixes fraction/formula
    # overhang without deleting ordinary prose or diagram labels.
    for n in range(min(3, len(body)), 0, -1):
        tail = body[-n:]
        tail_text = ' '.join(tail)
        if re.search(r'[A-Za-z]{2,}', tail_text):
            continue
        if prefix_nums and numeric_signature(tail_text) == prefix_nums:
            return body[:-n]
        if norm_line(tail_text) == norm_line(prefix_text):
            return body[:-n]
    return body


def source_rect(q: dict) -> fitz.Rect:
    crop = (q.get('sourceMeta') or {}).get('crop') or {}
    box = crop.get('pixelBox')
    if not (isinstance(box, list) and len(box) == 4):
        raise RuntimeError(f"{q.get('id')}: missing crop.pixelBox")
    return fitz.Rect(*(float(v) / SCALE for v in box))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, default=DEFAULT_OUT)
    ap.add_argument('--exam')
    args = ap.parse_args()

    jobs = []
    docs: dict[str, fitz.Document] = {}
    failures = []
    selected_files = []
    for path in sorted(EXAMS.glob('cemc-*.json')):
        bundle = json.loads(path.read_text())
        profile = bundle.get('profile') or {}
        exam_id = str(profile.get('id') or path.stem)
        if args.exam and exam_id != args.exam:
            continue
        selected_files.append(path)
        parts = []
        for q in bundle.get('questions', []):
            try:
                meta = q.get('sourceMeta') or {}
                crop = meta.get('crop') or {}
                page_no = int(crop['page'])
                pdf_path = str(q['sourceFile'])
                doc = docs.setdefault(pdf_path, fitz.open(pdf_path))
                raw = doc[page_no - 1].get_text('text', clip=source_rect(q), sort=True)
                pre, body = split_raw(raw, int(q['questionNo']))
                parts.append((q, meaningful_math_prefix(pre), body))
            except Exception as exc:
                failures.append({'examId': exam_id, 'questionNo': q.get('questionNo'), 'error': str(exc)})

        for i, (q, prefix, body) in enumerate(parts):
            next_prefix = parts[i + 1][1] if i + 1 < len(parts) else []
            body = remove_next_prefix_spill(body, next_prefix)
            source_lines = prefix + body
            source = '\n'.join(source_lines).strip()
            try:
                if len(source) < 12:
                    raise RuntimeError(f'source text too short: {source!r}')
                meta = q.get('sourceMeta') or {}
                crop = meta.get('crop') or {}
                asset_path = str(crop.get('cropFile') or '')
                jobs.append({
                    'examId': exam_id,
                    'questionId': q.get('id'),
                    'questionNo': int(q['questionNo']),
                    'sourceLanguage': 'en',
                    'sourceText': source,
                    'sourceTextOrigin': 'pdftotext',
                    'sourceMathPrefixRecovered': bool(prefix),
                    'choices': q.get('choices') or [],
                    'choicesOrigin': 'source_text',
                    'answer': q.get('answer'),
                    'answerVerified': True,
                    'sourceVisualVerified': bool((q.get('review') or {}).get('visualVerified') is True),
                    'assetUrl': asset_path or None,
                    'sourceFile': str(q.get('sourceFile') or ''),
                    'sourceRegistryId': profile.get('sourceRegistryId'),
                    'rightsPolicy': profile.get('rightsPolicy'),
                })
            except Exception as exc:
                failures.append({'examId': exam_id, 'questionNo': q.get('questionNo'), 'error': str(exc)})

    for doc in docs.values():
        doc.close()
    jobs.sort(key=lambda x: (x['examId'], x['questionNo']))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({'jobs': jobs, 'meta': {'examFiles': len(selected_files), 'questions': len(jobs), 'failures': failures}}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': str(args.out), 'examFiles': len(selected_files), 'questions': len(jobs), 'failures': len(failures)}, ensure_ascii=False))
    if failures:
        for item in failures[:20]:
            print('FAIL', item)
        raise SystemExit(2)


if __name__ == '__main__':
    main()
