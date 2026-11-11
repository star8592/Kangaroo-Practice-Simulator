#!/usr/bin/env bash
# Publish ONE prebuilt English frontend to SOC THINK without restarting the main Next.js app.
# Usage: sudo bash ops/release/publish_english_app.sh PRODUCT DIST_DIR BUILD_ID
# PRODUCT: pronunciation | vocabulary | reading | aelos
# Build the product at its source repository with the matching /english/PRODUCT/app/ base.
set -euo pipefail
if [[ $# -ne 3 ]]; then
  echo "USAGE: $0 PRODUCT DIST_DIR BUILD_ID" >&2
  exit 2
fi
product="$1"
src="$2"
build_id="$3"
case "$product" in
  pronunciation|vocabulary|reading|aelos) ;;
  *) echo "INVALID_PRODUCT" >&2; exit 2 ;;
esac
if [[ ! "$build_id" =~ ^[a-zA-Z0-9._-]{6,80}$ ]]; then
  echo "INVALID_BUILD_ID" >&2; exit 2
fi
if [[ ! -f "$src/index.html" ]]; then
  echo "MISSING_BUILD_INDEX" >&2; exit 2
fi
if find "$src" -type l -print -quit | grep -q .; then
  echo "SYMLINKS_NOT_ALLOWED_IN_BUILD" >&2; exit 2
fi
root="${SOCTHINK_ENGLISH_WEB_ROOT:-/var/www/socthink-english-public}"
current="$root/current"
[[ -L "$current" ]] || { echo "MISSING_CURRENT_RELEASE" >&2; exit 2; }
command -v flock >/dev/null || { echo "MISSING_FLOCK" >&2; exit 2; }
exec 9>"$root/.publish.lock"
flock -n 9 || { echo "ANOTHER_ENGLISH_RELEASE_RUNNING" >&2; exit 2; }
old="$(readlink -f "$current")"
[[ -d "$old/english/$product/app" ]] || { echo "INVALID_LIVE_LAYOUT" >&2; exit 2; }
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
release="$root/releases/${stamp}-${product}-${build_id}"
[[ ! -e "$release" ]] || { echo "BUILD_ALREADY_PUBLISHED" >&2; exit 2; }
mkdir -p "$root/releases"
# Copy the previous snapshot so the other three apps stay byte-identical.
mkdir "$release"
cp -a "$old/." "$release/"
target="$release/english/$product/app"
rm -rf -- "$target"
mkdir -p -- "$target"
cp -a "$src/." "$target/"
# The new build must include actual same-origin JS/CSS entrypoint assets.
python3 - "$target" "$product" <<'PY'
import sys, pathlib, re
folder=pathlib.Path(sys.argv[1])
product=sys.argv[2]
html=(folder/'index.html').read_text(encoding='utf-8')
prefix=f'/english/{product}/app/'
assets=re.findall(r'(?:src|href)=[\"\']('+re.escape(prefix)+r'[^\"\']+)',html)
assets=[a.split('?',1)[0] for a in assets if a.endswith(('.js','.css','.svg','.json')) or '/assets/' in a]
if not assets:
 raise SystemExit('NO_SAME_ORIGIN_ENTRY_ASSETS')
for url in assets:
 target=folder/url.removeprefix(prefix)
 if not target.is_file():
  raise SystemExit('MISSING_ENTRY_ASSET '+url)
if 'https://toktik.tech/' in html:
 raise SystemExit('OLD_ORIGIN_IN_BUILD_HTML')
print('PREPARED',product,len(assets),'verified assets')
PY
# Update only the English release symlink, never the main website release or DB.
link="$root/.next.$$"
ln -s "$release" "$link"
mv -Tf "$link" "$current"
url="https://socthink.cn/english/$product/app/"
if ! curl -kfsS --connect-timeout 3 --max-time 10 --resolve socthink.cn:443:127.0.0.1 -o /dev/null "$url"; then
  rollback="$root/.rollback.$$"
  ln -s "$old" "$rollback"
  mv -Tf "$rollback" "$current"
  echo "ROLLED_BACK_SMOKE_FAILED $product" >&2
  exit 1
fi
echo "PUBLISHED_VERIFIED product=$product build=$build_id release=$release previous=$old"
