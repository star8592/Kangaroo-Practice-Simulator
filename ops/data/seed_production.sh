#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${APP_DIR:-/opt/kangaroo-practice-simulator}"

cd "$ROOT_DIR"

echo "Preparing production data..."

# Keep production data initialization explicit.
# Database migration and seed commands should be added here
# according to the selected production database adapter.

if [ -f package.json ]; then
  echo "Project detected: $(basename "$ROOT_DIR")"
else
  echo "ERROR: package.json not found"
  exit 1
fi

echo "Production seed stage ready."
