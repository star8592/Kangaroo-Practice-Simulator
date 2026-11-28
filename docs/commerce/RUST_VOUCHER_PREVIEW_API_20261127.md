# Rust-owned channel voucher preview API — 2026-11-27

## Decision

The channel voucher preview is implemented in the Rust core, not as new Next.js Route Handlers. Next.js provides the pages and same-origin transport rewrites only. PostgreSQL remains the single entitlement and payment ledger.

## Internal endpoints

- GET /api/platform/admin/commerce — site-owner-only read view; never returns voucher codes or lookup digests.
- GET /api/platform/billing/exam-access — current signed-in WeChat account's Wuhan 2027 paper scope and scored-attempt balance.
- POST /api/platform/billing/redeem — validates same-origin activation, derives a one-way lookup digest and atomically claims the external-channel voucher.
- GET /healthz — process health only.

The Rust service binds loopback only at 127.0.0.1:37872. In local development only, when SOCTHINK_VOUCHER_PREVIEW=1 and NODE_ENV is not production, Next rewrites the three application paths to this service; production builds emit no such rewrites. The server-rendered admin page uses the same loopback service and forwards the existing parent session cookie. No new Next API handler is permitted.

## Identity and security

- Session verification matches the existing socthink_parent_session HMAC token format and checks the current parents.json active flag and session version.
- Site-owner access is verified against the existing site-owner-binding.json; no role or identity record is created or modified.
- Identity files are read only. No second account store is introduced.
- Redemption requires the exact configured Origin, rejects Sec-Fetch-Site: cross-site, caps the request body at 256 bytes, and validates the preview code format.
- Voucher lookup HMAC is domain-separated with the soc-voucher-lookup null-byte prefix and the raw activation code is never stored or returned.
- The preview service refuses NODE_ENV=production, non-loopback database/origin URLs, non-_ci database names, a missing preview flag, and malformed lookup keys.

## Verification

The script scripts/test_rust_voucher_api.sh runs against a temporary PostgreSQL 18 cluster by default, or an explicitly isolated localhost *_ci database when SOCTHINK_BILLING_TEST_ISOLATED=1.

The integration contract covers:
- unauthenticated and non-owner rejection;
- owner-only admin overview;
- no entitlement before activation;
- CSRF/origin and malformed-code rejection;
- idempotent same-account activation;
- cross-account claim rejection;
- exact paper and scored-attempt access after activation;
- refund revocation and refusal to reactivate;
- absence of raw voucher codes and lookup digests from admin output.

The Rust-specific CI workflow runs this integration contract against its isolated PostgreSQL service.

## Release status

PREVIEW IMPLEMENTATION ONLY. NOT A PRODUCTION RELEASE. The SQL remains under ops/db/drafts/; no draft migration has been applied to the production database, no production systemd unit has been enabled, no public proxy has been switched, no real payment receipt has been accepted, and no live voucher has been issued. Production activation requires verified merchant receipt ingestion, official platform category/merchant approval, a production-safe key-management plan, a reviewed migration, a rollback path, and an authorized release.
