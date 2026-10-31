#!/usr/bin/env python3
"""Safety and numerical sanity checks of published synthetic OCR pilot metrics."""
from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/"data/discovery/ocr-synthetic-ab-20261031.json"
data=json.loads(p.read_text(encoding="utf8"))
assert data["sampleCount"]==len(data["imageEvidence"])==4
assert all(x["sourceType"]=="self_created_synthetic_test_image" for x in data["imageEvidence"])
assert all(x["goldLabelHumanReviewed"] is True and len(x["imageSha256"])==64 for x in data["imageEvidence"])
assert set(data["results"])=={"Qwen3-VL8B_Ollama_local","RapidOCR3.10_PP-OCRv6-small_CPU"}
assert all(r["coverage"]==1.0 and r["samples"]==4 for r in data["results"].values())
assert data["results"]["RapidOCR3.10_PP-OCRv6-small_CPU"]["math_canonical_cer"]==0
assert data["results"]["RapidOCR3.10_PP-OCRv6-small_CPU"]["math_canonical_numeric_exact_rate"]==1
assert data["results"]["Qwen3-VL8B_Ollama_local"]["math_canonical_cer"]>0.09
assert data["interpretation"]["qwenIncompleteLowResScreenshot"] is True
assert all(0<=r["math_canonical_cer"]<=1 for r in data["results"].values())
assert "/mnt/disk1" not in json.dumps(data)
print("OCR_SYNTHETIC_AB_PRIVATE_DATA_EXCLUDED=PASS",data["sampleCount"])
