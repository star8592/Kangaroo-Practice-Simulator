#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
OUT="${OUT:-$ROOT/.release/prebuilt}"
TARGET_SHA="${TARGET_SHA:-$(git -C "$ROOT" rev-parse HEAD)}"
VERSION="${VERSION:-$(git -C "$ROOT" show "$TARGET_SHA:VERSION" 2>/dev/null | tr -d '\r\n' || true)}"
[ -n "$VERSION" ] || VERSION=dev

log(){ printf '\n[prebuilt] %s\n' "$*"; }
die(){ echo "[prebuilt] ERROR: $*" >&2; exit 1; }

cd "$ROOT"
log "build standalone runtime for $VERSION @ $TARGET_SHA"
npm ci
NEXT_STANDALONE_BUILD=1 npm run build

test -f .next/standalone/server.js || die "standalone server.js missing"

python3 - "$OUT" <<'PY'
import shutil,sys
shutil.rmtree(sys.argv[1],ignore_errors=True)
PY
mkdir -p "$OUT/runtime/.next" "$OUT/runtime/public"

cp -a .next/standalone/. "$OUT/runtime/"
python3 - "$OUT/runtime/private" "$OUT/runtime/.git" "$OUT/runtime/.github" <<'PY'
import shutil,sys
for path in sys.argv[1:]:
    shutil.rmtree(path,ignore_errors=True)
PY
cp -a .next/static "$OUT/runtime/.next/static"

# Keep only Git-tracked public assets inside the immutable release. Large
# mutable datasets remain outside the artifact and are mounted at runtime.
while IFS= read -r -d '' file; do
  case "$file" in
    public/local-assets/*|public/generated-solutions/*) continue ;;
  esac
  mkdir -p "$OUT/runtime/$(dirname "$file")"
  cp -a "$file" "$OUT/runtime/$file"
done < <(git ls-files -z public)

mkdir -p "$OUT/runtime/.release" "$OUT/runtime/scripts"
printf '%s\n' "$TARGET_SHA" > "$OUT/runtime/.release/deployed_sha"
printf '%s\n' "$VERSION" > "$OUT/runtime/.release/deployed_version"
date -Iseconds > "$OUT/runtime/.release/deployed_at"
printf '%s\n' "$VERSION" > "$OUT/runtime/VERSION"
cp scripts/smoke_test.py "$OUT/runtime/scripts/"
cp scripts/test_pre_a_grade1_ready.py "$OUT/runtime/scripts/"

# No private/runtime user data may be embedded in a release artifact.
if [ -e "$OUT/runtime/private" ]; then
  die "private data leaked into prebuilt runtime"
fi
if find "$OUT/runtime" -type f -path '*/private/*' -print -quit | grep -q .; then
  die "private files leaked into prebuilt runtime"
fi

tar -C "$OUT/runtime" -czf "$OUT/runtime.tar.gz" .
sha256sum "$OUT/runtime.tar.gz" | awk '{print $1}' > "$OUT/runtime.tar.gz.sha256"

RUNTIME_BYTES="$(stat -c %s "$OUT/runtime.tar.gz")"
RUNTIME_SHA="$(cat "$OUT/runtime.tar.gz.sha256")"
printf 'sha256  %s\nbytes  %s\nversion  %s\ncommit  %s\n'   "$RUNTIME_SHA" "$RUNTIME_BYTES" "$VERSION" "$TARGET_SHA" > "$OUT/runtime.txt"

log "artifact ready"
printf 'PREBUILT_RUNTIME=PASS sha=%s bytes=%s commit=%s\n' "$RUNTIME_SHA" "$RUNTIME_BYTES" "$TARGET_SHA"