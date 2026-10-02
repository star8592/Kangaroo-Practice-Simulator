#!/usr/bin/env python3
import argparse, hashlib, json, subprocess, time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]

def git_rev(path: Path):
    try:
        return subprocess.check_output(['git','-C',str(path),'rev-parse','HEAD'], text=True).strip()
    except Exception:
        return None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('proof_source')
    ap.add_argument('--problem-id', required=True)
    ap.add_argument('--competition')
    ap.add_argument('--year', type=int)
    ap.add_argument('--domain', default='unknown')
    ap.add_argument('--attempts', type=int, default=1)
    ap.add_argument('--output', required=True)
    args=ap.parse_args()

    src=(ROOT / args.proof_source).resolve() if not Path(args.proof_source).is_absolute() else Path(args.proof_source)
    source_hash=hashlib.sha256(src.read_bytes()).hexdigest()
    started=time.perf_counter()
    proc=subprocess.run([str(ROOT/'bin/verify.sh'), str(src)], cwd=ROOT, text=True, capture_output=True)
    duration=round((time.perf_counter()-started)*1000)
    err=(proc.stderr or proc.stdout).strip() or None
    result={
      'problem_id': args.problem_id,
      'competition': args.competition,
      'year': args.year,
      'domain': args.domain,
      'status': 'verified' if proc.returncode == 0 else 'failed',
      'method': 'lean',
      'formal_statement': None,
      'proof_source': str(src.relative_to(REPO)) if src.is_relative_to(REPO) else str(src),
      'source_sha256': source_hash,
      'verifier_revision': git_rev(REPO),
      'lean_toolchain': (ROOT/'lean-toolchain').read_text().strip(),
      'mathlib_revision': git_rev(ROOT/'.lake/packages/mathlib'),
      'duration_ms': duration,
      'attempts': args.attempts,
      'error': None if proc.returncode == 0 else err,
      'verified_at': datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),
    }
    out=Path(args.output); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result, ensure_ascii=False))
    raise SystemExit(proc.returncode)

if __name__ == '__main__':
    main()
