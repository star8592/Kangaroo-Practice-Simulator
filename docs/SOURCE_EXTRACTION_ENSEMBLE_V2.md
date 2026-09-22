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

## Smoke test

```bash
python3 scripts/source_extraction_ensemble_v2.py \
  --exam-id pt-2008-benjamim \
  --question-no 2 \
  --mineru \
  --mineru-tier standard
```

The output is private evidence under `private/source-extraction-v2/`.

A status of `FIELD_CONSENSUS_NATIVE_OCR` means an independent OCR engine and a native-PDF extraction agree on all critical structured fields even if headers, whitespace, or layout differ. It is still not an automatic `SOURCE_VERIFIED` decision.
