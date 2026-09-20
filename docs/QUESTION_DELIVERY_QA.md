# Student Question Delivery QA

This document defines the release gate for question language and visual completeness.

## Hard product rule

The student product supports two delivery languages:

1. Chinese (default)
2. English (optional switch)

A source paper may be English, Portuguese, German or another language, but a source language is not automatically a student delivery language.

A question is not student-ready merely because the source is readable in English.

## Student-ready language gate

A released question must have:

- a Chinese delivery path;
- an English delivery path;
- stable answer/choice mapping;
- no explicit review failure;
- required visual assets.

For localized non-bilingual source papers it additionally requires:

- examReady=true;
- localized.zh.stem;
- localized.en.stem;
- review.translationStatus=reviewed;
- review.visualVerified=true;
- review.needsReview != true.

Official bilingual source images may be delivered as a common bilingual visual where the image itself contains both Chinese and English.

## UI rule

The exam client always starts in Chinese.

The language switch changes only presentation language. It must never silently use English as the fallback for missing Chinese content.

If a paper has no Chinese student delivery, the paper is not listed/opened as student-ready.

## Visual completeness rule

Question image boundaries must be determined from canonical question starts:

source PDF
→ identify candidate starts
→ choose one canonical start for Q1, Q2, Q3 ...
→ calculate Qn bottom from canonical Q(n+1)
→ render
→ audit

Do not calculate the bottom edge from arbitrary number-like lines before canonical deduplication. A number inside a problem can otherwise be mistaken for the next question and cut away the rest of the stem, diagram or choices.

## Automated audit

Run:

~~~bash
python3 scripts/audit_question_delivery.py --json
~~~

The audit reports:

- missing Chinese delivery;
- English-source questions without Chinese delivery;
- legacy metadata that incorrectly marks English-only material student-ready;
- missing assets;
- suspicious image dimensions;
- canonical crop gaps;
- likely-cut multiple-choice options.

Build the localization queue:

~~~bash
python3 scripts/translation/build_queue.py
~~~

Dry-run legacy crop repairs:

~~~bash
.venv-tools/bin/python scripts/repair_question_crops.py
~~~

Apply only after inspecting the proposed set:

~~~bash
.venv-tools/bin/python scripts/repair_question_crops.py --apply
~~~

## Release policy

Bad source material is not deleted.

It stays in the private corpus and is moved through:

source
→ localization queue
→ Chinese/English translation
→ visual classification
→ crop/overlay repair where necessary
→ automatic consistency checks
→ review
→ student-ready

This lets the corpus grow without lowering the quality of the student-facing site.

## v1.0.1 baseline

The v1.0.1 audit measured:

~~~text
bundles                         369
questions                       9643
Chinese/English student-ready   3040
missing Chinese                 6603
English source without Chinese  3072
strong likely-cut crop defects  39
missing assets                  0
~~~

The student delivery gate blocks the English-only legacy set while the localization backlog is repaired.
