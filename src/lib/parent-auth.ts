import crypto from "node:crypto";
import { hashScryptSecret, readSignedJsonToken, signJsonToken, verifyScryptSecret } from "./auth-crypto";
import { atomicWriteJson, readJsonArray, readOrCreateSecret, userDataPath } from "./user-data-store";

export type ParentUser={
  id:string;
  email:string;
  name:string;
  passwordHash:string;
  emailVerifiedAt:number;
  termsAcceptedAt:number;
  guardianConfirmedAt:number;
  createdAt:number;
  active:boolean;
  role:"parent";
  sessionVersion:number;
  lastLoginAt?:number;
};
export type PublicParent=Omit<ParentUser,"passwordHash">;
export const PARENT_SESSION_COOKIE="socthink_parent_session";

const FILE=userDataPath("parents.json");
const SECRET=userDataPath("parent-session-secret.txt");

function sessionSecret(){return readOrCreateSecret(SECRET)}
function normalizeEmail(x:string){return x.trim().toLowerCase()}
export function validEmail(email:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))&&email.length<=254}
export function validatePassword(password:string){if(password.length<8)return "密码至少 8 位";if(password.length>128)return "密码过长";return null}
export function hashPassword(password:string){return hashScryptSecret(password)}
function verifyPassword(password:string,encoded:string){return verifyScryptSecret(password,encoded)}
function pub(u:ParentUser):PublicParent{const {passwordHash,...x}=u;void passwordHash;return x}

function loadParents():ParentUser[]{return readJsonArray<ParentUser>(FILE).map(u=>({...u,email:normalizeEmail(u.email),role:"parent",active:u.active!==false,sessionVersion:Math.max(1,Number(u.sessionVersion)||1)}))}
function saveParents(rows:ParentUser[]){atomicWriteJson(FILE,rows)}
export function parentByEmail(email:string){const k=normalizeEmail(email);return loadParents().find(x=>x.email===k)}

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
  if(!u||!verifyPassword(password,u.passwordHash))return null;
  u.lastLoginAt=Date.now();saveParents(rows);return pub(u);
}

export function resetParentPassword(email0:string,newPassword:string){
  const err=validatePassword(newPassword);if(err)throw new Error(err);
  const email=normalizeEmail(email0),rows=loadParents(),u=rows.find(x=>x.email===email&&x.active);
  if(!u)throw new Error("账号不存在");
  u.passwordHash=hashPassword(newPassword);u.sessionVersion=(u.sessionVersion||1)+1;saveParents(rows);return pub(u);
}

export function createParentSessionToken(uid:string,ttl=604800){
  const u=loadParents().find(x=>x.id===uid&&x.active);if(!u)throw new Error("家长账号不存在或已停用");
  return signJsonToken({uid,ver:u.sessionVersion||1,exp:Math.floor(Date.now()/1000)+ttl},sessionSecret());
}

export function parentFromSessionToken(token:string|undefined|null):PublicParent|null{
  const x=readSignedJsonToken<{uid?:string;ver?:number;exp?:number}>(token,sessionSecret());
  if(!x?.uid||!x.exp||x.exp<Math.floor(Date.now()/1000))return null;
  const u=loadParents().find(v=>v.id===x.uid&&v.active);if(!u||(u.sessionVersion||1)!==(x.ver??1))return null;return pub(u)
}
