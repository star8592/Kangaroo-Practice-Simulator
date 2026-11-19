#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE=/home/master/projects/accentlab-word-pdf-20261115/migrations
PG=/usr/lib/postgresql/18/bin
TMP="$(mktemp -d -t r56-speaker-pg-XXXXXX)"
chmod 700 "$TMP"
cleanup(){
 "$PG/pg_ctl" -D "$TMP/data" -m immediate -w stop >/dev/null 2>&1 || true
 rm -rf "$TMP"
}
trap cleanup EXIT
mkdir -m 700 "$TMP/socket"
"$PG/initdb" -D "$TMP/data" --no-instructions --auth-local=trust --auth-host=reject --locale=C >/dev/null
PORT=45672
"$PG/pg_ctl" -D "$TMP/data" -l "$TMP/pg.log" -o "-c listen_addresses= -c unix_socket_directories=$TMP/socket -p $PORT" -w start >/dev/null
psql_local(){ psql -X -v ON_ERROR_STOP=1 -q -h "$TMP/socket" -p "$PORT" -d postgres "$@"; }
for v in 1 2 3 4 5 6 7; do
 case "$v" in
  1) n=accent_lab_core;; 2) n=accent_classroom_homework;;
  3) n=accent_teacher_expected_roster;; 4) n=accent_parent_join_approval;;
  5) n=accent_class_wall_public_alias;; 6) n=accent_assignment_claimed_at;;
  7) n=accent_teacher_approval;;
 esac
 f="$BASE/$(printf '000%s' "$v")_$n.sql"
 test -s "$f"
 psql_local -f "$f" >/dev/null
done
psql_local -f "$ROOT/ops/db/20261119_accent_roleplay_speakers.sql" >/dev/null
psql_local -f "$ROOT/ops/db/20261119_accent_roleplay_speakers.sql" >/dev/null
actual="$(psql_local -Atc "SELECT concat(a.attname,':',c.conname,':',t.relrowsecurity,':',t.relforcerowsecurity) FROM pg_attribute a JOIN pg_class t ON t.oid=a.attrelid JOIN pg_constraint c ON c.conrelid=t.oid WHERE a.attrelid='accent.class_assignment_items'::regclass AND a.attname='speaker_label' AND NOT a.attisdropped AND c.conname='accent_assignment_speaker_label_format'")"
test "$actual" = "speaker_label:accent_assignment_speaker_label_format:t:t" || { echo "R56_RLS_OR_CONSTRAINT_FAILED=$actual"; exit 1; }
echo "R56_PG18_MIGRATION_IDEMPOTENT_RLS_PASS=YES"
