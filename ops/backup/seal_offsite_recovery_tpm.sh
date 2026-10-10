#!/usr/bin/env bash
# TPM-sealed recovery credential. Transport remote secret only within SSH → TPM encryption pipe.
# Never prints/displays/writes the plaintext production passphrase.
set -Eeuo pipefail
umask 077
HERE="$(cd "$(dirname "$0")" && pwd)"

OUT="${SOCTHINK_OFFSITE_DIR:-/mnt/disk1/master_data/secure/socthink-backups}"
ESCROW_DIR="$OUT/recovery"
ESCROW="$ESCROW_DIR/backup-passphrase.tpm.cred"
NAME="socthink-production-backup-recovery-20261010"
REMOTE="root@socthink.cn"
SRC="/etc/socthink/backup-passphrase"
SSH_OPTS=(-F /dev/null -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=12)
[[ -d "$OUT" && ! -L "$OUT" && "$(stat -c '%a' "$OUT")" == "700" ]] || {
  echo "TPM_ESCROW=BLOCKED reason=invalid_restricted_offsite_directory" >&2; exit 2;
}
[[ "$(findmnt -T "$OUT" -n -o TARGET)" != "/" ]] || {
  echo "TPM_ESCROW=BLOCKED reason=separate_volume_required" >&2; exit 2;
}
systemd-analyze has-tpm2 2>/dev/null | grep -qx yes || {
  echo "TPM_ESCROW=BLOCKED reason=tpm2_not_available" >&2; exit 2;
}
# Check current-process TPM permissions AND synthetic hardware encrypt/decrypt before
# contacting production or reading a single byte of the real passphrase.
python3 "$HERE/tpm_hardware_preflight.py" --probe || {
  echo "TPM_ESCROW=BLOCKED reason=synthetic_hardware_preflight_failed" >&2; exit 2;
}
mkdir -p -m 700 "$ESCROW_DIR"
chmod 700 "$ESCROW_DIR"
[[ ! -L "$ESCROW" ]] || {
  echo "TPM_ESCROW=BLOCKED reason=symlink" >&2; exit 2;
}
# Compare high-entropy secret fingerprints only; never emit the actual digest.
remote_hash="$(ssh "${SSH_OPTS[@]}" "$REMOTE" "test -r '$SRC' && test \"\$(stat -c %a '$SRC')\" = 600 && sha256sum '$SRC' | cut -d ' ' -f1")" || {
  echo "TPM_ESCROW=FAIL reason=source_secret_preflight" >&2; exit 1;
}
[[ "$remote_hash" =~ ^[a-f0-9]{64}$ ]] || {
  echo "TPM_ESCROW=FAIL reason=invalid_source_fingerprint" >&2; exit 1;
}
if [[ -s "$ESCROW" ]]; then
  local_hash="$(systemd-creds decrypt --name="$NAME" "$ESCROW" - | sha256sum | cut -d ' ' -f1)" || {
    echo "TPM_ESCROW=FAIL reason=existing_tpm_credential_unreadable" >&2; exit 1;
  }
  [[ "$local_hash" == "$remote_hash" ]] || {
    echo "TPM_ESCROW=FAIL reason=production_secret_rotated_existing_credential_preserved" >&2; exit 1;
  }
  echo "TPM_ESCROW=PASS already_present=yes tpm_hardware=YES plaintext_persisted=NO independent_offline_key=NO"
  exit 0
fi
TMP="$(mktemp "$ESCROW_DIR/.tpm-escrow.XXXXXXXX")"
cleanup(){ rm -f -- "$TMP"; }
trap cleanup EXIT
# SSH carries plaintext only in transit inside authenticated encrypted connection;
# systemd-creds directly seals stdin under the local TPM2 and writes ciphertext.
if ! ssh "${SSH_OPTS[@]}" "$REMOTE" "test -r '$SRC' && exec cat '$SRC'" \
  | systemd-creds encrypt --with-key=tpm2 --name="$NAME" - "$TMP"; then
  echo "TPM_ESCROW=FAIL reason=tpm_encryption_or_ssh" >&2; exit 1;
fi
chmod 0600 "$TMP"
actual_hash="$(systemd-creds decrypt --name="$NAME" "$TMP" - | sha256sum | cut -d ' ' -f1)" || {
  echo "TPM_ESCROW=FAIL reason=tpm_roundtrip" >&2; exit 1;
}
[[ "$actual_hash" == "$remote_hash" ]] || {
  echo "TPM_ESCROW=FAIL reason=tpm_secret_mismatch" >&2; exit 1;
}
mv -- "$TMP" "$ESCROW"
trap - EXIT
echo "TPM_ESCROW=PASS created=yes tpm_hardware=YES plaintext_persisted=NO independent_offline_key=NO"
