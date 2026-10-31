# SOCTHINK Rust Business Core · R1 Resource Catalog

**Status: R2 engineering candidate only. NOT routed to production.**

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

## R2 event-driven atomic reload (code implemented, production cutover pending)

The Rust process now holds exactly one shared searchable index. On `SIGHUP`,
it parses and validates the new file **before** swapping a single `Arc` under
a short write lock. Concurrent GET responses see either the old complete
snapshot or the new complete snapshot. An invalid, missing or **empty** catalog
is rejected; the old index remains available. There is no background polling,
no duplicate question store and no write endpoint.

The new exporter `scripts/publish_training_resource_snapshot.ts` invokes the
existing TS training-readiness gate and atomically publishes *only* allowlisted
metadata. It requires an absolute `SOCTHINK_CATALOG_SNAPSHOT` output path,
writes a same-directory temporary file with mode 0600, fsyncs the data and
directory, and renames it into place. The console receipt includes a SHA-256
of the published metadata snapshot, not any user or payment information.

On a configured **internal** Rust service, the content-promotion event does:

```bash
# Illustration: run in the authorized server application directory, with
# an absolute private snapshot location and the project tsx tool installed.
SOCTHINK_CATALOG_SNAPSHOT=/private/socthink/catalog.json   npx tsx scripts/publish_training_resource_snapshot.ts
# Only after successful publishing, notify the existing Rust service manager:
systemctl kill --signal=HUP --kill-who=main socthink-catalog.service
```

The service name above is a *planned* activation contract; **R2 has NOT
installed or enabled a systemd unit**, and Next.js continues serving the
production catalog. Integrate this event with the existing authorized data
promotion transaction at actual cutover, rather than scheduling new polling
or maintaining two independent production search systems.

Regression tests:
- `cargo test --locked`: schema, query, validation and last-good retention.
- `cargo clippy --locked --all-targets -- -D warnings`.
- `npx tsx scripts/test_catalog_snapshot_atomic.ts`: 0600, atomicity,
  duplicate/empty rejection, cleanup.
- `cargo build --locked` and
  `python3 scripts/test_rust_catalog_hot_reload.py`: live HTTP 2→3,
  SIGHUP signal, two invalid updates rejected without downtime.

Only an approved single-path migration with exact production/rollback
receipts may switch the Next.js resource page to Rust.

## R3 compatibility build artifact (not production activation)

The existing Rust-only GitHub Actions workflow now uses the explicit
`ubuntu-24.04` runner (glibc 2.39 ABI generation), compiles a **release**
`socthink-catalog-api` candidate, then checks its x86-64 ELF header,
required GLIBC symbol versions (must be <=2.39), dynamic loader and linked
libraries. It publishes the checked binary with an SHA-256 digest and source
Git commit as a short-retention CI artifact.

This avoids copying Z890's glibc 2.43 dynamic binary onto the production
server, which runs glibc 2.39. It does not install Rust/Cargo on production,
change Web routing, start a second long-running daemon, or alter the existing
immutable Next.js auto-deploy and rollback process.

The artifact is **only a candidate**. A subsequent R3 step must run the
exact artifact inside an isolated loopback production-host test against a
public-metadata-only snapshot, verify compatibility and real query parity,
then integrate one Rust Core service with the existing atomic release and
rollback transaction. No production Rust traffic should be claimed until
that actual promotion receives an exact-SHA public receipt.
