# Lean Verification Roadmap

## Goal
Build a zero-intrusion verification layer for competition mathematics. Student-facing explanations remain natural language; Lean 4 + Mathlib acts as a backend proof checker for suitable problems.

## Phase 0 — Scope
Initial corpus: 100 problems from AMC/AIME and secondary-school algebra/number theory.

Verification classes:
- deterministic: arithmetic / exact rational computation
- symbolic: algebraic simplification and CAS cross-checks
- lean: theorem-level verification with Lean 4 + Mathlib
- human_reviewed: manually validated when formalization is not yet economical

## Phase 1 — Prototype
Input -> normalized statement -> formalization -> Lean proof -> verification manifest -> student explanation.

Do not expose Lean syntax to children by default.

## Phase 2 — Verified hints
Use formal subgoals/proof states to create concise progressive hints instead of generic LLM advice.

## Phase 3 — Verified variants
Generate parameterized variants, solve them, verify them, then publish only verified instances.

## Data contract
Each solution may carry:
- verification.status: verified | failed | unsupported | pending
- verification.method: deterministic | symbolic | lean | human_reviewed
- verification.statement
- verification.proofPath
- verification.leanVersion
- verification.mathlibRevision
- verification.checkedAt
- verification.failureReason

## Initial KPI
For the 100-problem pilot measure:
- formalization rate
- Lean verification pass rate
- auto-repair recovery rate
- median verification time
- failure taxonomy

## Product positioning
The verifier is infrastructure, not a separate contest. International-facing messaging may use “machine-verified mathematics” only where the published item really passed the recorded verifier.
