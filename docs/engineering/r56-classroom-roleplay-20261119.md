R56 roleplay speaker labels

- Speaker labels are teacher-reviewed display metadata, never appended to the scorer target.
- Additive DB column accent.class_assignment_items.speaker_label varchar(24), default NULL; existing FORCE RLS preserved.
- Assignment POST accepts speaker_labels array with sentence_ids order. Missing list means all labels NULL. Student homework responses include speaker display label.
- Release order: production PG backup and additive migration, native Next.js backend deploy, AccentLab frontend deploy. Do not reverse order.
- Isolated checks: scripts/test_classroom_roleplay_schema.sh (PG18 migrations/RLS/idempotency), scripts/test_classroom_roleplay_validation.ts (input validation), scripts/test_classroom_roleplay_owner_e2e.ts (5 student actual OpenPronounce score, report, privacy checks and teacher feedback).
- Existing teacher approval test harness is blocked by an unconfigured external platform-grants DB; the isolated integration test uses owner as teacher while exercising real student flows and Postgres.
- No production release claim until migration, backend, frontend and health/rollback receipts are confirmed.
