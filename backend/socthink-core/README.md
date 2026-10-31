# SOCTHINK Rust Business Core · R1 Resource Catalog

**Status: engineering candidate only. NOT deployed.**

The existing Next.js production catalog and training-readiness gate remain authoritative.
This read-only Rust Axum module is a *migration target* for catalog search, not a
parallel sellable product, alternative login, exam engine or payment gateway.

## Data flow

1. Existing `listTrainingExamProfiles()` enforces question-level training readiness.
2. Existing `buildTrainingResourceCatalog()` strips private question/source/rights data.
3. `scripts/export_training_resource_catalog.ts` serializes only a public metadata snapshot.
4. Rust validates exact schema, IDs, paper types, exam links, duplicates and version.
5. Rust serves **loopback-only**, capped, paginated read-only search results.
6. When R1 earns parity and production acceptance, Next.js may consume the Rust
   endpoint through the *existing* server boundary and old duplicate query code
   will be deleted. This stage deliberately does not switch production traffic.

This dataset is **training-ready**, NOT commercially licensed inventory.

## Build and tests

```bash
RUSTC_WRAPPER= cargo test --locked --manifest-path backend/socthink-core/Cargo.toml
npx tsx scripts/test_rust_catalog_snapshot.ts
```

For a **local synthetic fixture only**:

```bash
SOCTHINK_CATALOG_SNAPSHOT=backend/socthink-core/tests/fixtures/catalog.json \
  RUSTC_WRAPPER= cargo run --locked --manifest-path backend/socthink-core/Cargo.toml --bin socthink-catalog-api
curl -fsS 'http://127.0.0.1:37871/v1/catalog/resources?query=AMC&gradeBand=5-6&limit=20'
```

The server refuses a non-loopback bind or missing snapshot and has no CORS
or write endpoints. Any future production call needs internal-only routing,
snapshot refresh/reconciliation, error monitoring, timeout budget and rollback.


## Full-inventory acceptance, 2026-10-31 (local only)

The locally stored archive had 419 JSON exam files. The **existing**
`listTrainingExamProfiles()` gate, including eligible synthetic mixed
profiles and bundled originals, exported **450 public metadata rows**.
The Rust R1 service read those rows without a separate question bank.
The `scripts/test_rust_catalog_live_parity.ts` script compared every
result, order, page and total against `filterTrainingResources()` for
**79 separate filter combinations**, with a PASS result.

Run only on an isolated, private machine with read-only access to the
original archive; do **not** commit the generated metadata snapshot:

```bash
# From the project root that holds the authorized private/exams archive:
# TSX_TSCONFIG_PATH must point to the worktree tsconfig to resolve @/data.
TSX_TSCONFIG_PATH=/path/to/worktree/tsconfig.json   /path/to/worktree/node_modules/.bin/tsx   /path/to/worktree/scripts/export_training_resource_catalog.ts > /secure/catalog.json
# Launch the temporary loopback-only Rust service with that file.
SOCTHINK_CATALOG_SNAPSHOT=/secure/catalog.json   SOCTHINK_RUST_CATALOG_TEST_URL=http://127.0.0.1:37872   npx tsx scripts/test_rust_catalog_live_parity.ts
```

This proves parity for the tested inventory, not a guarantee of production
performance, commercial rights, up-to-date source legitimacy or authorization.
