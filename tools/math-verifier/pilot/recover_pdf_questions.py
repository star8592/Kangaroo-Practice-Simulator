#!/usr/bin/env python3
import argparse, hashlib, json, re, subprocess, tempfile
from pathlib import Path

MARKER = re.compile(r'^\s*(\d{1,2})\.\s+(.*)$')
SUSPICIOUS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]|ˇ|\sD\s|\sC\s')

def extract_text(pdf: Path) -> str:
    with tempfile.NamedTemporaryFile(suffix='.txt') as tmp:
        subprocess.run(['pdftotext', '-layout', str(pdf), tmp.name], check=True)
        return Path(tmp.name).read_text(errors='replace')

def find_question_markers(lines):
    hits=[]
    for i,line in enumerate(lines):
        m=MARKER.match(line)
        if m and 1 <= int(m.group(1)) <= 25:
            hits.append((i,int(m.group(1))))
    for start,(line_no,n) in enumerate(hits):
        if n != 1: continue
        seq=[]; expect=1
        for h in hits[start:]:
            if h[1] == expect:
                seq.append(h); expect += 1
                if expect == 26: return seq
            elif h[1] == 1 and expect < 26:
                seq=[h]; expect=2
    raise RuntimeError('could not find a complete 1..25 question sequence')

def normalize(block: str) -> str:
    lines=[re.sub(r'\s+$','',x) for x in block.replace('\f','\n').splitlines()]
    return '\n'.join(lines).strip()

def main():
    ap=argparse.ArgumentParser(description='Recover audited question blocks from a text-native contest PDF.')
    ap.add_argument('pdf')
    ap.add_argument('--competition', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--variant', default='')
    ap.add_argument('--output', required=True)
    args=ap.parse_args()
    pdf=Path(args.pdf).resolve(); data=pdf.read_bytes(); text=extract_text(pdf); lines=text.splitlines()
    markers=find_question_markers(lines); questions=[]
    for idx,(start,num) in enumerate(markers):
        end=markers[idx+1][0] if idx+1 < len(markers) else len(lines)
        raw='\n'.join(lines[start:end]).strip()
        questions.append({'number':num,'raw_text':raw,'normalized_text':normalize(raw),
                          'needs_visual_review':bool(SUSPICIOUS.search(raw))})
    result={'competition':args.competition,'year':args.year,'variant':args.variant,
            'source_pdf':str(pdf),'source_sha256':hashlib.sha256(data).hexdigest(),
            'extraction':'pdftotext -layout','question_count':len(questions),'questions':questions}
    out=Path(args.output); out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f"recovered={len(questions)} visual_review={sum(q['needs_visual_review'] for q in questions)} output={out}")
if __name__=='__main__': main()
