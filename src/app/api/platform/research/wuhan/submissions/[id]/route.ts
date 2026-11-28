// Isolated preview only. Production requests fail closed.
import {NextRequest,NextResponse} from "next/server";
import {constants,openSync,fstatSync,readFileSync,closeSync} from "node:fs";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import {sameOriginMutation} from "@/lib/site-owner-bootstrap";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {billingPool} from "@/lib/billing-ledger";
import {parseScoringSubmission} from "@/lib/wuhan-scoring-submit";
import {sealScoringStage} from "@/lib/wuhan-scoring-stage";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const limit=28000000;
function answer(status:number,code:string,extra:Record<string,unknown>={}){return NextResponse.json({code,...extra},{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}})}
function stageKey(){
 const fd=openSync(process.env.SOCTHINK_WUHAN_STAGE_KEY_FILE||"",constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const st=fstatSync(fd);if(!st.isFile()||(st.mode&0o077)!==0||st.size>128)throw Error("key");const text=readFileSync(fd,"utf8").trim();if(!/^[a-f0-9]{64}$/.test(text))throw Error("key");return Buffer.from(text,"hex")}finally{closeSync(fd)}
}
async function identity(req:NextRequest,id:string){
 if(!voucherPreviewEnabled()||process.env.SOCTHINK_WUHAN_ASYNC_PREVIEW!=="1")return answer(404,"DISABLED");
 if(!/^[a-f0-9]{32}$/.test(id))return answer(404,"NOT_FOUND");
 if(!sameOriginMutation(req))return answer(403,"ORIGIN_REQUIRED");
 const user=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!user?.active||!(user.wechatId||user.wechatOpenId))return answer(401,"LOGIN_REQUIRED");
 return user;
}
async function readBody(req:NextRequest){
 const size=req.headers.get("content-length");
 if(size&&(!/^\d+$/.test(size)||Number(size)>limit))throw Error("body limit");
 if(!req.body)throw Error("missing body");
 const reader=req.body.getReader();const parts:Buffer[]=[];let n=0;
 try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.byteLength;if(n>limit){await reader.cancel();throw Error("body limit")}parts.push(Buffer.from(r.value))}}
 finally{reader.releaseLock()}
 return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const who=await identity(req,id);if(who instanceof NextResponse)return who;
 if(req.headers.get("content-type")?.split(";")[0]!=="application/json")return answer(415,"JSON_REQUIRED");
 let s:ReturnType<typeof parseScoringSubmission>;
 try{s=parseScoringSubmission(id,await readBody(req))}catch{return answer(400,"INVALID_SUBMISSION")}
 let key:Buffer;
 try{key=stageKey()}catch{return answer(503,"STAGE_UNAVAILABLE")}
 const c=await billingPool().connect().catch(()=>null);
 if(!c){key.fill(0);return answer(503,"STAGE_UNAVAILABLE")}
 try{
  await c.query("BEGIN");
  const bound=(await c.query("SELECT exam_access_draft.inspect_research_attempt_access($1,$2,$3) AS v",[id,who.id,s.paper])).rows[0]?.v;
  if(Number(bound)!==who.sessionVersion||bound===null){await c.query("ROLLBACK");return answer(404,"NOT_FOUND")}
  const consent=(await c.query("SELECT exam_access_draft.grant_scoring_consent($1,$2,$3) AS v",[who.id,id,who.sessionVersion])).rows[0]?.v;
  if(consent!==true){await c.query("ROLLBACK");return answer(403,"CONSENT_UNAVAILABLE")}
  const stage=sealScoringStage(who.id,s,key);
  const result=(await c.query("SELECT exam_access_draft.stage_research_scoring($1,$2,$3,$4,$5) AS v",[who.id,id,s.paper,stage.manifest,stage.ciphertext])).rows[0]?.v;
  if(result!=="queued"&&result!=="already_queued"&&result!=="already_completed"){await c.query("ROLLBACK");return answer(["queue_full","owner_limit"].includes(result)?429:409,"SUBMISSION_NOT_ACCEPTED")}
  await c.query("COMMIT");
  return answer(result==="already_completed"?200:202,result==="already_completed"?"SCORING_COMPLETED":"SCORING_PENDING",{attempt_id:id,billable:false,report_url:"/account/research/wuhan/"+id});
 }catch{await c.query("ROLLBACK").catch(()=>{});return answer(503,"STAGE_UNAVAILABLE")}
 finally{key.fill(0);for(const r of s.recordings)r.audio.fill(0);c.release()}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const who=await identity(req,id);if(who instanceof NextResponse)return who;
 try{const result=(await billingPool().query("SELECT exam_access_draft.revoke_scoring_consent($1,$2) AS v",[who.id,id])).rows[0]?.v;return result===true?answer(200,"RECORDING_CONSENT_REVOKED"):answer(404,"NOT_FOUND")}
 catch{return answer(503,"STAGE_UNAVAILABLE")}
}
