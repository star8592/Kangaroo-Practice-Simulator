#!/usr/bin/env bash
set -euo pipefail

TAG=${1:?release tag required}

echo "Rollback target: $TAG"
echo "Deployment rollback must restore the selected release artifact or git tag."
