# Architecture

The project is a local-first competition training engine. Public application code is versioned in Git; source archives, normalized exam bundles, generated solution media, student records, and other runtime datasets are kept outside the public code history.

```text
Official / user-owned source archives
   ↓ competition-specific ingestion + verification scripts
private/exams/*.json + private/solutions/*.json      (gitignored runtime data)
public/local-assets/* + public/generated-solutions/* (gitignored runtime media)
   ↓ server-only loaders and authorization
Next.js application
   ├─ GET  /api/exams/[examId]       authenticated training payload, answers removed
   ├─ POST /api/grade                server-side grading + attempt persistence
   ├─ GET  /report/[attemptId]       authenticated HTML diagnostic report
   ├─ GET  /api/reports/[attemptId]/pdf
   ├─ GET  /student                  unified student learning profile
   └─ GET  /admin/questions          teacher/admin review surface
```

`level-a` remains only as a backward-compatible identifier and maps to the verified Australian AMC Pre-A sample bundle. New ingestion must use the competition-specific pipelines (for example `scripts/import_amc_pre_a.py`) rather than `scripts/import_level_a.py`.

Student identity and attempt data are server-side. Browser storage is limited to transient exam UI state and legacy-resume compatibility; the server remains authoritative for authenticated users, grading, analytics, reports, and training history.

## Production flow

Normal production publication is `main` → GitHub CI → the production server pull-based deployer → `/api/release` receipt verification. Manual `ops/release/publish_socthink.sh` is the source-based recovery path. `ops/release/publish_prebuilt_socthink.sh` is the immutable prebuilt-runtime alternative for constrained production hosts.

See `ops/release/SOCTHINK_DEPLOYMENT.md` for the full production SOP.
