# Native PDF Pipeline

## Principle

Competition PDFs should be treated as structured digital documents first, not images.

Processing priority:

1. Native PDF text extraction
2. Layout reconstruction
3. Mathematical object recovery
4. Embedded image extraction
5. OCR fallback only when required

## Pipeline

```
PDF
 |
 +-- text layer
 |
 +-- font/symbol information
 |
 +-- coordinates/layout
 |
 +-- embedded figures
 |
 v
Question IR
 |
 v
Translation + Solution Generation
```

## Question IR goals

A question should preserve:

- original English text
- Chinese translation
- formulas
- figures
- tables
- answer choices
- reasoning structure

Example:

```json
{
  "source": {
    "type": "pdf_native",
    "page": 1
  },
  "content": {
    "en": "",
    "zh": ""
  },
  "visual": {},
  "math": {}
}
```

OCR remains a fallback path for scanned documents only.
