import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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

const DIR=path.join(process.cwd(),"private","users");
const FILE=path.join(DIR,"parents.json");
const SECRET=path.join(DIR,"parent-session-secret.txt");

function ensure(){fs.mkdirSync(DIR,{recursive:true})}
function sessionSecret(){ensure();if(!fs.existsSync(SECRET))fs.writeFileSync(SECRET,crypto.randomBytes(48).toString("hex"),{mode:0o600});return fs.readFileSync(SECRET,"utf8").trim()}
function normalizeEmail(x:string){return x.trim().toLowerCase()}
function atomicJson(file:string,value:unknown){ensure();const tmp=file+".tmp";fs.writeFileSync(tmp,JSON.stringify(value,null,2));fs.renameSync(tmp,file)}
export function validEmail(email:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))&&email.length<=254}
export function validatePassword(password:string){if(password.length<8)return "密码至少 8 位";if(password.length>128)return "密码过长";return null}
export function hashPassword(password:string){const salt=crypto.randomBytes(16).toString("hex");return "scrypt$"+salt+"$"+crypto.scryptSync(password,salt,32).toString("hex")}
function verifyPassword(password:string,encoded:string){const [kind,salt,expected]=encoded.split("$");if(kind!=="scrypt"||!salt||!expected)return false;const a=crypto.scryptSync(password,salt,32),b=Buffer.from(expected,"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function pub(u:ParentUser):PublicParent{const {passwordHash,...x}=u;void passwordHash;return x}

export function loadParents():ParentUser[]{ensure();if(!fs.existsSync(FILE))return[];try{const x=JSON.parse(fs.readFileSync(FILE,"utf8"));return Array.isArray(x)?x.map((u:ParentUser)=>({...u,email:normalizeEmail(u.email),role:"parent",active:u.active!==false,sessionVersion:Math.max(1,Number(u.sessionVersion)||1)})):[]}catch{return[]}}
export function saveParents(rows:ParentUser[]){atomicJson(FILE,rows)}
export function parentByEmail(email:string){const k=normalizeEmail(email);return loadParents().find(x=>x.email===k)}
export function publicParentById(id:string){const u=loadParents().find(x=>x.id===id&&x.active);return u?pub(u):null}

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
  const body=Buffer.from(JSON.stringify({uid,ver:u.sessionVersion||1,exp:Math.floor(Date.now()/1000)+ttl})).toString("base64url");
  const sig=crypto.createHmac("sha256",sessionSecret()).update(body).digest("base64url");
  return body+"."+sig;
}

export function parentFromSessionToken(token:string|undefined|null):PublicParent|null{
  if(!token)return null;const [body,sig]=token.split(".");if(!body||!sig)return null;
  const expected=crypto.createHmac("sha256",sessionSecret()).update(body).digest("base64url");
  const a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  try{const x=JSON.parse(Buffer.from(body,"base64url").toString()) as {uid?:string;ver?:number;exp?:number};if(!x.uid||!x.exp||x.exp<Math.floor(Date.now()/1000))return null;const u=loadParents().find(v=>v.id===x.uid&&v.active);if(!u||(u.sessionVersion||1)!==(x.ver??1))return null;return pub(u)}catch{return null}
}
