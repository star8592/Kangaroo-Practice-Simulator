# SEAMO original practice: revised release contract (2026-10-21)

## Why this revision exists

The first published independent SEAMO G1/G2 foundational practice sets had repeated question stems. The original question IDs and bundles are immutable to preserve historical attempts, scoring and review. The new student catalogue must list only `seamo-original-g1-revised-1` and `seamo-original-g2-revised-1`. Direct loading of the two original `*-mock-1` IDs must remain possible for historical review.

These are independent **foundational practice** questions, not official SEAMO past papers, official mock exams or official scoring. They are not yet a verified competition-difficulty simulation.

## Release checks

- `npm run test:seamo` must validate both original and revised bundles, distinct stems, choice/integer formats, bilingual explanation, grading, public answer-key redaction, no-private-archive loading, historical ID compatibility and the 80-track audio manifest.
- `npm run verify:public` must pass; desktop and mobile Chromium E2E must both pass on isolated synthetic users.
- The production version SHA must match the released Git commit; verify the apex `https://socthink.cn/competitions?c=seamo` and revised exam URLs. Never use HTTP 200 alone as evidence of student readiness.
- The `www.socthink.cn` hostname currently serves different content and must be treated as a separate unresolved routing issue until verified.

## Audio and miniapp

`npx tsx scripts/prepare_seamo_readaloud.ts` creates `reports/seamo-readaloud-worklist.json` for the revised 40 questions (40 Chinese + 40 English tracks). This is a **manifest**, not playable audio. Generate audio with `scripts/render_exam_readaloud.py --worklist reports/seamo-readaloud-worklist.json` only after GPU/voice resources are available; audit it with `scripts/audit_exam_readaloud_assets.py --worklist reports/seamo-readaloud-worklist.json --strict`.

Do **not** use the existing all-exams audio release script with only this 80-track subset: its deployment swaps the entire audio directory and could delete other competitions' recordings. A safe additive merge or complete verified corpus is required before publishing MP3s. The native miniapp SEAMO route remains disabled until audio availability, practice timer and device-level acceptance are proven; its existing Web-link fallback is not equivalent to native delivery.
