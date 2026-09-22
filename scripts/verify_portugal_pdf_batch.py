#!/usr/bin/env python3
"""Verify a deterministic batch of unresolved Portugal PDF-region questions.

A question is promoted only when two independent pdftotext crop modes agree
(exact text, exact token stream, or whitespace-only), A-E structure is exact,
known contamination is absent, and source/crop/page evidence hashes are frozen.
"""
import argparse, json, re, unicodedata, hashlib, subprocess, math
from pathlib import Path
from collections import Counter

NOISE_RE = re.compile(
    r'Canguru Matem[aá]tico|Todos os direitos|Universidade de Coimbra|'
    r'Sociedade Portuguesa de Matem[aá]tica|Departamento de Matem[aá]tica|'
    r'Organiza[cç][aã]o do Departamento|autorização|reproduzido|®',
    re.I,
)
VISUAL_RE = re.compile(
    r'\b(figura|figuras|diagrama|imagem|imagens|desenho|desenhos|tabela|'
    r'gr[aá]fico|gr[aá]ficos|representad[oa]s?|mostrad[oa]s?|ao lado|abaixo|'
    r'acima|sombread[oa]|grelha|tabuleiro|mapa|cubo|cubos|quadrado|quadrados|'
    r'tri[aâ]ngulo|tri[aâ]ngulos|circunfer[eê]ncia|c[ií]rculo|domin[oó]|rel[oó]gio)\b',
    re.I,
)
SECTION_SUFFIX_RE = re.compile(
    r'\s*[-‐‑‒–—]?\s*(?:Problemas?|Quest[oõ]es?)\s+de\s+[345]\s+pontos'
    r'(?:\s+\d+)?\s*[-‐‑‒–—]?\s*$',
    re.I,
)
UNSAFE_GLYPH_RE = re.compile(r'[\uE000-\uF8FF]')
MATH_RISK_RE = re.compile(r'[=×÷√∑∏∠°%\^@#&*·/]|\b(express[aã]o|sucess[aã]o|igualdades?|equa[cç][aã]o|fun[cç][aã]o|fra[cç][aã]o|pot[eê]ncia|raiz|expoente|divis[ií]vel|divisor|m[uú]ltiplo|produto|quociente|algarismo|algarismos|coordenadas?|[aâ]ngulo|[aá]rea|per[ií]metro|probabilidade)\b', re.I)

def norm(s):
    s = unicodedata.normalize('NFKC', s or '')
    for ch in ('−', '–', '—', '‐'):
        s = s.replace(ch, '-')
    s = s.replace('ı́', 'í').replace('ı', 'i')
    s = re.sub(r'(?<=\w)-\s+(?=\w)', '', s)
    s = re.sub(r'\bE\s+\)', 'E)', s)
    return re.sub(r'\s+', ' ', s).strip()

def tokens(s):
    return re.findall(r'[A-Za-zÀ-ÖØ-öø-ÿ]+|\d+(?:[,.]\d+)?|[^\w\s]', norm(s), re.UNICODE)

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def crop_text(pdf, page, crop, mode):
    x0, y0, x1, y1 = [float(v) for v in crop]
    args = ['-layout'] if mode == 'layout' else ['-raw']
    cmd = [
        'pdftotext', *args, '-f', str(page), '-l', str(page), '-r', '72',
        '-x', str(max(0, math.floor(x0))), '-y', str(max(0, math.floor(y0))),
        '-W', str(max(1, math.ceil(x1) - math.floor(x0))),
        '-H', str(max(1, math.ceil(y1) - math.floor(y0))),
        str(pdf), '-',
    ]
    return norm(subprocess.run(cmd, check=True, capture_output=True).stdout.decode(errors='ignore').replace('\x0c', ' '))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument('--limit', type=int, default=500)
    ap.add_argument('--dpi', type=int, default=160)
    ap.add_argument('--retry-rejected', action='store_true')
    a = ap.parse_args()
    root = a.root.resolve()

    audit = json.loads((root / 'private/source-digitization/audit.json').read_text())['questions']
    unresolved = [q for q in audit if q['origin'] == 'existing_ocr' and q['status'] == 'NEEDS_SOURCE_REVIEW']
    history_path = root / 'private/source-digitization/portugal-batch-history.json'
    history = json.loads(history_path.read_text()) if history_path.exists() else {'decisions': [], 'batches': []}
    # Seed the persistent history from the previous single-batch manifest once.
    legacy = root / 'private/source-digitization/portugal-500-batch-decisions.json'
    if not history['decisions'] and legacy.exists():
        history['decisions'] = json.loads(legacy.read_text()).get('decisions', [])
    rejected_before = {
        (d['examId'], d['questionNo'])
        for d in history.get('decisions', [])
        if d.get('status') == 'REJECTED'
    }
    candidates = unresolved if a.retry_rejected else [
        q for q in unresolved if (q['examId'], q['questionNo']) not in rejected_before
    ]
    targets = candidates[:a.limit]
    jobs = {(j['examId'], j['questionNo']): j for j in json.loads((root / 'private/translation/queue.enriched.json').read_text())['jobs']}
    exam_cache = {}
    pdf_hash = {}
    page_cache = {}
    verified, decisions = [], []

    for t in targets:
        key = (t['examId'], t['questionNo'])
        j = jobs[key]
        ep = root / 'private/exams' / f"{t['examId']}.json"
        if ep not in exam_cache:
            exam_cache[ep] = {q['questionNo']: q for q in json.loads(ep.read_text())['questions']}
        q = exam_cache[ep].get(t['questionNo'])
        reason = None
        if not q:
            reason = 'exam_record_missing'
        else:
            meta = q.get('sourceMeta') or {}
            src = Path(q.get('sourceFile', ''))
            asset = root / ('public' + q.get('assetUrl', ''))
            if not (isinstance(meta.get('page'), int) and isinstance(meta.get('crop'), list) and len(meta['crop']) == 4):
                reason = 'source_region_missing'
            elif not src.exists():
                reason = 'source_pdf_missing'
            elif not asset.exists():
                reason = 'question_crop_missing'

        if reason:
            decisions.append({'examId': key[0], 'questionNo': key[1], 'status': 'REJECTED', 'reason': reason})
            continue

        la = crop_text(src, meta['page'], meta['crop'], 'layout')
        rb = crop_text(src, meta['page'], meta['crop'], 'raw')
        if not la or not rb:
            reason = 'region_text_empty'
        elif la == rb:
            agreement = 'exact_text'
        elif tokens(la) == tokens(rb):
            agreement = 'exact_tokens'
        elif re.sub(r'\s+', '', la) == re.sub(r'\s+', '', rb):
            agreement = 'whitespace_only'
        else:
            reason = 'layout_raw_not_exact'

        if reason:
            decisions.append({'examId': key[0], 'questionNo': key[1], 'status': 'REJECTED', 'reason': reason})
            continue

        # Trim only content before this question marker; this safely drops page headers.
        qm = re.search(r'(?<!\d)0*' + re.escape(str(t['questionNo'])) + r'\s*[\.\)\-:]\s*', la)
        if not qm:
            reason = 'question_marker_missing'
        else:
            canonical = la[qm.start():].strip()
            repaired = SECTION_SUFFIX_RE.sub('', canonical).strip()
            repair = 'strip_section_suffix' if repaired != canonical else None
            canonical = repaired

        if reason:
            decisions.append({'examId': key[0], 'questionNo': key[1], 'status': 'REJECTED', 'reason': reason})
            continue

        if NOISE_RE.search(canonical):
            reason = 'known_footer_or_header_noise'
        elif UNSAFE_GLYPH_RE.search(canonical):
            reason = 'private_use_glyph'
        elif re.search(r'\bexpress[aã]o\s*[,;:]', canonical, re.I):
            reason = 'formula_gap_suspected'
        elif MATH_RISK_RE.search(canonical):
            reason = 'formula_sensitive_requires_visual_review'
        elif re.search(r'\beuros?\b', canonical, re.I) and re.search(r'\b\d+[,.]\s*\d+\s+e\b', canonical, re.I):
            reason = 'currency_symbol_lost'

        marks = list(re.finditer(r'(?<!\w)\(?([ABCDE])\)', canonical))
        letters = [m.group(1) for m in marks]
        if not reason and letters != list('ABCDE'):
            reason = 'answer_markers_not_exact_A_to_E'

        if reason:
            decisions.append({'examId': key[0], 'questionNo': key[1], 'status': 'REJECTED', 'reason': reason})
            continue

        stem = canonical[qm.end() - qm.start():marks[0].start()].strip()
        choices = []
        for i, m in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(canonical)
            choices.append({'key': 'ABCDE'[i], 'label': canonical[m.end():end].strip()})

        if sum(bool(re.fullmatch(r'\d+[,.]\s*\d+\s+e', c['label'], re.I)) for c in choices) >= 3:
            reason = 'currency_symbol_lost'
            decisions.append({'examId': key[0], 'questionNo': key[1], 'status': 'REJECTED', 'reason': reason})
            continue

        visual = bool(VISUAL_RE.search(stem) or any(not c['label'] for c in choices))
        if any(not c['label'] for c in choices) and not visual:
            reason = 'empty_choice_without_visual_context'
            decisions.append({'examId': key[0], 'questionNo': key[1], 'status': 'REJECTED', 'reason': reason})
            continue

        if str(src) not in pdf_hash:
            pdf_hash[str(src)] = sha(src)
        pdfsha = pdf_hash[str(src)]
        pk = (pdfsha, meta['page'])
        if pk not in page_cache:
            od = root / 'private/source-digitization/portugal-batch-page-evidence' / pdfsha[:16]
            od.mkdir(parents=True, exist_ok=True)
            op = od / f"page-{meta['page']:03d}.png"
            if not op.exists():
                subprocess.run(
                    ['pdftoppm', '-f', str(meta['page']), '-l', str(meta['page']), '-singlefile',
                     '-png', '-r', str(a.dpi), str(src), str(op.with_suffix(''))],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
            page_cache[pk] = {'path': str(op.relative_to(root)), 'sha256': sha(op), 'dpi': a.dpi}

        rec = {
            'examId': key[0], 'questionNo': key[1], 'sourceLanguage': 'pt',
            'sourceText': stem, 'choices': choices, 'canonicalQuestionText': canonical,
            'sourceFile': str(src), 'sourceSha256': pdfsha, 'page': meta['page'], 'crop': meta['crop'],
            'pageEvidence': page_cache[pk],
            'asset': {'path': str(asset.relative_to(root)), 'sha256': sha(asset)},
            'extractionMethod': 'official_pdf_crop_layout_and_raw',
            'verificationStatus': 'SOURCE_VERIFIED',
            'verificationMethod': 'deterministic_layout_raw_agreement_plus_authoritative_page_raster_and_question_crop',
            'textAgreement': agreement, 'sourceRepair': repair, 'visualDependency': visual,
        }
        verified.append(rec)
        decisions.append({'examId': key[0], 'questionNo': key[1], 'status': 'SOURCE_VERIFIED', 'reason': None})

    store = root / 'private/source-digitization/verified-portugal-dual-pdf.json'
    prior = json.loads(store.read_text()) if store.exists() else {'questions': [], 'batches': []}
    target_keys = {(q['examId'], q['questionNo']) for q in targets}
    bykey = {(q['examId'], q['questionNo']): q for q in prior.get('questions', []) if (q['examId'], q['questionNo']) not in target_keys}
    for q in verified:
        bykey[(q['examId'], q['questionNo'])] = q
    prior['questions'] = [bykey[k] for k in sorted(bykey)]
    prior.setdefault('batches', []).append({
        'requested': a.limit, 'processed': len(targets), 'verified': len(verified),
        'rejected': len(targets) - len(verified),
        'reasons': dict(Counter(d['reason'] for d in decisions if d['reason'])),
    })
    store.write_text(json.dumps(prior, ensure_ascii=False, indent=2))
    manifest = root / 'private/source-digitization/portugal-500-batch-decisions.json'
    manifest.write_text(json.dumps({'processed': len(targets), 'decisions': decisions}, ensure_ascii=False, indent=2))
    by_decision = {(d['examId'], d['questionNo']): d for d in history.get('decisions', [])}
    for d in decisions:
        by_decision[(d['examId'], d['questionNo'])] = d
    history['decisions'] = [by_decision[k] for k in sorted(by_decision)]
    history.setdefault('batches', []).append({
        'processed': len(targets), 'verified': len(verified), 'rejected': len(targets)-len(verified),
        'retryRejected': bool(a.retry_rejected),
        'reasons': dict(Counter(d['reason'] for d in decisions if d['reason'])),
    })
    history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2))
    print(json.dumps({
        'processed': len(targets), 'verified': len(verified), 'rejected': len(targets)-len(verified),
        'reasons': dict(Counter(d['reason'] for d in decisions if d['reason'])),
        'totalStored': len(prior['questions']), 'pageEvidence': len(page_cache),
        'previousRejectedSkipped': 0 if a.retry_rejected else len(rejected_before),
        'output': str(store), 'decisions': str(manifest), 'history': str(history_path)
    }, ensure_ascii=False))

if __name__ == '__main__':
    main()
