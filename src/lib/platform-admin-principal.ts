/**
 * Shared server-side bridge from the legacy administrator session to the
 * independently verified site-owner WeChat session.
 *
 * This is authorization, not a role preference. Never accept a client role
 * flag, display name, email or query parameter as administrative proof.
 * Existing write audit trails keep their original admin principal ID, which
 * is cryptographically bound to the site owner at bootstrap.
 */
import {isAdmin,SESSION_COOKIE,userFromSessionToken} from "./auth";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "./parent-auth";
import {isSiteOwner,readSiteOwner} from "./site-owner";

type CookieReader={get(name:string):{value:string}|undefined};
export type PlatformAdminPrincipal={
 source:"legacy-admin"|"wechat-site-owner";
 actorId:string;
};

const AUDIT_ADMIN_ID=/^adm_[0-9a-f]{16}$/;
export function platformAdminPrincipal(cookies:CookieReader):PlatformAdminPrincipal|null{
 const legacy=userFromSessionToken(cookies.get(SESSION_COOKIE)?.value);
 if(isAdmin(legacy)&&AUDIT_ADMIN_ID.test(legacy.id))
  return {source:"legacy-admin",actorId:legacy.id};
 const parent=parentFromSessionToken(cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!isSiteOwner(parent))return null;
 const binding=readSiteOwner();
 if(!binding||binding.parentId!==parent?.id||!AUDIT_ADMIN_ID.test(binding.grantedByAdminId))
  return null;
 return {source:"wechat-site-owner",actorId:binding.grantedByAdminId};
}
export function canManagePlatform(cookies:CookieReader):boolean{
 return platformAdminPrincipal(cookies)!==null;
}
