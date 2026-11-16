import crypto from "node:crypto";
import { hashScryptSecret, readSignedJsonToken, signJsonToken, verifyScryptSecret } from "./auth-crypto";
import { atomicWriteJson, readJsonArrayStrict, readOrCreateSecret, userDataPath } from "./user-data-store";

export type ParentUser={
  id:string;
  email?:string;
  name:string;
  passwordHash?:string;
  emailVerifiedAt?:number;
  wechatId?:string;
  wechatOpenId?:string;
  wechatUnionId?:string;
  wechatWebsiteOpenId?:string;
  wechatOfficialOpenId?:string;
  wechatAvatarUrl?:string;
  termsAcceptedAt:number;
  guardianConfirmedAt:number;
  createdAt:number;
  active:boolean;
  role:"parent";
  sessionVersion:number;
  lastLoginAt?:number;
};
export type PublicParent=Omit<ParentUser,
 "passwordHash"|"wechatUnionId"|"wechatWebsiteOpenId"|"wechatOfficialOpenId">;
export const PARENT_SESSION_COOKIE="socthink_parent_session";
export const PARENT_SESSION_TTL_SECONDS=30*24*60*60;

const FILE=userDataPath("parents.json");
const SECRET=userDataPath("parent-session-secret.txt");

function sessionSecret(){return readOrCreateSecret(SECRET)}
function normalizeEmail(x:string|undefined){return (x||"").trim().toLowerCase()}
export function validEmail(email:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))&&email.length<=254}
export function validatePassword(password:string){if(password.length<8)return "密码至少 8 位";if(password.length>128)return "密码过长";return null}
export function hashPassword(password:string){return hashScryptSecret(password)}
function verifyPassword(password:string,encoded:string){return verifyScryptSecret(password,encoded)}
function pub(u:ParentUser):PublicParent{
 const {passwordHash,wechatUnionId,wechatWebsiteOpenId,wechatOfficialOpenId,...x}=u;
 void passwordHash;void wechatUnionId;void wechatWebsiteOpenId;void wechatOfficialOpenId;
 return x;
}

function loadParents():ParentUser[]{return readJsonArrayStrict<ParentUser>(FILE).map(u=>({...u,email:normalizeEmail(u.email)||undefined,role:"parent",active:u.active!==false,sessionVersion:Math.max(1,Number(u.sessionVersion)||1)}))}
function saveParents(rows:ParentUser[]){atomicWriteJson(FILE,rows)}
export function parentByEmail(email:string){const k=normalizeEmail(email);return k?loadParents().find(x=>x.email===k):undefined}
/** Internal check for independently scoped family practice sessions.
 * Never return a parent's details in the public student token.
 */
export function activeParentSessionVersion(parentId:string):number|null{
 const parent=loadParents().find(x=>x.id===parentId && x.active);
 return parent ? parent.sessionVersion||1 : null;
}
export function parentByWechatId(wechatId:string){const k=wechatId.trim();return k?loadParents().find(x=>x.wechatId===k||x.wechatOpenId===k):undefined}

export function createParent(input:{email:string;name:string;passwordHash:string;termsAcceptedAt:number;guardianConfirmedAt:number}){
  const rows=loadParents(),email=normalizeEmail(input.email),name=input.name.trim().slice(0,60);
  if(!validEmail(email)||!name||!input.passwordHash)throw new Error("注册信息不完整");
  if(rows.some(x=>x.email===email))throw new Error("该邮箱已经注册");
  if(!input.termsAcceptedAt||!input.guardianConfirmedAt)throw new Error("请确认监护人身份并同意相关条款");
  const u:ParentUser={id:"par_"+crypto.randomBytes(9).toString("hex"),email,name,passwordHash:input.passwordHash,emailVerifiedAt:Date.now(),termsAcceptedAt:input.termsAcceptedAt,guardianConfirmedAt:input.guardianConfirmedAt,createdAt:Date.now(),active:true,role:"parent",sessionVersion:1};
  rows.push(u);saveParents(rows);return pub(u);
}

export function authenticateParent(email0:string,password:string){
  const email=normalizeEmail(email0),rows=loadParents(),u=rows.find(x=>x.email===email&&x.active);
  if(!u||!u.passwordHash||!verifyPassword(password,u.passwordHash))return null;
  u.lastLoginAt=Date.now();saveParents(rows);return pub(u);
}

export function authenticateOrCreateWechatParent(input:{
 wechatId:string;openId?:string;unionId?:string;
 oauthMode?:"website"|"official_account";name?:string;avatarUrl?:string;
}){
 const rows=loadParents();
 const wechatId=input.wechatId.trim(),openId=input.openId?.trim(),unionId=input.unionId?.trim();
 const mode=input.oauthMode;
 if(!wechatId)throw new Error("微信用户标识缺失");
 const matched=rows.filter(x=>
   Boolean(unionId&&(x.wechatUnionId===unionId||x.wechatId===unionId))||
   Boolean(openId&&(
     (mode==="website"&&x.wechatWebsiteOpenId===openId)||
     (mode==="official_account"&&x.wechatOfficialOpenId===openId)||
     x.wechatOpenId===openId))||
   x.wechatId===wechatId);
 // Historic desktop and Official Account logins sometimes created two rows
 // before their AppIDs were bound to the same WeChat Open Platform account.
 // A verified UnionID takes precedence over an AppID-scoped legacy OpenID.
 // Resolve the current session to the canonical UnionID row; do not delete,
 // merge, revoke, or silently rewrite the other row or its classroom records.
 function identityRank(x:ParentUser):number{
   if(unionId&&(x.wechatUnionId===unionId||x.wechatId===unionId))return 4;
   if(x.wechatUnionId&&openId&&(
     x.wechatWebsiteOpenId===openId||x.wechatOfficialOpenId===openId||
     x.wechatOpenId===openId))return 3;
   if(openId&&(
     (mode==="website"&&x.wechatWebsiteOpenId===openId)||
     (mode==="official_account"&&x.wechatOfficialOpenId===openId)))return 2;
   return 1;
 }
 const ranked=matched.map(x=>({user:x,rank:identityRank(x)}))
   .sort((a,b)=>b.rank-a.rank);
 if(ranked.length>1&&ranked[0].rank===ranked[1].rank)
   throw new Error("WECHAT_CROSS_APP_ACCOUNT_CONFLICT");
 let u=ranked[0]?.user;
 // Even an exact scoped OpenID cannot override a different verified UnionID.
 if(unionId&&matched.some(x=>x.wechatUnionId&&x.wechatUnionId!==unionId))
   throw new Error("WECHAT_UNIONID_MISMATCH");
 if(!u){
   u={id:"par_"+crypto.randomBytes(9).toString("hex"),
     name:(input.name||"微信家长").trim().slice(0,60)||"微信家长",
     wechatId:unionId||wechatId,wechatOpenId:openId,
     wechatUnionId:unionId,
     wechatWebsiteOpenId:mode==="website"?openId:undefined,
     wechatOfficialOpenId:mode==="official_account"?openId:undefined,
     wechatAvatarUrl:input.avatarUrl?.trim()||undefined,
     termsAcceptedAt:Date.now(),guardianConfirmedAt:Date.now(),
     createdAt:Date.now(),lastLoginAt:Date.now(),
     active:true,role:"parent",sessionVersion:1};
   rows.push(u);
 }else{
   // Never demote a verified UnionID back to one AppID-scoped OpenID.
   if(unionId){u.wechatUnionId=unionId;u.wechatId=unionId}
   if(openId){
     // Preserve the original legacy OpenID (potentially the website OpenID).
     // The two mode-scoped fields carry future app-specific identities.
     if(!u.wechatOpenId)u.wechatOpenId=openId;
     if(mode==="website")u.wechatWebsiteOpenId=openId;
     if(mode==="official_account")u.wechatOfficialOpenId=openId;
   }
   if(input.name&&!u.name)u.name=input.name.trim().slice(0,60);
   if(input.avatarUrl)u.wechatAvatarUrl=input.avatarUrl.trim();
   u.lastLoginAt=Date.now();
 }
 saveParents(rows);return pub(u);
}

export function resetParentPassword(email0:string,newPassword:string){
  const err=validatePassword(newPassword);if(err)throw new Error(err);
  const email=normalizeEmail(email0),rows=loadParents(),u=rows.find(x=>x.email===email&&x.active);
  if(!u)throw new Error("账号不存在");
  u.passwordHash=hashPassword(newPassword);u.sessionVersion=(u.sessionVersion||1)+1;saveParents(rows);return pub(u);
}

export function createParentSessionToken(uid:string,ttl=PARENT_SESSION_TTL_SECONDS){
  const u=loadParents().find(x=>x.id===uid&&x.active);if(!u)throw new Error("家长账号不存在或已停用");
  return signJsonToken({uid,ver:u.sessionVersion||1,exp:Math.floor(Date.now()/1000)+ttl},sessionSecret());
}

function verifiedPrivateParentFromSession(token:string|undefined|null):ParentUser|null {
  const x=readSignedJsonToken<{uid?:string;ver?:number;exp?:number}>(token,sessionSecret());
  if(!x?.uid||!x.exp||x.exp<Math.floor(Date.now()/1000))return null;
  const u=loadParents().find(v=>v.id===x.uid&&v.active);
  if(!u||(u.sessionVersion||1)!==(x.ver??1))return null;
  return u;
}
export function parentFromSessionToken(token:string|undefined|null):PublicParent|null{
  const privateRecord=verifiedPrivateParentFromSession(token);
  return privateRecord?pub(privateRecord):null;
}
/** Server-side JSAPI eligibility only: never serialize or log the OpenID.
 * OpenIDs are AppID-scoped; a desktop Website OpenID cannot substitute.
 */
export function officialWechatOpenIdForSession(token:string|undefined|null):string|null{
  return verifiedPrivateParentFromSession(token)?.wechatOfficialOpenId??null;
}

/** Admin-only consumers: displayable, already verified WeChat accounts.
 * Never return WeChat OpenID, email, session token or password fields.
 */
export function listWechatParentCandidates():Array<{id:string;name:string;lastLoginAt:number|null}>{
  return loadParents()
    .filter(p=>p.active && Boolean(p.wechatId||p.wechatOpenId))
    .map(p=>({id:p.id,name:p.name,lastLoginAt:p.lastLoginAt??null}));
}

/** Owner-only administration lookup; never return raw OpenID or password data. */
export function platformWechatAccountById(subject:string):PublicParent|null{
 if(!/^par_[a-f0-9]{18}$/.test(subject))return null;
 const u=loadParents().find(p=>p.id===subject&&p.active&&(p.wechatId||p.wechatOpenId));
 return u?pub(u):null;
}
export function searchWechatAccountsForOwner(query:string,limit=40){
 const q=query.trim().toLowerCase().slice(0,80);
 if(!q)return [];
 return loadParents().filter(p=>p.active&&(p.wechatId||p.wechatOpenId)&&
   (p.id===q||p.name.toLowerCase().includes(q)||p.email?.toLowerCase().includes(q)))
   .slice(0,Math.min(40,Math.max(1,limit)))
   .map(p=>({subject:p.id,name:p.name,email:p.email||null,
     lastLoginAt:p.lastLoginAt||null}));
}
