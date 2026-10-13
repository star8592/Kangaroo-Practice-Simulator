#!/usr/bin/env bash
# Publish fully audited G1/G2 MP3 question audio independently of code releases.
set -Eeuo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-root@socthink.cn}"
PERSIST_ROOT="${PERSIST_ROOT:-/opt/socthink-math}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"
SSH_CONFIG="${SSH_CONFIG:-/dev/null}"
DRY_RUN="${DRY_RUN:-1}"
DEFER_PUBLIC_PROBE="${DEFER_PUBLIC_PROBE:-0}"
AUDIO_TRANSFER_MODE="${AUDIO_TRANSFER_MODE:-parallel}"

cd "$ROOT"
python3 scripts/audit_exam_readaloud_assets.py --strict

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
python3 scripts/bundle_exam_readaloud_assets.py --output "$TMP/readaloud.tar.gz"
SHA="$(sha256sum "$TMP/readaloud.tar.gz" | awk '{print $1}')"
test -n "$SHA"

if [[ "$DRY_RUN" == "1" ]]; then
  printf 'EXAM_AUDIO_RELEASE_DRY_RUN=PASS sha=%s\n' "$SHA"
  exit 0
fi

ssh -F "$SSH_CONFIG" -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" 'echo SSH_OK' | grep -q SSH_OK
REMOTE_TMP="/tmp/socthink-exam-voice-${SHA:0:16}"
ssh -F "$SSH_CONFIG" "$REMOTE_HOST" "mkdir -p '$REMOTE_TMP'"
if [[ "$AUDIO_TRANSFER_MODE" == "parallel" ]]; then
  python3 scripts/parallel_upload_exam_audio.py --archive "$TMP/readaloud.tar.gz"     --remote-host "$REMOTE_HOST" --remote-directory "$REMOTE_TMP"     --ssh-config "$SSH_CONFIG" --workers 20 --chunk-mb 2
elif [[ "$AUDIO_TRANSFER_MODE" == "scp" ]]; then
  scp -F "$SSH_CONFIG" "$TMP/readaloud.tar.gz" "$REMOTE_HOST:$REMOTE_TMP/readaloud.tar.gz"
else
  echo "unsupported transfer mode" >&2
  exit 9
fi

ssh -F "$SSH_CONFIG" "$REMOTE_HOST" bash -s -- "$PERSIST_ROOT" "$REMOTE_TMP" "$SHA" <<'REMOTE'
set -Eeuo pipefail
APP="$1"
STAGE_ROOT="$2"
SHA="$3"
if [[ ! -f "$STAGE_ROOT/readaloud.tar.gz" ]]; then
  python3 - "$STAGE_ROOT" <<'PY_CHUNKS'
from pathlib import Path
import sys
root=Path(sys.argv[1])
parts=sorted((root/"parts").glob("*.part"))
assert parts and parts[0].name=="0000.part"
assert [x.name for x in parts]==[f"{i:04d}.part" for i in range(len(parts))]
out=root/"readaloud.tar.gz"
tmp=root/"readaloud.rebuilding"
with tmp.open("wb") as writer:
    for part in parts:
        with part.open("rb") as src:
            for data in iter(lambda: src.read(1024*1024),b""):
                writer.write(data)
tmp.rename(out)
PY_CHUNKS
fi
test -f "$STAGE_ROOT/readaloud.tar.gz"
test "$(sha256sum "$STAGE_ROOT/readaloud.tar.gz" | awk '{print $1}')" = "$SHA"
mkdir -p "$APP/public"
STAGE="$(mktemp -d "$APP/public/.exam-audio-next.XXXXXXXX")"
CURRENT="$APP/public/exam-read-aloud"
PREVIOUS="$APP/public/.exam-audio-prev-${SHA:0:16}"
cleanup(){ rm -rf "$STAGE"; }
trap cleanup EXIT
tar -xzf "$STAGE_ROOT/readaloud.tar.gz" -C "$STAGE"
python3 - "$STAGE" <<'PY'
import hashlib,json,sys
from pathlib import Path
root=Path(sys.argv[1])
manifest=json.loads((root/"manifest.json").read_text())
expected=manifest["trackCount"]
tracks=manifest["tracks"]
assert expected==len(tracks) and expected>0
for track in tracks:
    name=track["name"]
    assert Path(name).name==name and name.endswith(".mp3")
    path=root/"v1"/name
    assert path.is_file() and not path.is_symlink()
    assert path.stat().st_size==track["size"]
    assert hashlib.sha256(path.read_bytes()).hexdigest()==track["sha256"]
assert len(list((root/"v1").glob("*.mp3")))==expected
print("REMOTE_EXAM_AUDIO_VALIDATED="+str(expected),flush=True)
PY
# mktemp -d creates 0700; web workers need directory traversal.
chmod 755 "$STAGE" "$STAGE/v1"
if [[ -e "$CURRENT" ]]; then
  if [[ -e "$PREVIOUS" ]]; then
    echo "previous rollback directory already exists; refuse overwrite" >&2
    exit 12
  fi
  mv -T "$CURRENT" "$PREVIOUS"
fi
if ! mv -T "$STAGE" "$CURRENT"; then
  [[ ! -e "$PREVIOUS" ]] || mv -T "$PREVIOUS" "$CURRENT"
  exit 13
fi
printf '%s\n' "$SHA" > "$CURRENT/release-sha256.txt"
echo "REMOTE_EXAM_AUDIO_PROMOTED sha=$SHA"
REMOTE

# This flag is for pre-staging verified assets before the code release adds the
# runtime symlink. It must never be mistaken for completed public acceptance.
if [[ "$DEFER_PUBLIC_PROBE" == "1" ]]; then
  printf 'EXAM_AUDIO_STAGED=PASS sha=%s public_probe=DEFERRED\n' "$SHA"
  exit 0
fi

SAMPLE="$(python3 - "$ROOT/reports/exam-read-aloud-worklist.json" <<'PY'
import json,sys
items=json.load(open(sys.argv[1]))["tasks"]
assert items
print(items[0]["url"])
PY
)"
curl -fsS --max-time 30 "${PUBLIC_URL}${SAMPLE}?release=${SHA:0:12}" -o "$TMP/public-sample.mp3"
test "$(sha256sum "$ROOT/public${SAMPLE}" | awk '{print $1}')" = "$(sha256sum "$TMP/public-sample.mp3" | awk '{print $1}')" || {
  echo "EXAM_AUDIO_PUBLIC_PROBE=FAIL; verify Nginx/current release links" >&2
  exit 15
}
printf 'EXAM_AUDIO_PUBLIC_PROBE=PASS sha=%s sample=%s\n' "$SHA" "$SAMPLE"
