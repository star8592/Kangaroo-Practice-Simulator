import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_STUDENT_AVATAR, isStudentAvatarKey } from "./student-avatar";
import { hashScryptSecret, readSignedJsonToken, signJsonToken, verifyScryptSecret } from "./auth-crypto";

export type StudentUser={
 id:string;username:string;candidateNo:string;name:string;grade:number;school?:string;avatarKey?:string;onboardingCompleted?:boolean;
 pinHash:string;createdAt:number;active:boolean;role:"student"|"admin";
 sessionVersion?:number;lastLoginAt?:number;
};
export type PublicStudent=Omit<StudentUser,"pinHash">;
export const SESSION_COOKIE="kangaroo_session";
const DIR=path.join(process.cwd(),"private","users"),USERS=path.join(DIR,"users.json"),SECRET=path.join(DIR,"session-secret.txt");
function ensure(){fs.mkdirSync(DIR,{recursive:true})}
function secret(){ensure();if(!fs.existsSync(SECRET))fs.writeFileSync(SECRET,crypto.randomBytes(48).toString("hex"),{mode:0o600});return fs.readFileSync(SECRET,"utf8").trim()}
function hashPin(pin:string){return hashScryptSecret(pin)}
function verifyPin(pin:string,encoded:string){return verifyScryptSecret(pin,encoded)}
function normalize(u:StudentUser):StudentUser{const role=u.role==="admin"?"admin":"student";return{...u,role,sessionVersion:Math.max(1,Number(u.sessionVersion)||1),avatarKey:role==="student"?(isStudentAvatarKey(u.avatarKey)?u.avatarKey:DEFAULT_STUDENT_AVATAR):u.avatarKey,onboardingCompleted:role==="student"?u.onboardingCompleted===true:u.onboardingCompleted}}
export function loadUsers():StudentUser[]{ensure();if(!fs.existsSync(USERS))return[];try{const x=JSON.parse(fs.readFileSync(USERS,"utf8"));return Array.isArray(x)?x.map(normalize):[]}catch{return[]}}
function saveUsers(x:StudentUser[]){ensure();const tmp=`${USERS}.tmp`;fs.writeFileSync(tmp,JSON.stringify(x.map(normalize),null,2));fs.renameSync(tmp,USERS)}
function pub(u:StudentUser):PublicStudent{const{pinHash,...x}=normalize(u);void pinHash;return x}
export function authenticate(k0:string,pin:string){
 const k=k0.trim().toLowerCase(),users=loadUsers(),u=users.find(x=>x.active&&(x.username.toLowerCase()===k||x.candidateNo.toLowerCase()===k));
 if(!u||!verifyPin(pin,u.pinHash))return null;
 u.lastLoginAt=Date.now();saveUsers(users);return pub(u);
}
export function publicUserById(id:string){const u=loadUsers().find(x=>x.id===id&&x.active);return u?pub(u):null}
export function createSessionToken(uid:string,ttl=604800){const u=loadUsers().find(x=>x.id===uid&&x.active);if(!u)throw new Error("用户不存在或已停用");return signJsonToken({uid,ver:u.sessionVersion||1,exp:Math.floor(Date.now()/1000)+ttl},secret())}
export function userFromSessionToken(t:string|undefined|null):PublicStudent|null{
 const x=readSignedJsonToken<{uid?:string;ver?:number;exp?:number}>(t,secret());if(!x?.uid||!x.exp||x.exp<Math.floor(Date.now()/1000))return null;
 const u=loadUsers().find(v=>v.id===x.uid&&v.active);if(!u)return null;const tokenVersion=x.ver??1;if((u.sessionVersion||1)!==tokenVersion)return null;return pub(u)
}
export const isAdmin=(u:PublicStudent|null|undefined)=>u?.role==="admin";
export function createStudent(input:{username:string;candidateNo:string;name:string;grade:number;school?:string;pin:string}){const users=loadUsers(),username=input.username.trim(),candidateNo=input.candidateNo.trim(),name=input.name.trim();if(!username||!candidateNo||!name||input.pin.length<4)throw new Error("学生信息或 PIN 不完整");if(users.some(x=>x.username.toLowerCase()===username.toLowerCase()))throw new Error("用户名已存在");if(users.some(x=>x.candidateNo.toLowerCase()===candidateNo.toLowerCase()))throw new Error("准考证号已存在");const u:StudentUser={id:`stu_${crypto.randomBytes(8).toString("hex")}`,username,candidateNo,name,grade:input.grade,school:input.school?.trim()||undefined,avatarKey:DEFAULT_STUDENT_AVATAR,onboardingCompleted:false,pinHash:hashPin(input.pin),createdAt:Date.now(),active:true,role:"student",sessionVersion:1};users.push(u);saveUsers(users);return pub(u)}
export function createAdmin(input:{username:string;name:string;pin:string}){const users=loadUsers(),username=input.username.trim(),name=input.name.trim(),candidateNo=`ADMIN-${username}`;if(!username||!name||input.pin.length<6)throw new Error("管理员信息不完整或 PIN 少于 6 位");if(users.some(x=>x.username.toLowerCase()===username.toLowerCase()))throw new Error("用户名已存在");if(users.some(x=>x.candidateNo.toLowerCase()===candidateNo.toLowerCase()))throw new Error("管理员编号已存在");const u:StudentUser={id:`adm_${crypto.randomBytes(8).toString("hex")}`,username,candidateNo,name,grade:0,pinHash:hashPin(input.pin),createdAt:Date.now(),active:true,role:"admin",sessionVersion:1};users.push(u);saveUsers(users);return pub(u)}
export function updateStudent(id:string,patch:{name?:string;grade?:number;school?:string;avatarKey?:string;onboardingCompleted?:boolean;pin?:string;active?:boolean}){
 const users=loadUsers(),u=users.find(x=>x.id===id&&x.role==="student");if(!u)throw new Error("学生不存在");
 if(patch.name!==undefined)u.name=patch.name.trim().slice(0,50);
 if(patch.grade!==undefined)u.grade=Math.max(1,Math.min(13,Math.round(patch.grade)));
 if(patch.school!==undefined)u.school=patch.school.trim().slice(0,80)||undefined;
 if(patch.avatarKey!==undefined){if(!isStudentAvatarKey(patch.avatarKey))throw new Error("请选择有效头像");u.avatarKey=patch.avatarKey}
 if(patch.onboardingCompleted!==undefined)u.onboardingCompleted=patch.onboardingCompleted;
 let revoke=false;
 if(patch.pin!==undefined){if(patch.pin.length<4)throw new Error("PIN 至少 4 位");u.pinHash=hashPin(patch.pin);revoke=true}
 if(patch.active!==undefined&&u.active!==patch.active){u.active=patch.active;revoke=true}
 if(revoke)u.sessionVersion=(u.sessionVersion||1)+1;
 saveUsers(users);return pub(u);
}
export function changeStudentPin(id:string,currentPin:string,newPin:string){
 const users=loadUsers(),u=users.find(x=>x.id===id&&x.role==="student"&&x.active);if(!u)throw new Error("学生不存在");
 if(!verifyPin(currentPin,u.pinHash))throw new Error("当前 PIN 不正确");
 if(!/^\d{4,12}$/.test(newPin))throw new Error("新 PIN 必须为 4–12 位数字");
 if(verifyPin(newPin,u.pinHash))throw new Error("新 PIN 不能与当前 PIN 相同");
 u.pinHash=hashPin(newPin);
 u.sessionVersion=(u.sessionVersion||1)+1;
 saveUsers(users);
 return pub(u);
}
