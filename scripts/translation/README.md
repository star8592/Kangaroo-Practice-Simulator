# AI Math Translation Pipeline

## Goal

Ensure Chinese mode never silently falls back to English questions.

## Workflow

1. Scan question bank language coverage.
2. Create translation jobs for missing `localized.zh` fields.
3. Translate using the math competition translation prompt.
4. Validate numbers, formulas, choices, and meaning.
5. Mark questions as reviewed before exam release.

## Output

- language-status report
- translation queue
- bilingual question records

## Translation rules

- Keep mathematical meaning unchanged.
- Preserve LaTeX formulas.
- Use standardized Chinese math terminology.
- Keep official English source available.
