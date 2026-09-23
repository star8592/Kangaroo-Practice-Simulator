# A4 Arithmetic Personalization — Acceptance Contract

## Goal

Paper worksheets are driven by the authenticated student's arithmetic model, with explicit fallback when evidence is insufficient.

## Acceptance criteria

- Default mode is 智能个性化.
- Only sessions bound to the logged-in student's studentId may drive personalization.
- Missing or insufficient evidence must never be presented as a diagnosed weakness.
- A 40-question smart sheet with stable weakness evidence targets 24 repair + 10 consolidation + 6 broad review.
- Teacher manual mode produces 100% of the selected skill.
- Grade-comprehensive mode ignores personal weakness weighting.
- Same student + grade + seed reproduces the same worksheet.
- Printed paper states the evidence basis and actual mix.
- Default batch is 5 exercise sheets plus 5 answer sheets.
- Production route requires authentication.
- Unit regression: npm run test:arithmetic-print.
- Live integration: BASE_URL=... npm run test:arithmetic-print-live.

## Data rule

Legacy arithmetic sessions without studentId are not silently assigned to a real student. New sessions must carry the authenticated student's ID. This prevents cross-student personalization.