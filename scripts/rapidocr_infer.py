#!/usr/bin/env python3
"""Single-image RapidOCR adapter (run in isolated CPU-only Python environment)."""
import argparse
import json
from pathlib import Path
import sys

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("image",type=Path)
    args=ap.parse_args()
    if not args.image.is_file():
        ap.error("Image not found")
    from rapidocr import RapidOCR
    import importlib.metadata
    engine=RapidOCR()
    result=engine(str(args.image))
    lines=list(result.txts) if result.txts is not None else []
    scores=[float(v) for v in result.scores] if result.scores is not None else []
    boxes=result.boxes.tolist() if result.boxes is not None else []
    print("OCR_RESULT_JSON="+json.dumps({
      "schemaVersion":1,
      "engine":"rapidocr",
      "packageVersion":importlib.metadata.version("rapidocr"),
      "lines":lines,
      "scores":scores,
      "boxes":boxes
    },ensure_ascii=False))

if __name__=="__main__":
    main()
