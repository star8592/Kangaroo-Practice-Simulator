#!/usr/bin/env bash
# R57 read-only production readiness gate. Does not create/alter data.
set -Eeuo pipefail
db="accent_lab"
if [ "$#" -gt 0 ]; then db="$1"; fi
[[ "$db" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Unsafe database name"; exit 2; }
[[ "$(id -u)" == 0 ]] || { echo "Run as root on the PostgreSQL host"; exit 2; }
result="$(runuser -u postgres -- psql -X -At -v ON_ERROR_STOP=1 -d "$db" <<'SQL'
WITH required(name) AS (
 VALUES ('word_assignments'),('word_assignment_items'),
        ('word_assignment_attempts'),('word_assignment_receipts')
)
SELECT count(*)::text
FROM required r
JOIN pg_namespace n ON n.nspname='accent'
JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.name AND c.relkind='r'
WHERE c.relrowsecurity AND c.relforcerowsecurity
  AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname='accentclass' AND NOT rolsuper AND NOT rolbypassrls AND oid<>c.relowner)
  AND has_table_privilege('accentclass',c.oid,'SELECT')
  AND has_table_privilege('accentclass',c.oid,'INSERT')
  AND has_table_privilege('accentclass',c.oid,'UPDATE')
  AND EXISTS(
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='accent' AND p.tablename=r.name
      AND p.policyname='tenant_boundary'
  );
SQL
)"
if [[ "$result" != "4" ]]; then
  echo "R57_DATABASE_READY=NO accessible_rls_tables=$result/4"
  exit 1
fi
echo "R57_DATABASE_READY=YES accessible_rls_tables=4/4"
