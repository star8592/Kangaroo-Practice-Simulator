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

`level-a` remains only as a backward-compatible identifier and maps to the verified Australian AMC Pre-A sample bundle. New ingestion must use competition-specific pipelines such as `scripts/import_amc_pre_a.py`; the deprecated generic Level-A importer has been removed.

Student identity and attempt data are server-side. Browser storage is limited to transient exam UI state and legacy-resume compatibility; the server remains authoritative for authenticated users, grading, analytics, reports, and training history.

## Production flow

Normal production publication is `main` → GitHub CI → the production server pull-based deployer → `/api/release` receipt verification. Manual `ops/release/publish_socthink.sh` is the source-based recovery path. `ops/release/publish_prebuilt_socthink.sh` is the immutable prebuilt-runtime alternative for constrained production hosts.

See `ops/release/SOCTHINK_DEPLOYMENT.md` for the full production SOP.

## Student profile flow

`src/lib/student-analytics.ts` is the single student-profile implementation. It reads authoritative exam attempts and arithmetic sessions directly, then produces the evidence, confidence, trends and next-step recommendations used by student/admin surfaces. There is no parallel profile event framework.

```text
exam attempts ──┐
                ├─> student analytics ─> student/admin profile + training recommendations
arithmetic ─────┘
```

When a future source such as solution-interaction telemetry becomes real persisted product data, it should be integrated into this same analytics boundary rather than introducing a second profile architecture.

## v1 convergence rule

The core architecture is considered converged: login, exam, arithmetic, report, admin, profile and production-release flows are implemented and covered by the public quality gate. From here:

- existing API compatibility is preserved unless a deliberate migration is documented;
- new competitions are data/ingestion extensions, not new application architectures;
- new training modes extend an existing domain instead of creating parallel analytics stacks;
- duplicated deployment, reporting, profile or compatibility layers should be removed rather than maintained in parallel.
