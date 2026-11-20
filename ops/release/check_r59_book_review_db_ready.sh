#!/usr/bin/env bash
set -Eeuo pipefail
dbname="accent_lab"
if [ "$#" -gt 0 ];then dbname="$1";fi
[[ "$dbname" =~ ^[a-zA-Z0-9_]+$ ]] || exit 2
[[ "$EUID" == 0 ]] || exit 2
n="$(runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -At -d "$dbname" <<'SQL'
SELECT count(*) FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='accent' AND c.relname='teacher_book_page_reviews'
 AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity
 AND EXISTS(SELECT 1 FROM pg_policies p
  WHERE p.schemaname='accent' AND p.tablename='teacher_book_page_reviews'
    AND p.policyname='tenant_boundary')
 AND EXISTS(SELECT 1 FROM pg_roles r
  WHERE r.rolname='accentclass' AND NOT r.rolsuper AND NOT r.rolbypassrls
    AND r.oid<>c.relowner)
 AND has_table_privilege('accentclass',c.oid,'SELECT')
 AND has_table_privilege('accentclass',c.oid,'INSERT')
 AND has_table_privilege('accentclass',c.oid,'UPDATE');
SQL
)"
if [[ "$n" != 1 ]];then
 echo "R59_BOOK_REVIEW_DATABASE_READY=NO"
 exit 1
fi
echo "R59_BOOK_REVIEW_DATABASE_READY=YES"
