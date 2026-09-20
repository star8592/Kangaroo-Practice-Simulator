#!/usr/bin/env python3
"""Build a localization queue for questions that cannot safely appear in Chinese mode."""
from __future__ import annotations
import argparse,json,re
from pathlib import Path

CJK=re.compile(r"[\u3400-\u9fff]")

def source_text(q):
    meta=q.get("sourceMeta") if isinstance(q.get("sourceMeta"),dict) else {}
    return str(meta.get("rawText") or q.get("stem") or "").strip()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[2])
    ap.add_argument("--output",type=Path)
    args=ap.parse_args()
    root=args.root.resolve(); jobs=[]
    for file in sorted((root/"private"/"exams").glob("*.json")):
        try:b=json.loads(file.read_text(encoding="utf-8"))
        except Exception:continue
        p=b.get("profile") or {}
        for q in b.get("questions") or []:
            loc=q.get("localized") or {}
            zh=((loc.get("zh") or {}).get("stem") or "").strip()
            if zh or CJK.search(str(q.get("stem") or "")) or q.get("language")=="zh/en":
                continue
            raw=source_text(q)
            if not raw: continue
            jobs.append({
                "examId":p.get("id") or file.stem,
                "questionId":q.get("id"),
                "questionNo":q.get("questionNo"),
                "sourceLanguage":q.get("language") or p.get("language"),
                "sourceText":raw,
                "choices":q.get("choices") or [],
                "answerMode":q.get("answerMode") or "choice",
                "assetUrl":q.get("assetUrl"),
                "sourceFile":q.get("sourceFile"),
                "status":"needs_translation_and_visual_review",
            })
    out=args.output or (root/"private"/"translation"/"queue.json")
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps({"jobs":jobs},ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"jobs":len(jobs),"output":str(out)},ensure_ascii=False))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
