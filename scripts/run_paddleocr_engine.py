#!/usr/bin/env python3
"""Run PaddleOCR 3.x in its isolated environment and emit stable JSON evidence."""
import argparse
import json
import os
import sys

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")


def reading_order(texts, boxes, scores):
    items = []
    for text, box, score in zip(texts, boxes, scores):
        x0, y0, x1, y1 = [float(v) for v in box]
        w = max(1.0, x1 - x0)
        h = max(1.0, y1 - y0)
        vertical = h > 2.2 * w
        items.append({
            "text": text, "score": float(score), "box": [x0, y0, x1, y1],
            "vertical": vertical, "cx": (x0 + x1) / 2, "cy": (y0 + y1) / 2, "h": h,
        })
    usable = [x for x in items if x["text"].strip() and not x["vertical"]]
    usable.sort(key=lambda x: (x["cy"], x["cx"]))
    lines = []
    for item in usable:
        target = None
        for line in lines:
            tol = max(10.0, 0.55 * max(line["h"], item["h"]))
            if abs(item["cy"] - line["cy"]) <= tol:
                target = line
                break
        if target is None:
            target = {"cy": item["cy"], "h": item["h"], "items": []}
            lines.append(target)
        target["items"].append(item)
        target["cy"] = sum(x["cy"] for x in target["items"]) / len(target["items"])
        target["h"] = max(target["h"], item["h"])
    lines.sort(key=lambda x: x["cy"])
    text_lines = []
    for line in lines:
        line["items"].sort(key=lambda x: x["cx"])
        text_lines.append(" ".join(x["text"].strip() for x in line["items"]))
    return " ".join(text_lines), items


def extract(ocr, image):
    res = list(ocr.predict(image))
    if not res:
        return {"status": "EMPTY", "text": "", "items": []}
    raw = res[0].json["res"]
    text, items = reading_order(
        raw.get("rec_texts", []),
        raw.get("rec_boxes", []),
        raw.get("rec_scores", []),
    )
    return {
        "status": "OK",
        "text": text,
        "items": items,
        "meanScore": (
            sum(x["score"] for x in items) / len(items) if items else None
        ),
        "modelSettings": raw.get("model_settings"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image", nargs="?")
    ap.add_argument("--lang", default="pt")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--server", action="store_true")
    args = ap.parse_args()

    from paddleocr import PaddleOCR

    ocr = PaddleOCR(
        lang=args.lang,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device=args.device,
    )
    if args.server:
        for line in sys.stdin:
            image = line.strip()
            if not image:
                continue
            try:
                payload = extract(ocr, image)
            except Exception as e:
                payload = {"status": "FAILED", "error": f"{type(e).__name__}: {e}"}
            print("@@PADDLE@@" + json.dumps(payload, ensure_ascii=False), flush=True)
        return 0

    if not args.image:
        ap.error("image is required unless --server is used")
    print(json.dumps(extract(ocr, args.image), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
