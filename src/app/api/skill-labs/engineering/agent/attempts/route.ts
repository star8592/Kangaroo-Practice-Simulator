import {NextRequest,NextResponse} from "next/server";
import {getQuickJS} from "quickjs-emscripten";
import {userFromRequest} from "@/lib/auth";
import {isVerifiedCareerStudyIdentity} from "@/lib/career-attempt-store";
import {validCareerOrigin} from "@/lib/career-interview-security";
import {allowAuthAction} from "@/lib/auth-action-limit";
import {gradeCodeWithQuickJS} from "@/lib/code-lab-engine";
import {AGENT_CODE_CHALLENGES} from "@/lib/agent-code-challenges";
import {
 AgentAttemptConflictError,isAgentAttemptId,recordAgentCodeAttempt,listAgentCodeAttemptSummaries,
 AGENT_CODE_ATTEMPT_VERSION,
} from "@/lib/agent-code-attempt-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=20;
const PRIVATE={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization","X-Robots-Tag":"noindex"};
const reply=(data:object,status=200,extra?:Record<string,string>)=>
 NextResponse.json(data,{status,headers:{...PRIVATE,...extra}});

/** Only a verified WeChat learner sees their own server-verified attempt history. */
export async function GET(req:NextRequest){
 const user=userFromRequest(req);
 if(!isVerifiedCareerStudyIdentity(user))
  return reply({code:"WECHAT_LOGIN_REQUIRED",message:"微信登录后可以保存和查看作业记录"},401);
 try{
  const attempts=listAgentCodeAttemptSummaries(user.id,30);
  return reply({version:AGENT_CODE_ATTEMPT_VERSION,persistence:"account",attempts});
 }catch{
  return reply({code:"AGENT_HISTORY_UNAVAILABLE",message:"学习记录暂时无法读取"},503);
 }
}

/** The client sends *source*, not a score; QuickJS re-runs actual tests.
 * No OS subprocess, eval(), real ticket data, model API, or payment tool.
 * Learners must explicitly press "save", otherwise source never leaves browser.
 */
export async function POST(req:NextRequest){
 if(!validCareerOrigin(req))return reply({code:"INVALID_ORIGIN"},403);
 const user=userFromRequest(req);
 if(!isVerifiedCareerStudyIdentity(user))
  return reply({code:"WECHAT_LOGIN_REQUIRED",message:"请先使用微信登录后保存"},401);
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
  return reply({code:"INVALID_CONTENT_TYPE"},415);
 const len=Number(req.headers.get("content-length")||0);
 if(len>12000)return reply({code:"REQUEST_TOO_LARGE"},413);
 let body:unknown;
 try{
  const raw=await req.text();
  if(Buffer.byteLength(raw,"utf8")>12000)return reply({code:"REQUEST_TOO_LARGE"},413);
  body=JSON.parse(raw);
 }catch{return reply({code:"INVALID_REQUEST"},400);}
 if(!body||typeof body!=="object"||Array.isArray(body))
  return reply({code:"INVALID_REQUEST"},400);
 const x=body as Record<string,unknown>;
 if(typeof x.taskId!=="string"||!AGENT_CODE_CHALLENGES.some(t=>t.id===x.taskId)||
    typeof x.source!=="string"||!x.source.trim()||x.source.length>5000||
    !isAgentAttemptId(x.attemptId))
  return reply({code:"INVALID_ATTEMPT",message:"作业编号或代码不符合提交规范"},400);
 // In-process throttles mitigate accidental repeat submissions. They are NOT
 // distributed quotas; a production abuse gateway must enforce global limits.
 const minute=allowAuthAction("agent-code-minute:"+user.id,12,60_000);
 if(!minute.allowed)return reply({code:"TRY_LATER"},429,{"Retry-After":String(minute.retryAfterSeconds)});
 const hour=allowAuthAction("agent-code-hour:"+user.id,120,3_600_000);
 if(!hour.allowed)return reply({code:"TRY_LATER"},429,{"Retry-After":String(hour.retryAfterSeconds)});
 try{
  const engine=await getQuickJS();
  const grade=gradeCodeWithQuickJS(engine,x.taskId,x.source,{collectAll:true});
  const result=recordAgentCodeAttempt({
   ownerId:user.id,attemptId:x.attemptId,taskId:x.taskId,source:x.source,grade,
  });
  return reply({saved:true,sourceStored:false,reportKind:"formative-code-test",
   summary:result.summary,alreadySaved:result.alreadySaved,
   feedback:grade.message});
 }catch(error){
  if(error instanceof AgentAttemptConflictError)return reply({code:"ATTEMPT_ID_CONFLICT"},409);
  return reply({code:"AGENT_GRADING_UNAVAILABLE",message:"服务器复测暂时不可用，请保留本地代码后重试"},503);
 }
}
