#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" -ne 0 ]] || { echo "OFFSITE_INSTALL=BLOCKED reason=not_root_user_service" >&2; exit 2; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE_SHA="$(git -C "$ROOT" ls-remote origin refs/heads/main | cut -f1)"
SOURCE_SHA="$(git -C "$ROOT" rev-parse HEAD)"
[[ -n "$REMOTE_SHA" && "$REMOTE_SHA" == "$SOURCE_SHA" && -z "$(git -C "$ROOT" status --porcelain)" ]] || {
  echo "OFFSITE_INSTALL=BLOCKED reason=not_clean_exact_main" >&2; exit 2;
}
OUT="/mnt/disk1/master_data/secure/socthink-backups"
mkdir -p "$OUT"
chmod 0700 "$OUT"
[[ "$(findmnt -T "$OUT" -n -o TARGET)" != "/" ]] || {
  echo "OFFSITE_INSTALL=BLOCKED reason=data_disk_not_mounted" >&2; exit 2;
}
BIN="$HOME/.local/share/socthink-backup/bin"
UNITDIR="$HOME/.config/systemd/user"
install -d -m 0700 "$BIN"
install -d -m 0700 "$UNITDIR"
install -m 0700 "$ROOT/ops/backup/pull_offsite_encrypted.sh" "$BIN/pull_offsite_encrypted.sh"
install -m 0600 "$ROOT/ops/backup/verify_offsite_replica.py" "$BIN/verify_offsite_replica.py"
install -m 0600 "$ROOT/ops/backup/check_offsite_health.py" "$BIN/check_offsite_health.py"
install -m 0700 "$ROOT/ops/backup/seal_offsite_recovery_tpm.sh" "$BIN/seal_offsite_recovery_tpm.sh"
install -m 0700 "$ROOT/ops/backup/offsite_restore_drill_tpm.sh" "$BIN/offsite_restore_drill_tpm.sh"
install -m 0600 "$ROOT/ops/backup/verify_tree.py" "$BIN/verify_tree.py"
for unit in socthink-offsite-backup-pull.service socthink-offsite-backup-pull.timer; do
  install -m 0644 "$ROOT/ops/backup/$unit" "$UNITDIR/$unit"
done
printf '%s\n' "$SOURCE_SHA" > "$HOME/.local/share/socthink-backup/installed_sha"
systemctl --user daemon-reload
systemctl --user enable --now socthink-offsite-backup-pull.timer
systemctl --user start --no-block socthink-offsite-backup-pull.service
echo "OFFSITE_INSTALL=PASS sha=$SOURCE_SHA timer=ENABLED initial_pull=START_REQUESTED"
