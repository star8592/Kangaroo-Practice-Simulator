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
## Verification provenance hardening

The verifier now records proof provenance rather than only a PASS/FAIL bit:

- SHA-256 of the exact Lean proof source
- pinned Lean toolchain
- exact Mathlib git revision
- verifier repository revision
- verification duration and UTC timestamp

This allows a public verification badge to be invalidated when its proof source changes. The bootstrap script also now installs the exact project toolchain from `lean-toolchain`; it no longer falls back to the moving `mathlib4:lean-toolchain` initializer.
## Batch 3

- AMC 10A 2022 Q20 — arithmetic + geometric sequence reconstruction: PASS
- The first nonlinear proof attempt was rejected for CI use because it was too slow. The accepted proof reduces the system to `b(r-1)^2 = 28`, derives a finite integer range from positivity, and closes the cases with `omega`.
- Cumulative real contest problems formally verified: **10**.

The AMC 10A 2022 source PDF was also tested with the audited recovery utility: all 25 problem blocks were recovered from the native text layer, and 10 were conservatively flagged for visual review because PDF text extraction damaged mathematical symbols.


## Batch 4 — 2022 AMC 10A

Six additional real problems passed the pinned Lean verifier: Q10, Q12, Q17, Q18, Q19, and Q24.
Cumulative real AMC coverage is now **16 verified problems**.

Q24 is a useful verification-gate example: an earlier draft encoded the answer as 500, while the official solution and exact finite enumeration establish 1296. The incorrect draft was not promoted into the verified set.

Batch 4 verification time is about 4 seconds locally, so these proofs are suitable for CI.
