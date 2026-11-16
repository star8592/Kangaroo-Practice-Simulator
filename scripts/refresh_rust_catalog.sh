#!/usr/bin/env bash
# One-shot event hook for the EXISTING verified-exam publication process.
# This does not run on a cron schedule or modify the source exam bundles.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

SNAPSHOT="${SOCTHINK_CATALOG_SNAPSHOT:?Set absolute private Rust active snapshot path}"
RUST_URL="${SOCTHINK_RUST_CATALOG_INTERNAL_URL:-http://127.0.0.1:37871}"
[[ "$SNAPSHOT" = /* && "$SNAPSHOT" = *.json && -f "$SNAPSHOT" && ! -L "$SNAPSHOT" ]] || {
  echo "REFRESH_RUST_CATALOG=REJECTED active snapshot is not a regular absolute .json file" >&2
  exit 1
}
[[ -x node_modules/.bin/tsx ]] || {
  echo "REFRESH_RUST_CATALOG=REJECTED missing local tsx runtime" >&2
  exit 1
}
umask 077
CANDIDATE="$(mktemp --suffix=.json "${SNAPSHOT%.json}.candidate.XXXXXXXX")"
trap 'rm -f -- "$CANDIDATE"' EXIT

# Offline authorized source gating, then a single Rust in-memory refresh.
SOCTHINK_CATALOG_SNAPSHOT="$CANDIDATE" node_modules/.bin/tsx scripts/publish_training_resource_snapshot.ts
node_modules/.bin/tsx scripts/promote_rust_catalog_snapshot.ts \
  --candidate "$CANDIDATE" \
  --snapshot "$SNAPSHOT" \
  --rust-url "$RUST_URL" \
  --service socthink-catalog.service
echo "REFRESH_RUST_CATALOG=PASS"
