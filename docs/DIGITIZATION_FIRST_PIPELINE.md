# Digitization-First Question Pipeline

## Non-negotiable rule
Translation is downstream of source digitization. No question may enter translation until its source record is independently verified against the authoritative paper/page/image.

## Stage 1 — Source digitization (language-preserving)
For every question store, without translation:
- examId, questionNo, sourceLanguage
- authoritative source file + page number + stable archive path
- exact source stem
- exact choices A–E, including formulas/units
- answer key when authoritative
- diagrams/images and question crop
- structured math (Unicode/LaTeX) where needed
- extraction method: native_text / html / OCR / vision / manual_reconstruction
- verification evidence and status

Statuses:
- RAW: source located only
- EXTRACTED: machine extraction exists
- NEEDS_SOURCE_REVIEW: any ambiguity, missing formula/choice/image
- SOURCE_VERIFIED: source text/options/assets checked against authoritative source

SOURCE_VERIFIED is the only translation input.

### Stage-1 hard gates
Fail closed on: missing numbers; changed numbers; lost fractions/exponents/roots; option mismatch; missing units; suspicious OCR; question-boundary contamination; visual dependency without crop; unsupported reconstruction.

OCR/model output is evidence, never authority. When native PDF text and page image disagree, page rendering/original scan wins.

## Stage 2 — Translation
Input: SOURCE_VERIFIED records only.
Output: Chinese + retained source-language text.

Translation gates:
1. preserve every number/formula/unit/proper noun/choice relation;
2. no solving, guessing, adding omitted information, or rewriting mathematics;
3. independent deterministic equivalence checks;
4. semantic review against SOURCE_VERIFIED source;
5. answer/solution cross-check where available;
6. visual questions checked with original diagram.

Statuses: TRANSLATION_DRAFT -> TRANSLATION_VERIFIED -> STUDENT_READY.

## Migration rule for current corpus
All existing machine translations are treated as untrusted downstream drafts. They must not be used to repair source text. First rebuild and verify the complete source-language bank, then translate from that frozen verified bank.
