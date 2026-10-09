#!/usr/bin/env bash
# Root-only installer; secrets generated on the production server, never printed.
set -Eeuo pipefail
[[ "$EUID" -eq 0 ]] || { echo "BACKUP_INSTALL=BLOCKED reason=root_required" >&2; exit 2; }
APP="/opt/socthink-math"
[[ "$(cd "$(dirname "$0")/../.." && pwd)" == "$APP" ]] || {
  echo "BACKUP_INSTALL=BLOCKED reason=unverified_checkout" >&2; exit 2;
}
SHA="$(git -C "$APP" rev-parse HEAD)"
[[ "$SHA" =~ ^[0-9a-f]{40}$ && "$(cat "$APP/.release/deployed_sha")" == "$SHA" ]] || {
  echo "BACKUP_INSTALL=BLOCKED reason=deployed_sha_mismatch" >&2; exit 2;
}
for bin in /usr/bin/gpg /usr/bin/tar /usr/bin/zstd /usr/bin/openssl /usr/bin/flock; do
  [[ -x "$bin" ]] || { echo "BACKUP_INSTALL=BLOCKED reason=dependency_missing" >&2; exit 2; }
done
install -d -o root -g root -m 0700 /etc/socthink /var/backups/socthink-math
KEY="/etc/socthink/backup-passphrase"
if [[ ! -e "$KEY" ]]; then
  (umask 077; /usr/bin/openssl rand -base64 48 > "$KEY")
  echo "BACKUP_KEY=GENERATED_LOCAL_ONLY"
fi
[[ -f "$KEY" && -s "$KEY" && ! -L "$KEY" ]] || {
  echo "BACKUP_INSTALL=BLOCKED reason=invalid_key_file" >&2; exit 2;
}
chmod 0600 "$KEY"
install -d -o root -g root -m 0700 /var/backups/socthink-math/.gnupg
for unit in socthink-verified-backup.service socthink-verified-backup.timer; do
  install -o root -g root -m 0644 "$APP/ops/backup/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload
systemctl enable --now socthink-verified-backup.timer
systemctl start --no-block socthink-verified-backup.service
echo "BACKUP_TIMER=ENABLED first_service=START_REQUESTED sha=$SHA"
