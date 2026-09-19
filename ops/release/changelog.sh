#!/usr/bin/env bash
set -euo pipefail

VERSION=${1:-dev}
OUT="CHANGELOG-${VERSION}.md"

cat > "$OUT" <<EOF
# Release ${VERSION}

Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Changes
- Automated release pipeline update
- Build and verification workflow
- Production deployment preparation
EOF

echo "$OUT"
