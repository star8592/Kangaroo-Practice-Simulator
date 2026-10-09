#!/usr/bin/env bash
# Offline disaster restore verification from LOCAL replica and LOCAL TPM alone.
# Never contacts the original production server; never writes to production.
set -Eeuo pipefail
umask 077
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${SOCTHINK_OFFSITE_DIR:-/mnt/disk1/master_data/secure/socthink-backups}"
CRED="${SOCTHINK_TPM_RECOVERY_CREDENTIAL:-$OUT/recovery/backup-passphrase.tpm.cred}"
NAME="socthink-production-backup-recovery-20261010"
RAM_ROOT="${SOCTHINK_RECOVERY_RAM_ROOT:-/dev/shm}"
[[ -d "$OUT" && ! -L "$OUT" && -f "$CRED" && ! -L "$CRED" ]] || {
  echo "TPM_RECOVERY_DRILL=BLOCKED reason=missing_ciphertext_or_tpm_credential" >&2; exit 2;
}
[[ "$(stat -c '%a' "$CRED")" == "600" ]] || {
  echo "TPM_RECOVERY_DRILL=BLOCKED reason=unsafe_credential_mode" >&2; exit 2;
}
[[ "$RAM_ROOT" == "/dev/shm" && "$(findmnt -T "$RAM_ROOT" -n -o FSTYPE)" == "tmpfs" ]] || {
  echo "TPM_RECOVERY_DRILL=BLOCKED reason=tmpfs_required" >&2; exit 2;
}
readarray -t all_receipts < <(find "$OUT" -maxdepth 1 -type f -name 'socthink-*.tar.zst.gpg.receipt.json' -printf '%f\n' | sort -r)
(("${#all_receipts[@]}">0)) || {
  echo "TPM_RECOVERY_DRILL=BLOCKED reason=no_complete_local_replica" >&2; exit 2;
}
RECEIPT="${all_receipts[0]}"
ARCHIVE="${RECEIPT%.receipt.json}"
# This verification checks source-pass restore receipt, ciphertext SHA-256 and size.
python3 "$HERE/verify_offsite_replica.py" "$OUT" "$ARCHIVE"
MEM_AVAILABLE_KIB="$(df -Pk "$RAM_ROOT" | awk 'NR==2{print $4}')"
((MEM_AVAILABLE_KIB>2500000)) || {
  echo "TPM_RECOVERY_DRILL=BLOCKED reason=insufficient_tmpfs_capacity" >&2; exit 2;
}
TMP="$(mktemp -d "$RAM_ROOT/socthink-offsite-recovery.XXXXXXXX")"
cleanup(){ rm -rf -- "$TMP"; }
trap cleanup EXIT
# The plaintext passphrase exists only on a process-substitution FD; no disk file.
# All extracted student records reside only on tmpfs, cleared on EXIT/ERR.
gpg --batch --quiet --yes --no-tty --pinentry-mode loopback \
  --passphrase-file <(systemd-creds decrypt --name="$NAME" "$CRED" -) \
  --decrypt "$OUT/$ARCHIVE" \
  | zstd --decompress --stdout --quiet \
  | tar --extract --file=- --directory="$TMP" --no-same-owner --no-same-permissions
python3 "$HERE/verify_tree.py" "$TMP"
echo "TPM_RECOVERY_DRILL=PASS backup_host=OFFLINE source_cloud=NOT_USED tmpfs=YES"
