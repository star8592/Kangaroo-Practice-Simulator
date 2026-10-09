#!/usr/bin/env bash
# On a DIFFERENT authorized host, pull ONLY GPG ciphertext/checksum/receipt.
# No backup passphrase is transferred. No writes to the production server.
set -Eeuo pipefail
umask 077
HERE="$(cd "$(dirname "$0")" && pwd)"
VERIFY="$HERE/verify_offsite_replica.py"
OUT="${SOCTHINK_OFFSITE_DIR:-/mnt/disk1/master_data/secure/socthink-backups}"
REMOTE="root@socthink.cn"
SOURCE="/var/backups/socthink-math"
[[ "$OUT" == /* && ! -L "$OUT" ]] || { echo "OFFSITE_PULL=BLOCKED reason=bad_destination" >&2; exit 2; }
mkdir -p -- "$OUT"
chmod 0700 "$OUT"
[[ "$(findmnt -T "$OUT" -n -o TARGET)" != "/" ]] || {
  echo "OFFSITE_PULL=BLOCKED reason=separate_data_volume_required" >&2; exit 2;
}
for tool in ssh rsync python3 sha256sum flock; do
  command -v "$tool" >/dev/null || { echo "OFFSITE_PULL=BLOCKED reason=missing_$tool" >&2; exit 2; }
done
exec 9>"$OUT/.pull.lock"
flock -n 9 || { echo "OFFSITE_PULL=BLOCKED reason=already_running" >&2; exit 3; }
SSH_ARGS=(-F /dev/null -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 -o ServerAliveInterval=40)
REMOTE_RECEIPTS="$(ssh "${SSH_ARGS[@]}" "$REMOTE" \
  'find /var/backups/socthink-math -maxdepth 1 -type f -name "socthink-*.tar.zst.gpg.receipt.json" -printf "%f\n" | sort')" || {
  echo "OFFSITE_PULL=FAIL reason=remote_listing_failed" >&2; exit 1;
}
[[ -n "$REMOTE_RECEIPTS" ]] || { echo "OFFSITE_PULL=FAIL reason=no_completed_source_backup" >&2; exit 1; }
COPIED=0
SKIPPED=0
STAGING=""
cleanup(){ [[ -z "$STAGING" ]] || rm -rf -- "$STAGING"; }
trap cleanup EXIT
while IFS= read -r RECEIPT; do
  [[ "$RECEIPT" =~ ^socthink-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}-[0-9]+\.tar\.zst\.gpg\.receipt\.json$ ]] || {
    echo "OFFSITE_PULL=BLOCKED reason=unrecognized_source_filename" >&2; exit 1;
  }
  ARCHIVE="${RECEIPT%.receipt.json}"
  if [[ -f "$OUT/$RECEIPT" ]]; then
    python3 "$VERIFY" "$OUT" "$ARCHIVE" >/dev/null || {
      echo "OFFSITE_PULL=FAIL reason=previous_replica_corrupt archive=$ARCHIVE" >&2; exit 1;
    }
    SKIPPED=$((SKIPPED+1))
    continue
  fi
  STAGING="$(mktemp -d "$OUT/.incoming.XXXXXXXX")"
  for SUFFIX in "" ".sha256" ".receipt.json"; do
    # --delay-updates makes individual rsync delivery atomic within staging.
    rsync --archive --delay-updates --chmod=F600 --timeout=900 \
      --bwlimit=16384 --protect-args \
      -e "ssh -F /dev/null -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 -o ServerAliveInterval=40" \
      -- "$REMOTE:$SOURCE/$ARCHIVE$SUFFIX" "$STAGING/" || {
      echo "OFFSITE_PULL=FAIL reason=rsync_failed" >&2; exit 1;
    }
  done
  python3 "$VERIFY" "$STAGING" "$ARCHIVE"
  mv -- "$STAGING/$ARCHIVE" "$OUT/$ARCHIVE"
  mv -- "$STAGING/$ARCHIVE.sha256" "$OUT/$ARCHIVE.sha256"
  # Receipt is deliberately committed LAST, so an interrupted copy never
  # presents an incomplete backup as verified.
  mv -- "$STAGING/$RECEIPT" "$OUT/$RECEIPT"
  chmod 0600 "$OUT/$ARCHIVE" "$OUT/$ARCHIVE.sha256" "$OUT/$RECEIPT"
  rmdir -- "$STAGING"
  STAGING=""
  COPIED=$((COPIED+1))
done <<< "$REMOTE_RECEIPTS"
echo "OFFSITE_PULL=PASS copied=$COPIED previously_verified=$SKIPPED key_transfer=NONE"
