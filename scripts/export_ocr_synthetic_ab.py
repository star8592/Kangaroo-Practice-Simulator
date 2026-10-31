#!/usr/bin/env python3
"""Publish only sanitized metrics from an internal, self-authored OCR pilot."""
import hashlib, json, os
from pathlib import Path
from evaluate_ocr_engines import analyze, read_jsonl

project=Path(__file__).resolve().parents[1]
root=Path(os.environ["SOCTHINK_OCR_BENCH_ROOT"]).expanduser().resolve(strict=True)
gold=read_jsonl(root/"gold.jsonl")
pred=read_jsonl(root/"paired_predictions.jsonl")
if len(gold)!=4 or len({x["id"] for x in gold})!=4:
    raise AssertionError("The pilot requires exactly four synthetic fixtures")
allowed={"Qwen3-VL8B_Ollama_local","RapidOCR3.10_PP-OCRv6-small_CPU"}
if {x["engine"] for x in pred}!=allowed:
    raise AssertionError("Do not silently change the compared engines")
metrics=analyze(gold,pred)
for _,v in metrics["engines"].items():
    assert v["samples"]==4 and v["coverage"]==1.0
items=[]
for x in gold:
    file=(root/(x["id"]+".png")).resolve(strict=True)
    if not file.is_relative_to(root):raise AssertionError("Unsafe fixture path")
    items.append({
        "id":x["id"],"category":x["category"],
        "imageSha256":hashlib.sha256(file.read_bytes()).hexdigest(),
        "goldLabelHumanReviewed":x.get("human_reviewed",False),
        "sourceType":"self_created_synthetic_test_image",
        "originalExam":False
    })
out={
    "schemaVersion":1,
    "date":"2026-10-31",
    "pilotType":"controlled synthetic image pairwise OCR sanity check, NOT representative examination-page benchmark",
    "sampleCount":4,
    "referenceGoldSource":"Human-authored self-created fixture text; checked against rendered image",
    "imageEvidence":items,
    "models":{
        "RapidOCR3.10_PP-OCRv6-small_CPU":{"runtime":"ONNX Runtime 1.31.1 / CPU","declaredModel":"PP-OCRv6 small"},
        "Qwen3-VL8B_Ollama_local":{"runtime":"Ollama local / RTX 5070 Ti","declaredModel":"qwen3-vl:8b"}
    },
    "results":metrics["engines"],
    "interpretation":{
        "qwenIncompleteLowResScreenshot":True,
        "qwenMissingOriginalContent":"Low-resolution sample truncated after second item; later questions omitted",
        "numericSequenceMiss":"Qwen output for low-resolution sample differed from the reference",
        "rapidOCRFullWidthBracketDifference":"Some full-width source brackets became ASCII half-width; normalized equivalently",
        "latexNotationDifference":"Qwen3-VL rewrote numeric fractions and radicals in LaTeX; limited notation-equivalent normalization was applied",
        "latencyCaveat":"Rapid had 4 timed CPU calls in one process; Qwen had 3 timed local GPU calls, first prior result with unknown latency; timings are not hardware/initialization matched",
        "generalization":"No engine can be declared best for real exams from four clean/controlled synthetic images"
    },
    "dataPrivacy":"Original fixture images and full model transcripts remain only in Z890 private archive. This index contains no private absolute paths, raw screenshot bytes, credentials, or third-party documents."
}
dest=project/"data/discovery/ocr-synthetic-ab-20261031.json"
dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("OCR_AB_SYNTHETIC_EXPORTED",out["sampleCount"])
for engine,r in out["results"].items():
    timed=len([x for x in pred if x["engine"]==engine and isinstance(x.get("latency_ms"),(int,float))])
    print("ENGINE",engine,"canonical_CER",round(100*r["math_canonical_cer"],2),
          "numeric_exact",r["math_canonical_numeric_exact_rate"],
          "latency_samples",timed)
