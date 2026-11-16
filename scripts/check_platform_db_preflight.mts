/**
 * Read-only production preflight for the platform grants store.
 * Uses the existing server-side connection. Never prints the URL, secrets,
 * user rows, or grant contents. Must pass BEFORE enabling R180.
 */
import {Pool} from "pg";
const url=process.env.SOCTHINK_PLATFORM_DATABASE_URL?.trim();
if(!url){
 console.error("PLATFORM_PREFLIGHT=BLOCKED reason=DATABASE_URL_NOT_CONFIGURED");
 process.exit(2);
}
const pool=new Pool({connectionString:url,max:1,connectionTimeoutMillis:3000,
 idleTimeoutMillis:1000,application_name:"socthink-platform-preflight"});
try{
 const result=await pool.query<{
  ver:string;superuser:boolean;bypassrls:boolean;createdb:boolean;createrole:boolean;
  dbcreate:boolean;schemacreate:boolean;isowner:boolean;
  grants_select:boolean;grants_insert:boolean;grants_update:boolean;
  audit_select:boolean;audit_insert:boolean;grants_table:string|null;audit_table:string|null;
  grant_count:string;audit_count:string;
 }>(`
  SELECT current_setting('server_version') AS ver,
   r.rolsuper AS superuser,r.rolbypassrls AS bypassrls,
   r.rolcreatedb AS createdb,r.rolcreaterole AS createrole,
   has_database_privilege(current_user,current_database(),'CREATE') AS dbcreate,
   has_schema_privilege(current_user,'platform','CREATE') AS schemacreate,
   EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='platform' AND c.relname IN ('role_grants','role_grant_audit')
      AND c.relowner=r.oid) AS isowner,
   has_table_privilege(current_user,'platform.role_grants','SELECT') AS grants_select,
   has_table_privilege(current_user,'platform.role_grants','INSERT') AS grants_insert,
   has_table_privilege(current_user,'platform.role_grants','UPDATE') AS grants_update,
   has_table_privilege(current_user,'platform.role_grant_audit','SELECT') AS audit_select,
   has_table_privilege(current_user,'platform.role_grant_audit','INSERT') AS audit_insert,
   to_regclass('platform.role_grants')::text AS grants_table,
   to_regclass('platform.role_grant_audit')::text AS audit_table,
   (SELECT count(*) FROM platform.role_grants)::text AS grant_count,
   (SELECT count(*) FROM platform.role_grant_audit)::text AS audit_count
  FROM pg_roles r WHERE r.rolname=current_user`);
 const s=result.rows[0];
 if(!s)throw Error("DATABASE_ROLE_NOT_FOUND");
 const full=Number.parseInt(s.ver.split(".")[0],10)>=18;
 const safe=!s.superuser&&!s.bypassrls&&!s.createdb&&!s.createrole&&
  !s.dbcreate&&!s.schemacreate&&!s.isowner;
 const rights=s.grants_select&&s.grants_insert&&s.grants_update&&
  s.audit_select&&s.audit_insert;
 const tables=s.grants_table==="platform.role_grants"&&
  s.audit_table==="platform.role_grant_audit";
 if(!full||!safe||!rights||!tables)
  throw Error("DATABASE_VERSION_OR_LEAST_PRIVILEGE_INVALID");
 console.log("PLATFORM_PREFLIGHT=PASS postgres18=YES restricted_role=YES "+
  "tables=2 permissions=VERIFIED grants="+s.grant_count+" audit_events="+s.audit_count);
}catch(e){
 const message=e instanceof Error?e.message:"UNKNOWN_ERROR";
 // DB exceptions may include credentials. Never forward raw errors.
 const reason=message==="DATABASE_VERSION_OR_LEAST_PRIVILEGE_INVALID"?
  "UNSAFE_DATABASE_ROLE_OR_SCHEMA":"DATABASE_CONNECT_OR_SCHEMA_FAILED";
 console.error("PLATFORM_PREFLIGHT=BLOCKED reason="+reason);
 process.exitCode=1;
}finally{await pool.end().catch(()=>undefined)}
