#!/usr/bin/env python3
"""Audit student question delivery quality.

This script is intentionally read-only. It measures:
- Chinese/English delivery coverage
- legacy English-only questions still marked student-ready
- suspiciously short or over-cropped question images
- canonical gaps where a crop stops far before the next real question begins
- choice questions whose extracted crop text appears to lose options

It uses only stdlib so it can run on production hosts without extra Python packages.
"""
from __future__ import annotations
import argparse, json, os, re, struct
from pathlib import Path

CJK = re.compile(r"[\u3400-\u9fff]")
OPTION = re.compile(r"(?:\([A-E]\)|\b[A-E][.)])")


def png_size(path: Path):
    try:
        with path.open("rb") as f:
            head = f.read(24)
        if len(head) >= 24 and head[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", head[16:24])
    except OSError:
        pass
    return None


def txt(v):
    return v.strip() if isinstance(v, str) else ""


def has_visual(q):
    return any(q.get(k) for k in (
        "studentAssetUrl", "studentAssetUrlZh", "studentAssetUrlEn",
        "assetUrl", "assetUrlZh", "assetUrlEn",
    ))


def has_zh(q):
    loc=(q.get("localized") or {}).get("zh") or {}
    if txt(loc.get("stem")):
        return True
    if CJK.search(txt(q.get("stem"))):
        return True
    return q.get("language") == "zh/en" and has_visual(q)


def has_en(q):
    loc=(q.get("localized") or {}).get("en") or {}
    return bool(
        txt(loc.get("stem"))
        or txt(q.get("stemEn"))
        or (q.get("language") == "zh/en" and has_visual(q))
    )


def source_asset(q):
    return (
        q.get("studentAssetUrlZh")
        or q.get("studentAssetUrl")
        or q.get("assetUrlZh")
        or q.get("assetUrl")
    )


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--fail-on-student-defect", action="store_true")
    args=ap.parse_args()
    root=args.root.resolve()
    exam_dir=root/"private"/"exams"
    totals={
        "bundles":0,"questions":0,"zh_ready":0,"en_ready":0,"bilingual_ready":0,
        "missing_zh":0,"source_english_without_zh":0,"student_flag_english_only":0,
        "suspicious_crop":0,"missing_options_in_crop":0,"missing_asset":0,
    }
    defects=[]
    bundles=[]

    for file in sorted(exam_dir.glob("*.json")):
        try:
            bundle=json.loads(file.read_text(encoding="utf-8"))
        except Exception:
            continue
        questions=bundle.get("questions") or []
        if not questions:
            continue
        totals["bundles"] += 1
        totals["questions"] += len(questions)
        profile=bundle.get("profile") or {}
        sorted_q=sorted(questions,key=lambda q:int(q.get("questionNo") or 0))

        for i,q in enumerate(sorted_q):
            qid=str(q.get("id") or f"{file.stem}-q?")
            zh=has_zh(q); en=has_en(q)
            totals["zh_ready"] += int(zh)
            totals["en_ready"] += int(en)
            totals["bilingual_ready"] += int(zh and en)
            totals["missing_zh"] += int(not zh)
            totals["source_english_without_zh"] += int(q.get("language") == "en" and not zh)
            raw_en = q.get("language") == "en" or bool(txt(q.get("stem")) and re.search(r"[A-Za-z]{3,}", txt(q.get("stem"))))
            if bool(q.get("examReady") or profile.get("studentReady")) and raw_en and not zh:
                totals["student_flag_english_only"] += 1
                defects.append({"type":"english_only_student","exam":file.stem,"question":qid})

            asset=source_asset(q)
            if asset:
                p=root/"public"/str(asset).lstrip("/")
                if not p.exists():
                    totals["missing_asset"] += 1
                    defects.append({"type":"missing_asset","exam":file.stem,"question":qid,"asset":asset})
                else:
                    size=png_size(p)
                    if size:
                        w,h=size
                        if h < 80 or (h and w/h > 12):
                            totals["suspicious_crop"] += 1
                            defects.append({"type":"suspicious_image_geometry","exam":file.stem,"question":qid,"w":w,"h":h,"asset":asset})

            meta=q.get("sourceMeta") if isinstance(q.get("sourceMeta"),dict) else {}
            crop=meta.get("crop")
            page=meta.get("page")
            raw=txt(meta.get("rawText"))
            if isinstance(crop,list) and len(crop)==4 and page:
                try:
                    height=float(crop[3])-float(crop[1])
                except Exception:
                    height=999
                next_same=None
                for nq in sorted_q[i+1:]:
                    nm=nq.get("sourceMeta") if isinstance(nq.get("sourceMeta"),dict) else {}
                    nc=nm.get("crop")
                    if nm.get("page")==page and isinstance(nc,list) and len(nc)==4:
                        next_same=nc
                        break
                gap=None
                if next_same:
                    try: gap=float(next_same[1])-float(crop[3])
                    except Exception: pass
                if height < 35 or (gap is not None and gap > 35):
                    totals["suspicious_crop"] += 1
                    defects.append({
                        "type":"canonical_crop_gap","exam":file.stem,"question":qid,
                        "heightPt":round(height,2),"gapToNextPt":None if gap is None else round(gap,2),
                    })

            choices=q.get("choices")
            if isinstance(choices,list) and len(choices)>=4 and raw:
                option_hits=len(set(OPTION.findall(raw)))
                # Most legacy source crops expose choices as (A)..(E). When fewer
                # than four markers survive and the crop is already geometrically
                # suspicious, this is a strong cutoff signal.
                if option_hits < 4 and any(
                    d.get("exam")==file.stem and d.get("question")==qid and d.get("type") in {"canonical_crop_gap","suspicious_image_geometry"}
                    for d in defects[-4:]
                ):
                    totals["missing_options_in_crop"] += 1
                    defects.append({"type":"options_likely_cut","exam":file.stem,"question":qid,"optionMarkers":option_hits})

        bundles.append({
            "exam":file.stem,
            "profileLanguage":profile.get("language"),
            "questions":len(questions),
            "bilingual":sum(1 for q in questions if has_zh(q) and has_en(q)),
        })

    report={"totals":totals,"defects":defects,"bundles":bundles}
    if args.json:
        print(json.dumps(report,ensure_ascii=False,indent=2))
    else:
        print(json.dumps(totals,ensure_ascii=False))
        for d in defects[:200]:
            print("DEFECT",json.dumps(d,ensure_ascii=False))
        if len(defects)>200:
            print(f"... {len(defects)-200} more defects omitted")

    if args.fail_on_student_defect and (
        totals["student_flag_english_only"] or totals["missing_asset"]
    ):
        return 1
    return 0


if __name__=="__main__":
    raise SystemExit(main())
