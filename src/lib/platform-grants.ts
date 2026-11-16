/**
 * Dedicated Postgres18 authorization registry for the WHOLE SOC THINK platform.
 * This decides workbench module visibility, not the underlying class rights.
 * All product APIs retain independent teacher/classroom checks.
 */
import {Pool} from "pg";
import {
  PLATFORM_CAPABILITIES,PLATFORM_SUBJECT_PATTERN,platformCapability,
  platformRole,platformScope,type PlatformRole,type PlatformScopeKind,
} from "./platform-capabilities";

export class PlatformAuthError extends Error {
  constructor(public readonly code:string,public readonly status:number){super(code);}
}
export type PlatformGrant={
  subject:string;capability:string;role:PlatformRole;
  scopeKind:PlatformScopeKind;scopeId:string;grantedAt:string;
};
export type AuthorizedModule={
  id:string;name:string;product:string;managementUrl:string;
  grants:Pick<PlatformGrant,"role"|"scopeKind"|"scopeId">[];
};

let pool:Pool|undefined;
export function platformPool():Pool{
  const url=process.env.SOCTHINK_PLATFORM_DATABASE_URL?.trim();
  if(!url)throw new PlatformAuthError("PLATFORM_AUTH_NOT_CONFIGURED",503);
  if(!pool)pool=new Pool({connectionString:url,max:4,connectionTimeoutMillis:2500,
    idleTimeoutMillis:10000,application_name:"socthink-platform-auth"});
  return pool;
}
function requireSubject(value:string){
  if(!PLATFORM_SUBJECT_PATTERN.test(value))throw new PlatformAuthError("INVALID_SUBJECT",400);
}
type GrantRow={subject:string;capability:string;role:PlatformRole;
  scope_kind:PlatformScopeKind;scope_id:string;granted_at:Date};
function mapped(r:GrantRow):PlatformGrant{
  return {subject:r.subject,capability:r.capability,role:r.role,
    scopeKind:r.scope_kind,scopeId:r.scope_id,grantedAt:r.granted_at.toISOString()};
}
export async function activePlatformGrants(subject:string):Promise<PlatformGrant[]>{
  requireSubject(subject);
  const q=await platformPool().query<GrantRow>(
    `SELECT subject,capability,role,scope_kind,scope_id,granted_at
       FROM platform.role_grants
      WHERE subject=$1 AND state='active'
      ORDER BY capability,role,scope_kind,scope_id`,[subject]);
  return q.rows.map(mapped);
}
export async function myAuthorizedModules(subject:string):Promise<AuthorizedModule[]>{
  const grants=await activePlatformGrants(subject);
  return PLATFORM_CAPABILITIES.flatMap(cap=>{
    if(!cap.implemented||!cap.managementUrl)return [];
    const mine=grants.filter(g=>g.capability===cap.id);
    if(!mine.length)return [];
    return [{
      id:cap.id,name:cap.name,product:cap.product,managementUrl:cap.managementUrl,
      grants:mine.map(({role,scopeKind,scopeId})=>({role,scopeKind,scopeId})),
    }];
  });
}
export type GrantChange={
  subject:string;capability:string;role:PlatformRole;
  scopeKind:PlatformScopeKind;scopeId:string;action:"grant"|"revoke";
};
export function validatedGrantChange(body:Record<string,unknown>):GrantChange{
  const subject=body.subject;
  if(typeof subject!=="string"||!PLATFORM_SUBJECT_PATTERN.test(subject))
    throw new PlatformAuthError("INVALID_SUBJECT",400);
  const cap=platformCapability(body.capability);
  if(!cap||!cap.implemented)throw new PlatformAuthError("CAPABILITY_NOT_READY",400);
  if(!platformRole(body.role))throw new PlatformAuthError("INVALID_ROLE",400);
  const scope=platformScope(body.scopeKind,body.scopeId);
  if(!scope)throw new PlatformAuthError("INVALID_SCOPE",400);
  // Teaching adapters currently enforce local class membership only. Until
  // they accept a platform org-scoped assertion, only product-level visibility
  // grants are available. Recording a misleading org-specific grant would
  // otherwise allow a user to see other local organizations.
  if(scope.kind!=="product")
    throw new PlatformAuthError("ORG_SCOPE_ADAPTER_NOT_READY",400);
  if(body.action!=="grant"&&body.action!=="revoke")
    throw new PlatformAuthError("INVALID_ACTION",400);
  return {subject,capability:cap.id,role:body.role,
    scopeKind:scope.kind,scopeId:scope.id,action:body.action};
}
export async function updatePlatformGrant(actor:string,change:GrantChange):
  Promise<{active:boolean;changed:boolean}>{
  requireSubject(actor);
  // Scoped, audited and idempotent. Transaction prevents losing audit rows.
  const client=await platformPool().connect();
  try{
    await client.query("BEGIN");
    const args=[change.subject,change.capability,change.role,
      change.scopeKind,change.scopeId,actor];
    let changed=false;
    if(change.action==="grant"){
      const result=await client.query(
        `INSERT INTO platform.role_grants
         (subject,capability,role,scope_kind,scope_id,granted_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT(subject,capability,role,scope_kind,scope_id)
         DO UPDATE SET state='active',revoked_at=NULL,granted_by=EXCLUDED.granted_by,
           granted_at=now(),changed_at=now()
         WHERE platform.role_grants.state='revoked'
         RETURNING id`,args);
      changed=Boolean(result.rowCount);
    }else{
      const result=await client.query(
        `UPDATE platform.role_grants SET state='revoked',revoked_at=now(),changed_at=now()
          WHERE subject=$1 AND capability=$2 AND role=$3 AND scope_kind=$4
            AND scope_id=$5 AND state='active' RETURNING id`,args.slice(0,5));
      changed=Boolean(result.rowCount);
    }
    if(changed)await client.query(
      `INSERT INTO platform.role_grant_audit
       (subject,capability,role,scope_kind,scope_id,action,actor)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,[...args.slice(0,5),change.action,actor]);
    await client.query("COMMIT");
    return {active:change.action==="grant",changed};
  }catch(e){await client.query("ROLLBACK").catch(()=>undefined);throw e}
  finally{client.release()}
}
