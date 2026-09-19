# Multimodal Question Understanding

## Goal

Move from screenshot/OCR based questions to structured mathematical questions.

Pipeline:

PDF page

-> layout detection

-> text extraction

-> figure/table detection

-> visual understanding

-> Question IR

-> translation and explanation

## Principles

- Images are data, not decoration.
- Diagrams must be represented structurally.
- Numbers and relationships inside figures must be extracted.
- Translation happens after understanding.

## Target output

```json
{
  "problem_type": "geometry",
  "text": {
    "en": "",
    "zh": ""
  },
  "visual": {
    "objects": []
  },
  "reasoning": []
}
```
