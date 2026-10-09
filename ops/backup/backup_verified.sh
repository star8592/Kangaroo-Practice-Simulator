#!/usr/bin/env bash
# Production encrypted backup. Writes only an atomic encrypted archive and verified receipt.
set -Eeuo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP="${SOCTHINK_BACKUP_APP_ROOT:-/opt/socthink-math}"
OUT="${SOCTHINK_BACKUP_DIR:-/var/backups/socthink-math}"
KEY="${SOCTHINK_BACKUP_PASSPHRASE_FILE:-/etc/socthink/backup-passphrase}"
[[ -d "$APP/private/users" && -d "$APP/private/arithmetic" && -d "$APP/private/exams" \
   && -d "$APP/public/local-assets" && -d "$APP/public/generated-solutions" ]] || {
  echo "BACKUP=FAIL reason=missing_data_scope" >&2; exit 2;
}
[[ -f "$APP/private/users/users.json" && -f "$APP/private/users/exam-sessions.json" \
   && -f "$APP/private/users/exam-attempts.jsonl" \
   && -f "$APP/private/arithmetic/sessions.jsonl" ]] || {
  echo "BACKUP=FAIL reason=critical_data_missing" >&2; exit 2;
}
[[ -f "$KEY" && -s "$KEY" && "$(stat -c '%a' "$KEY")" == "600" ]] || {
  echo "BACKUP=FAIL reason=encryption_key_missing_or_unsafe" >&2; exit 2;
}
for cmd in tar zstd gpg sha256sum flock python3; do
  command -v "$cmd" >/dev/null || { echo "BACKUP=FAIL reason=missing_$cmd" >&2; exit 2; }
done
mkdir -p "$OUT"
chmod 700 "$OUT"
exec 9>"$OUT/.backup.lock"
flock -n 9 || { echo "BACKUP=BLOCKED reason=another_backup_running" >&2; exit 3; }
DATE="$(date -u +%Y%m%dT%H%M%SZ)"
SHA="$(cat "$APP/.release/deployed_sha" 2>/dev/null | tr -dc a-f0-9 | head -c 12 || true)"
[[ -n "$SHA" ]] || SHA="test-fixture"
BASENAME="socthink-$DATE-$SHA-$BASHPID.tar.zst.gpg"
PARTIAL="$OUT/.$BASENAME"
FINAL="$OUT/$BASENAME"
HASH="$PARTIAL.sha256"
DONE=0
cleanup() {
  if [[ "$DONE" != "1" ]]; then rm -f -- "$PARTIAL" "$HASH" "$PARTIAL.receipt.json"; fi
}
trap cleanup EXIT
# tar must complete cleanly; a concurrently changed live file will fail
# the archive rather than allowing a silently partial backup.
tar --create --file=- --directory="$APP" \
  private public/local-assets public/generated-solutions \
  | zstd --compress --stdout --quiet -T2 -3 \
  | gpg --batch --quiet --yes --no-tty --pinentry-mode loopback \
      --passphrase-file "$KEY" --symmetric --cipher-algo AES256 --compress-algo none \
      --output "$PARTIAL"
[[ -s "$PARTIAL" ]] || { echo "BACKUP=FAIL reason=empty_archive" >&2; exit 1; }
(cd "$OUT" && sha256sum "$(basename "$PARTIAL")" > "$(basename "$HASH")")
# Immediate independent extraction checks actual recoverability, without
# touching the original production tree.
SOCTHINK_BACKUP_PASSPHRASE_FILE="$KEY" \
  SOCTHINK_RESTORE_TEST_ROOT="$OUT" \
  bash "$ROOT/ops/backup/verify_backup_restore.sh" "$PARTIAL"
mv -f -- "$PARTIAL" "$FINAL"
# Rewrite checksum under the stable filename.
(cd "$OUT" && sha256sum "$BASENAME" > "$BASENAME.sha256")
rm -f -- "$HASH"
ARCHIVE_SHA="$(sha256sum "$FINAL" | cut -d' ' -f1)"
ARCHIVE_BYTES="$(stat -c %s "$FINAL")"
BACKUP_FILE="$BASENAME" BACKUP_SHA="$ARCHIVE_SHA" BACKUP_BYTES="$ARCHIVE_BYTES" \
  BACKUP_GITSHA="$SHA" python3 - "$OUT/$BASENAME.receipt.json.tmp" <<'PY'
import json,os,sys
from datetime import datetime,timezone
entry={
 "schemaVersion":1,"status":"PASS","scope":["private","public/local-assets","public/generated-solutions"],
 "archive":os.environ["BACKUP_FILE"],"archiveSha256":os.environ["BACKUP_SHA"],
 "sizeBytes":int(os.environ["BACKUP_BYTES"]),
 "gitShaAtSnapshot":os.environ["BACKUP_GITSHA"],
 "createdAt":datetime.now(timezone.utc).isoformat(),
 "isolatedRestore":"PASS",
 "offHostReplica":"NOT_CONFIGURED",
 "liveServiceWasStopped":False,
 "consistency":"tar change-detection; no database transaction or atomic filesystem snapshot",
}
with open(sys.argv[1],"w",encoding="utf-8") as f:
 json.dump(entry,f,ensure_ascii=False,indent=2)
 os.chmod(sys.argv[1],0o600)
PY
mv "$OUT/$BASENAME.receipt.json.tmp" "$OUT/$BASENAME.receipt.json"
chmod 600 "$FINAL" "$FINAL.sha256" "$OUT/$BASENAME.receipt.json"
DONE=1
echo "BACKUP=PASS archive=$BASENAME restore=PASS off_host=NOT_CONFIGURED bytes=$ARCHIVE_BYTES"
