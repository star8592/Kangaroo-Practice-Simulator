#!/usr/bin/env python3
"""Repair legacy question crops using canonical question boundaries.

The old importers sometimes calculated a question's bottom from a false/duplicate
anchor before deduplicating question numbers. That can produce 20–30pt-tall crops
that contain only the first line and lose the diagram/options.

This repair uses each bundle's already-selected canonical question starts. For a
question on the same page as the next canonical question, the new bottom is just
above the next question start. For the last canonical question on a page, an
obviously-short crop can be extended toward the page footer.

Default mode is dry-run. Use --apply to rewrite PNGs and sourceMeta.crop/rawText.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1])
    ap.add_argument("--exam",action="append",default=[])
    ap.add_argument("--apply",action="store_true")
    ap.add_argument("--gap-threshold",type=float,default=35.0)
    ap.add_argument("--min-height",type=float,default=35.0)
    args=ap.parse_args()

    try:
        import fitz
    except ImportError as exc:
        raise SystemExit("PyMuPDF/fitz is required for crop repair") from exc

    root=args.root.resolve()
    files=sorted((root/"private"/"exams").glob("*.json"))
    if args.exam:
        wanted=set(args.exam)
        files=[p for p in files if p.stem in wanted]

    changed_files=0; changed_questions=0
    docs={}
    try:
        for file in files:
            try: bundle=json.loads(file.read_text(encoding="utf-8"))
            except Exception: continue
            qs=sorted(bundle.get("questions") or [],key=lambda q:int(q.get("questionNo") or 0))
            dirty=False
            for i,q in enumerate(qs):
                meta=q.get("sourceMeta") if isinstance(q.get("sourceMeta"),dict) else None
                if not meta: continue
                crop=meta.get("crop"); page_no=meta.get("page"); src=q.get("sourceFile")
                if not (isinstance(crop,list) and len(crop)==4 and page_no and src):
                    continue
                src_path=Path(str(src))
                if not src_path.exists():
                    continue
                x0,y0,x1,y1=map(float,crop)
                current_h=y1-y0
                next_crop=None
                for nq in qs[i+1:]:
                    nm=nq.get("sourceMeta") if isinstance(nq.get("sourceMeta"),dict) else {}
                    nc=nm.get("crop")
                    if nm.get("page")==page_no and isinstance(nc,list) and len(nc)==4:
                        next_crop=list(map(float,nc)); break
                gap=(next_crop[1]-y1) if next_crop else None
                suspicious=current_h < args.min_height or (gap is not None and gap > args.gap_threshold)
                if not suspicious:
                    continue

                doc=docs.setdefault(str(src_path),fitz.open(src_path))
                page=doc[int(page_no)-1]
                if next_crop:
                    new_bottom=max(y0+args.min_height,next_crop[1]-6)
                else:
                    new_bottom=max(y0+args.min_height,page.rect.height-25)
                new_bottom=min(page.rect.height-10,new_bottom)
                if new_bottom <= y1+3:
                    continue

                asset=q.get("assetUrl")
                if not isinstance(asset,str) or not asset.startswith("/"):
                    continue
                out=root/"public"/asset.lstrip("/")
                out.parent.mkdir(parents=True,exist_ok=True)
                scale=2.2
                if out.exists():
                    # Preserve approximately the same raster width without Pillow.
                    try:
                        head=out.read_bytes()[:24]
                        if head[:8]==b"\x89PNG\r\n\x1a\n":
                            import struct
                            width=struct.unpack(">I",head[16:20])[0]
                            if x1>x0: scale=max(1.2,min(4.0,width/(x1-x0)))
                    except Exception:
                        pass

                print(json.dumps({
                    "exam":file.stem,"question":q.get("questionNo"),
                    "oldCrop":[x0,y0,x1,y1],
                    "newCrop":[x0,y0,x1,new_bottom],
                    "gapToNext":gap,
                    "asset":str(out),
                    "apply":args.apply,
                },ensure_ascii=False))

                if args.apply:
                    rect=fitz.Rect(x0,y0,x1,new_bottom)
                    pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=rect,alpha=False)
                    pix.save(out)
                    meta["crop"]=[round(x0,2),round(y0,2),round(x1,2),round(new_bottom,2)]
                    meta["rawText"]=" ".join(page.get_text("text",clip=rect).split())
                    q["sourceMeta"]=meta
                    dirty=True
                    changed_questions+=1

            if dirty and args.apply:
                file.write_text(json.dumps(bundle,ensure_ascii=False,indent=2),encoding="utf-8")
                changed_files+=1
    finally:
        for doc in docs.values():
            doc.close()

    print(json.dumps({
        "changedFiles":changed_files,
        "changedQuestions":changed_questions,
        "mode":"apply" if args.apply else "dry-run",
    },ensure_ascii=False))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
