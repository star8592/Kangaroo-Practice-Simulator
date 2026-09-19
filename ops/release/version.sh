#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?usage: version.sh <version>}"

cat > VERSION <<EOF
$VERSION
EOF

echo "VERSION=$VERSION"
