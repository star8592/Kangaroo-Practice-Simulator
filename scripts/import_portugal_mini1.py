#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path
from extract_portugal_paper import build_bundle

def main():
    ap=argparse.ArgumentParser(description='Import Portugal Mini-Escolar I papers 2012-2026')
    ap.add_argument('--corpus-root',required=True,type=Path)
    ap.add_argument('--repo-root',type=Path,default=Path(__file__).resolve().parents[1])
    ap.add_argument('--start-year',type=int,default=2012)
    ap.add_argument('--end-year',type=int,default=2026)
    args=ap.parse_args()
    pdf_dir=args.corpus_root/'09_Portugal_University_Archive'/'pdf'
    results=[]; failures=[]
    for year in range(args.start_year,args.end_year+1):
        problem=pdf_dir/f'provaMini-Escolar_1_{str(year)[-2:]}.pdf'
        key=pdf_dir/f'ChaveMini-Escolar_1_{year}.pdf'
        if not problem.exists() or not key.exists():
            failures.append({'year':year,'error':'missing source','problem':problem.exists(),'key':key.exists()})
            continue
        try:
            results.append(build_bundle(problem,key,f'pt-{year}-mini1',year,args.repo_root.resolve()))
            print(f'{year}: OK')
        except Exception as exc:
            failures.append({'year':year,'error':repr(exc)})
            print(f'{year}: FAIL {exc}')
    summary={'imported':len(results),'failed':len(failures),'results':results,'failures':failures}
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    if failures: raise SystemExit(1)

if __name__=='__main__':
    main()
