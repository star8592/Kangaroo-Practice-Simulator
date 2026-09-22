# Source Extraction Ensemble v2

Stage 1 source digitization uses digital-native evidence before OCR. OCR output is evidence, never authority by itself.

## Evidence order

1. Native HTML/DOM, PDF text/bbox/vector objects, OOXML, SVG, embedded images.
2. Frozen full-page and question-region renders with SHA-256.
3. Independent OCR/document engines.
4. Field-level comparison for numbers, operators, fractions, powers, units, and A-E choices.
5. Visual/model review only for conflicts.
6. Promotion to `SOURCE_VERIFIED` happens in a separate verifier.

## Local engines

The current local stack is:

- Poppler layout text
- Poppler raw text
- Poppler bbox word stream
- MinerU 4.x OCR/VLM
- PaddleOCR 3.x / PaddleOCR-VL environment (optional adapter)

Install the isolated OCR environments:

```bash
scripts/setup_source_extraction_v2.sh
```

The setup does not install packages into the project Python environment. MinerU is an isolated `uv tool`; PaddleOCR lives under `/mnt/disk1/Tools/ocr/paddleocr-vl/.venv` by default.

On the RTX 5070 Ti / Blackwell host, PaddlePaddle 3.4.0 with the CUDA 13.0 wheel is verified on sm_120 and PP-OCRv6 can run on `gpu:0`. PaddleOCR remains isolated from the project Python environment. MinerU is a separate OCR/VLM path.

## Smoke test

```bash
python3 scripts/source_extraction_ensemble_v2.py \
  --exam-id pt-2008-benjamim \
  --question-no 2 \
  --mineru \
  --mineru-tier standard \
  --paddleocr \
  --paddle-device gpu:0
```

The output is private evidence under `private/source-extraction-v2/`.

A status of `FIELD_CONSENSUS_NATIVE_OCR` means an independent OCR engine and a native-PDF extraction agree on all critical structured fields even if headers, whitespace, or layout differ. It is still not an automatic `SOURCE_VERIFIED` decision.

## Recommended two-tier routing

Do not run the VLM tier over every unresolved question. Use PP-OCRv6 as the fast independent OCR pass, then escalate only unresolved ensemble states to MinerU Standard:

```bash
# Tier 1: fast native PDF + PP-OCRv6
python3 scripts/source_extraction_ensemble_v2.py \
  --only-unverified --source-origin existing_ocr --exam-prefix pt- \
  --limit 500 --paddleocr --paddle-device gpu:0
python3 scripts/verify_source_ensemble_v2.py
python3 scripts/audit_source_digitization.py

# Tier 2: expensive VLM only for unresolved prior states
python3 scripts/source_extraction_ensemble_v2.py \
  --only-unverified --source-origin existing_ocr --exam-prefix pt- \
  --prior-consensus ENGINE_CONFLICT,FIELD_CONSENSUS_NATIVE_OCR,NATIVE_ONLY_TEXT_CONSENSUS,OCR_ONLY_TEXT_CONSENSUS \
  --limit 100 --mineru --mineru-tier standard --paddleocr --paddle-device gpu:0
```

`--prior-consensus` deliberately reprocesses records already present in the ensemble index while still respecting the Stage-1 `SOURCE_VERIFIED` gate. This prevents expensive VLM work from being wasted on easy questions.


## Local GPU validation

On the current RTX 5070 Ti (sm_120), PaddlePaddle 3.4.0 + CUDA 13.0 successfully executes tensors on `gpu:0`. A warm PP-OCRv6 worker processed the Q2 smoke image in about 0.067 s per repeated inference after model initialization. This is the preferred fast-pass backend on this host.
