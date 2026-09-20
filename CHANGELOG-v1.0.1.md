# v1.0.1

Release date: 2026-09-20

## Student-facing fixes

- Chinese is now the default exam language for every student-ready paper.
- Raw English-only papers are no longer treated as student-ready merely because an English source exists.
- Student-facing papers must have a Chinese delivery path and an English delivery path.
- Smart AMC 8 selection is restricted to the bilingual-ready source pool.
- English-only source papers remain in the local corpus for localization; they are not deleted.

## Question-image fixes

- Added a delivery-quality audit for language coverage, missing assets, suspicious crop geometry and likely missing answer options.
- Fixed Austria, Germany and Portugal crop generators to choose canonical question starts first, then calculate question boundaries.
- Added a conservative crop-repair tool for legacy images with evidence-backed truncation.
- Added a translation/localization queue builder for missing Chinese questions.

## Release reliability fixes

- Local release smoke tests now use a verified free port and fail if the launched release candidate exits.
- Rollback restores release metadata together with code.
- The public release endpoint now reports both deployedSha and the actual production gitSha.
- Public deployment verification requires both SHA values to match GitHub main.

## Audit snapshot

Corpus at this release:

- 369 exam bundles
- 9,643 questions
- 3,040 questions currently Chinese/English student-ready
- 6,603 questions queued for Chinese localization
- 3,072 legacy English-source questions previously marked student-ready by metadata
- 39 legacy crops with strong evidence that options/content may have been cut

The legacy English/crop defects are retained as source material but blocked from student delivery until they pass localization and visual QA.
