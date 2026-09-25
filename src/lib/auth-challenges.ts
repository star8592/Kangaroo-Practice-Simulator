import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type AuthPurpose="register"|"reset-password";
type Challenge={
  id:string;purpose:AuthPurpose;email:string;codeHash:string;createdAt:number;expiresAt:number;resendAfter:number;attempts:number;
  payload?:{name?:string;passwordHash?:string;termsAcceptedAt?:number;guardianConfirmedAt?:number};
};
const DIR=path.join(process.cwd(),"private","users");
const FILE=path.join(DIR,"auth-challenges.json");
const SECRET=path.join(DIR,"auth-challenge-secret.txt");
function ensure(){fs.mkdirSync(DIR,{recursive:true})}
function secret(){ensure();if(!fs.existsSync(SECRET))fs.writeFileSync(SECRET,crypto.randomBytes(48).toString("hex"),{mode:0o600});return fs.readFileSync(SECRET,"utf8").trim()}
function load():Challenge[]{ensure();if(!fs.existsSync(FILE))return[];try{const x=JSON.parse(fs.readFileSync(FILE,"utf8"));return Array.isArray(x)?x:[]}catch{return[]}}
function save(rows:Challenge[]){ensure();const tmp=FILE+".tmp";fs.writeFileSync(tmp,JSON.stringify(rows,null,2));fs.renameSync(tmp,FILE)}
function hash(purpose:AuthPurpose,email:string,code:string){return crypto.createHmac("sha256",secret()).update(purpose+"|"+email.trim().toLowerCase()+"|"+code).digest("hex")}
function prune(rows:Challenge[],now=Date.now()){return rows.filter(x=>x.expiresAt>now&&x.attempts<6)}
export function newCode(){return String(crypto.randomInt(0,1_000_000)).padStart(6,"0")}
export function issueChallenge(input:{purpose:AuthPurpose;email:string;code:string;payload?:Challenge["payload"]},now=Date.now()){
  const email=input.email.trim().toLowerCase(),rows=prune(load(),now),old=rows.find(x=>x.purpose===input.purpose&&x.email===email);
  if(old&&old.resendAfter>now)throw new Error("验证码发送过于频繁，请稍后再试");
  const next=rows.filter(x=>!(x.purpose===input.purpose&&x.email===email));
  const row:Challenge={id:"chal_"+crypto.randomBytes(8).toString("hex"),purpose:input.purpose,email,codeHash:hash(input.purpose,email,input.code),createdAt:now,expiresAt:now+10*60*1000,resendAfter:now+60*1000,attempts:0,payload:input.payload};
  next.push(row);save(next);return row;
}
export function cancelChallenge(purpose:AuthPurpose,email0:string){const email=email0.trim().toLowerCase();save(load().filter(x=>!(x.purpose===purpose&&x.email===email)))}
export function verifyChallenge(purpose:AuthPurpose,email0:string,code:string,now=Date.now()){
  const email=email0.trim().toLowerCase(),rows=load(),row=rows.find(x=>x.purpose===purpose&&x.email===email);
  if(!row||row.expiresAt<=now)throw new Error("验证码已失效，请重新获取");
  row.attempts=(row.attempts||0)+1;
  const got=hash(purpose,email,code),a=Buffer.from(got),b=Buffer.from(row.codeHash);
  const ok=a.length===b.length&&crypto.timingSafeEqual(a,b);
  if(!ok){save(prune(rows,now));throw new Error(row.attempts>=5?"验证码错误次数过多，请重新获取":"验证码不正确")}
  save(rows.filter(x=>x.id!==row.id));return row;
}
