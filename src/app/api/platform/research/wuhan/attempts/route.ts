import {NextRequest,NextResponse} from "next/server";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import {sameOriginMutation} from "@/lib/site-owner-bootstrap";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {billingPool} from "@/lib/billing-ledger";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const answer=(status:number,code:string,extra:Record<string,unknown>={})=>NextResponse.json({code,...extra},{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
export async function POST(req:NextRequest){
 if(!voucherPreviewEnabled()||process.env.SOCTHINK_WUHAN_ASYNC_PREVIEW!=="1")return answer(404,"DISABLED");
 if(!sameOriginMutation(req))return answer(403,"ORIGIN_REQUIRED");
 const token=req.cookies.get(PARENT_SESSION_COOKIE)?.value,user=parentFromSessionToken(token);
 if(!token||!user?.active||!(user.wechatId||user.wechatOpenId))return answer(401,"LOGIN_REQUIRED");
 // A verified signed session has already been checked above.
 let expiry:number;
 try{expiry=JSON.parse(Buffer.from(token.split(".")[0]!,"base64url").toString()).exp;if(!Number.isSafeInteger(expiry)||expiry<=Date.now()/1000)throw Error("expiry")}catch{return answer(401,"LOGIN_REQUIRED")}
 // Only a tiny fixed request is accepted; no browser-supplied identity.
 if(req.headers.get("content-type")?.split(";")[0]!=="application/json"||!req.body)return answer(400,"INVALID_PAPER");
 const reader=req.body.getReader();let raw="",n=0;
 try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.byteLength;if(n>128){await reader.cancel();return answer(400,"INVALID_PAPER")}raw+=Buffer.from(r.value).toString()}}catch{return answer(400,"INVALID_PAPER")}finally{reader.releaseLock()}
 let paper:string;
 try{const x=JSON.parse(raw);if(Object.keys(x).length!==1||typeof x.paper!=="string"||!/^WH(?:0[1-9]|10)$/.test(x.paper))throw Error("paper");paper=x.paper}catch{return answer(400,"INVALID_PAPER")}
 const c=await billingPool().connect().catch(()=>null);if(!c)return answer(503,"UNAVAILABLE");
 try{
  await c.query("BEGIN");
  const t=(await c.query("SELECT exam_access_draft.issue_research_ticket($1,$2,$3,$4) AS v",[user.id,user.sessionVersion,paper,expiry])).rows[0]?.v;
  if(!t){await c.query("ROLLBACK");return answer(429,"ATTEMPT_LIMIT")}
  const claimed=(await c.query("SELECT exam_access_draft.claim_research_ticket($1,$2,$3,$4) AS v",[t.ticket,paper,user.id,user.sessionVersion])).rows[0]?.v;
  if(!claimed||claimed.attempt_id!==t.attempt_id){await c.query("ROLLBACK");return answer(503,"UNAVAILABLE")}
  await c.query("COMMIT");
  return answer(201,"ATTEMPT_CREATED",{attempt_id:claimed.attempt_id,paper,billable:false});
 }catch{await c.query("ROLLBACK").catch(()=>{});return answer(503,"UNAVAILABLE")}
 finally{c.release()}
}
