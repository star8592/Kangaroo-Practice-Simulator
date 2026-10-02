# Verified Math Pilot — Initial Report

Date: 2026-10-02

## Environment

- Lean: 4.34.1 stable
- Mathlib: v4.34.1 pinned
- Lake: 5.0.0
- Local `lake build`: PASS
- Smoke fixture: PASS

## Real AMC verification

Three complete AMC 10A 2022 problems have been formalized as the first real fixture:

- Q2 — constant-rate arithmetic / rational approximation: PASS
- Q3 — linear system and absolute difference: PASS
- Q8 — integer mean-condition case split: PASS

During Q3 formalization Lean rejected an incorrect intermediate sign (`a-b = 5`). The correct relation is `a-b = -5`; after correction the theorem passed. This is evidence that the verifier is acting as an independent correctness gate rather than merely recording AI output.

## Corpus readiness audit

The repository currently contains 42 `maa-amc*.json` exam files with 704 question records.
After rejecting empty/placeholder stems, only 30 records currently have sufficiently complete English text for direct formalization.

Current eligible-domain heuristic:

- Algebra: 27
- Number theory: 2
- Combinatorics: 1
- Geometry: 0

This is now treated as a data-quality gate. Placeholder records will not be labeled verified and will not enter the Lean queue until their source text is restored.

## Next acceptance targets

1. Restore enough complete AMC/AIME statements to reach a 100-problem pilot corpus.
2. Formalize at least 25 problems before evaluating automation rates.
3. Record first-pass proof success, repair count, unsupported count, and verification latency.
4. Only surface `Formally Verified` to students when an exact stored theorem has passed the pinned verifier.

## 2026-10-02 Batch 2

- Added 6 passing Lean proofs: AMC10A Q4/Q6/Q7/Q16 and AMC8 2024 Q1/Q3.
- Cumulative passing proof fixtures: 9 problems.
- Tightened placeholder filtering; image-only prompts are no longer counted as complete stems.
- Added `--exams-dir` so private local question banks can generate manifests without being required in CI.
