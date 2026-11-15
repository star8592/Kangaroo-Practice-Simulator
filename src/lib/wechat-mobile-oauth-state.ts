import crypto from "node:crypto";
import {readOrCreateSecret, userDataPath} from "./user-data-store";

/** Multiple independent one-time OAuth journeys can coexist in one WeChat
 * browser (class links, the teacher console, /account) without the second
 * tab overwriting the first tab's state or return path. The cookie is signed
 * by the server, bound to the same browser, and never contains OAuth codes. */
export const WECHAT_MOBILE_FLOW_COOKIE="socthink_parent_wechat_flows";
const KEYFILE=userDataPath("wechat-mobile-flow-signing-key.txt");
const TTL_MS=10*60*1000;
const MAX_FLOWS=3;
const STATE=/^[0-9a-f]{48}$/;
type Flow={s:string;n:string;t:number};

function key():string{return readOrCreateSecret(KEYFILE)}
function sign(data:string):string{return crypto.createHmac("sha256",key()).update(data).digest("base64url")}
function decode(input:string|undefined,now:number):Flow[]{
 if(!input||input.length>3900)return [];
 const [payload,mac,extra]=input.split(".");
 if(!payload||!mac||extra)return [];
 const expected=sign(payload);
 if(mac.length!==expected.length||
   !crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return [];
 try{
  const flows:unknown=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
  if(!Array.isArray(flows))return [];
  return flows.filter((v):v is Flow=>{
   if(!v||typeof v!=="object")return false;
   const row=v as Record<string,unknown>;
   return typeof row.s==="string"&&STATE.test(row.s)&&
    typeof row.n==="string"&&validReturnPath(row.n)&&
    typeof row.t==="number"&&Number.isSafeInteger(row.t)&&
    row.t<=now+30_000&&row.t+TTL_MS>now;
  }).slice(-MAX_FLOWS);
 }catch{return []}
}
export function validReturnPath(next:string):boolean{
 return next.startsWith("/")&&!next.startsWith("//")&&
   !next.includes("\\")&&!Array.from(next).some(
     c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)&&next.length<=1024;
}
export function safeReturnPath(candidate:string|null|undefined):string{
 return candidate&&validReturnPath(candidate)?candidate:"/account";
}
function pack(flows:Flow[]):string{
 const payload=Buffer.from(JSON.stringify(flows)).toString("base64url");
 return payload+"."+sign(payload);
}
export function issueWechatMobileFlow(
 previous:string|undefined, next:string, now=Date.now()
):{state:string;cookie:string}{
 const state=crypto.randomBytes(24).toString("hex");
 const flows=decode(previous,now);
 flows.push({s:state,n:safeReturnPath(next),t:now});
 const retained=flows.slice(-MAX_FLOWS);
 // A browser cookie can hold at most ~4 KB. Preserve the newest journey,
 // discarding only older pending journeys if an unusually long next URL
 // would overflow the signed cookie.
 while(retained.length>1&&pack(retained).length>3500)retained.shift();
 return {state,cookie:pack(retained)};
}
export function validateWechatMobileFlow(
 cookie:string|undefined,state:string,now=Date.now()
):{next:string;remaining:string|null}|null{
 if(!STATE.test(state))return null;
 const flows=decode(cookie,now);
 const row=flows.find(x=>x.s===state);
 if(!row)return null;
 const pending=flows.filter(x=>x.s!==state);
 return {next:row.n,remaining:pending.length?pack(pending):null};
}

