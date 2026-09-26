#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / 'private' / 'translation' / 'cemc.queue.enriched.json'
EXAMS = ROOT / 'private' / 'exams'
OUT = ROOT / 'private' / 'translation' / 'gpt-packets'

CONTRACT = {
    'requiredModelFamily': 'GPT',
    'preferredModel': 'GPT-5.6 Sol',
    'localLlmAllowed': False,
    'rules': [
        'Use the official CEMC PDF crop as the authority for formulas, superscripts, fractions, diagrams, and choice labels.',
        'Do not solve the problem or add hints to the student-facing stem.',
        'Produce natural Simplified Chinese while preserving every mathematical condition, variable, number, unit, and relation.',
        'Recover real A-E choice labels; A/B/C/D/E placeholders are forbidden for choice questions.',
        'For integer-answer questions, choices must be empty.',
        'Every reviewed row must retain answerVerified=true and visualVerified=true before promotion.',
    ],
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--exam', required=True)
    ap.add_argument('--queue', type=Path, default=QUEUE)
    ap.add_argument('--outdir', type=Path, default=OUT)
    args = ap.parse_args()

    bundle_path = EXAMS / f'{args.exam}.json'
    if not bundle_path.exists():
        raise SystemExit(f'unknown CEMC exam: {args.exam}')
    bundle = json.loads(bundle_path.read_text())
    if (bundle.get('profile') or {}).get('competitionId') != 'cemc':
        raise SystemExit(f'{args.exam}: not a CEMC bundle')

    all_jobs = json.loads(args.queue.read_text()).get('jobs', [])
    jobs = [j for j in all_jobs if j.get('examId') == args.exam]
    if len(jobs) != 25:
        raise SystemExit(f'{args.exam}: expected 25 queue jobs, found {len(jobs)}')
    source_by_no = {int(j['questionNo']): j for j in jobs}

    questions = []
    for q in bundle.get('questions', []):
        no = int(q['questionNo'])
        j = source_by_no[no]
        questions.append({
            'questionNo': no,
            'questionId': q.get('id'),
            'answerMode': q.get('answerMode'),
            'answer': q.get('answer'),
            'sourceText': j.get('sourceText'),
            'sourcePdf': q.get('sourceFile'),
            'sourceCrop': ((q.get('sourceMeta') or {}).get('crop') or {}).get('cropFile'),
            'sourcePage': ((q.get('sourceMeta') or {}).get('crop') or {}).get('page'),
            'sourceSha256': ((q.get('sourceMeta') or {}).get('canonicalSource') or {}).get('sourceSha256'),
            'sourceVisualVerified': bool((q.get('review') or {}).get('visualVerified') is True),
            'answerVerified': bool(j.get('answerVerified')),
        })

    packet = {
        'kind': 'CEMC_GPT_REVIEW_PACKET',
        'examId': args.exam,
        'contract': CONTRACT,
        'questionCount': len(questions),
        'questions': questions,
    }
    args.outdir.mkdir(parents=True, exist_ok=True)
    out = args.outdir / f'{args.exam}.json'
    out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'exam': args.exam, 'questions': len(questions), 'provider': 'GPT_ONLY', 'output': str(out)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
