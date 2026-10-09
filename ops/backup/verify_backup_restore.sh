#!/usr/bin/env bash
# Decrypt and restore a backup into an isolated temporary directory only.
# It NEVER writes to the production application data tree.
set -Eeuo pipefail
umask 077
[[ $# -eq 1 ]] || { echo "Usage: $0 <archive.tar.zst.gpg>" >&2; exit 2; }
ARCHIVE="$(realpath -e "$1")"
[[ "$ARCHIVE" == *.tar.zst.gpg ]] || { echo "BACKUP_VERIFY=FAIL reason=unexpected_extension" >&2; exit 2; }
HASHFILE="$ARCHIVE.sha256"
KEY="${SOCTHINK_BACKUP_PASSPHRASE_FILE:-/etc/socthink/backup-passphrase}"
[[ -s "$KEY" && -f "$HASHFILE" ]] || { echo "BACKUP_VERIFY=FAIL reason=missing_secret_or_checksum" >&2; exit 2; }
[[ "$(stat -c '%a' "$KEY")" == "600" ]] || { echo "BACKUP_VERIFY=FAIL reason=unsafe_key_permissions" >&2; exit 2; }
DIR="$(dirname "$ARCHIVE")"
(cd "$DIR" && sha256sum -c "$(basename "$HASHFILE")" --status) || {
  echo "BACKUP_VERIFY=FAIL reason=checksum" >&2; exit 1;
}
WORKSPACE="${SOCTHINK_RESTORE_TEST_ROOT:-$DIR}"
mkdir -p "$WORKSPACE"
RESTORE="$(mktemp -d "$WORKSPACE/.restore-drill.XXXXXXXX")"
trap 'rm -rf -- "$RESTORE"' EXIT
# File magic and checksum were checked above. Never extract into a live path.
gpg --batch --quiet --yes --no-tty --pinentry-mode loopback \
  --passphrase-file "$KEY" --decrypt "$ARCHIVE" \
  | zstd --decompress --stdout --quiet \
  | tar --extract --file=- --directory="$RESTORE" --no-same-owner --no-same-permissions
python3 "$(dirname "$0")/verify_tree.py" "$RESTORE"
echo "BACKUP_ISOLATED_RESTORE=PASS archive=$(basename "$ARCHIVE")"
