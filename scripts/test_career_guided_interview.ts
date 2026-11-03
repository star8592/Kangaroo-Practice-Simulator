import assert from "node:assert/strict";
import {INTERVIEW_PROFILES,getInterviewProfile} from "../src/lib/career-interview-scenarios";
import {validateGuidedDecision,parseGuidedDecision,composeGuidedFollowup,makeGuidedMessages} from "../src/lib/career-guided-interview";
import {makeGuidedEvidenceMessages,parseGuidedEvidence} from "../src/lib/career-guided-evidence";
import {getConfig,modelTimeout,withModelBackup,callModel,providerLabels} from "../src/lib/career-model-routing";
import {probeCareerModelDelivery} from "../src/lib/career-model-readiness";
import type {Provider} from "../src/lib/career-model-routing";
import {EMPTY_INTERVIEW_JOB_CONTEXT} from "../src/lib/career-interview-context";

async function main(){
const answer="我负责订单支付系统的并发测试，没有记录历史错误率，但运行过故障注入。";
const base={profileId:"campus-software",questionId:"cs-project",answer,context:EMPTY_INTERVIEW_JOB_CONTEXT};
const decision={branch:"outcome" as const,evidenceQuote:"没有记录历史错误率",reason:"候选人给了过程但没有对结果的独立验证证据"};
assert.deepEqual(validateGuidedDecision(decision,answer),decision);
assert.deepEqual(parseGuidedDecision(JSON.stringify(decision),answer),decision);
assert.equal(parseGuidedDecision(JSON.stringify({...decision,branch:"ignore_policy"}),answer),null);
assert.equal(parseGuidedDecision(JSON.stringify({...decision,evidenceQuote:"不存在的原话"}),answer),null);
assert.equal(parseGuidedDecision(JSON.stringify({...decision,reason:"好"}),answer),null);
assert.equal(parseGuidedDecision("invalid",answer),null);
assert.equal(parseGuidedDecision("X".repeat(3000),answer),null);
const q=getInterviewProfile("campus-software")!.questions[1];
assert.equal(composeGuidedFollowup(q,decision).question,q.followups.outcome);
assert(makeGuidedMessages(base)[0].content.includes("不自行编写追问"));
assert(makeGuidedMessages(base)[1].content.includes(q.followups.depth));
for(const profile of INTERVIEW_PROFILES)for(const question of profile.questions){
 for(const branch of ["brief","ownership","outcome","depth"] as const){
  const produced=composeGuidedFollowup(question,{...decision,branch});
  assert.equal(produced.question,question.followups[branch]);
  assert(produced.question.length>=12);
 }
}
assert.equal(getConfig({SOCTHINK_INTERVIEW_AI_ENABLED:"0"}),null);
assert.equal(getConfig({SOCTHINK_INTERVIEW_AI_ENABLED:"1",SOCTHINK_INTERVIEW_AI_PROVIDER:"qwen"}),null);
const env={
 SOCTHINK_INTERVIEW_AI_ENABLED:"1",SOCTHINK_INTERVIEW_AI_PROVIDER:"mimo",
 MIMO_API_KEY:"fake-key-for-test-only",SOCTHINK_INTERVIEW_AI_BACKUP_PROVIDER:"deepseek",
 DEEPSEEK_API_KEY:"fake-backup-for-test-only",
};
assert.deepEqual(getConfig(env),{primary:"mimo",backup:"deepseek"});
assert.deepEqual(getConfig({...env,SOCTHINK_INTERVIEW_AI_BACKUP_PROVIDER:"mimo"}),{primary:"mimo",backup:null});
assert.equal(modelTimeout("primary",env),4500);
assert.equal(modelTimeout("backup",{SOCTHINK_INTERVIEW_AI_BACKUP_TIMEOUT_MS:"100"}),3500);
assert.equal(providerLabels.mimo,"小米 MiMo");
let attempts:Provider[]=[];
const stub=async(p:Provider)=>{
 attempts.push(p);
 if(p==="mimo")throw new Error("TEST_PROVIDER_DOWN");
 return {provider:p,content:JSON.stringify(decision),latencyMs:112};
};
const chosen=await withModelBackup(getConfig(env)!,makeGuidedMessages(base),txt=>parseGuidedDecision(txt,answer),stub as typeof callModel);
assert.equal(chosen?.provider,"deepseek");
assert.equal(chosen?.viaBackup,true);
assert.deepEqual(attempts,["mimo","deepseek"]);
attempts=[];
const invalidFirst=async(p:Provider)=>{
 attempts.push(p);
 return {provider:p,content:p==="mimo"?"not-json":JSON.stringify(decision),latencyMs:100};
};
assert.equal((await withModelBackup(getConfig(env)!,makeGuidedMessages(base),txt=>parseGuidedDecision(txt,answer),invalidFirst as typeof callModel))?.provider,"deepseek");
assert.deepEqual(attempts,["mimo","deepseek"]);
assert.equal(await withModelBackup({primary:"mimo",backup:null},makeGuidedMessages(base),()=>null,stub as typeof callModel),null);
assert.equal(await withModelBackup({primary:"mimo",backup:"deepseek"},makeGuidedMessages(base),()=>null,stub as typeof callModel),null);
let inspectedUrl="",inspectedBody:Record<string,unknown>={},inspectedAuthorization="";
const fakeRequest=async(url:RequestInfo|URL,init?:RequestInit)=>{
 inspectedUrl=String(url);
 inspectedBody=JSON.parse(String(init?.body||"{}"));
 inspectedAuthorization=String((init?.headers as Record<string,string>)?.Authorization||"");
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(decision)}}]}),{status:200,headers:{"Content-Type":"application/json"}});
};
const mimoResult=await callModel("mimo",makeGuidedMessages(base),1500,env,fakeRequest as typeof fetch);
assert.equal(mimoResult.provider,"mimo");
assert.equal(inspectedUrl,"https://api.xiaomimimo.com/v1/chat/completions");
assert.deepEqual(inspectedBody.thinking,{type:"disabled"});
assert.equal(inspectedBody.max_completion_tokens,320);
assert.equal(inspectedAuthorization,"Bearer fake-key-for-test-only");
const qwenEnv={SOCTHINK_INTERVIEW_AI_PROVIDER:"qwen",DASHSCOPE_API_KEY:"unit-test-only"};
await callModel("qwen",makeGuidedMessages(base),1500,qwenEnv,fakeRequest as typeof fetch);
assert.equal(inspectedUrl,"https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
assert.equal(inspectedBody.model,"qwen3.8-flash");
assert.equal(inspectedAuthorization,"Bearer unit-test-only");
const ollamaEnv={SOCTHINK_INTERVIEW_AI_PROVIDER:"ollama",SOCTHINK_INTERVIEW_AI_MODEL:"qwen3:4b-instruct-2507-q4_K_M"};
await callModel("ollama",makeGuidedMessages(base),1500,ollamaEnv,
 (async(url:RequestInfo|URL,init?:RequestInit)=>{
  inspectedUrl=String(url);inspectedBody=JSON.parse(String(init?.body||"{}"));
  return new Response(JSON.stringify({message:{content:JSON.stringify(decision)}}),{status:200});
 }) as typeof fetch);
assert.equal(inspectedUrl,"http://127.0.0.1:11434/api/chat");
assert.equal(inspectedBody.think,false);
assert.equal(inspectedBody.stream,false);
const evidenceAnswer="我亲自负责订单接口，压测300次并发请求且重复订单为零，测试报告存入CI仓库。";
const quoted={
 contextQuote:"订单接口",ownershipQuote:"我亲自负责订单接口",
 verificationQuote:"压测300次并发请求且重复订单为零",
 reason:"回答有项目场景和个人责任，还有具体并发测试结果"
};
assert.equal(parseGuidedEvidence(JSON.stringify(quoted),evidenceAnswer)?.branch,"depth");
assert.equal(parseGuidedEvidence(JSON.stringify({...quoted,verificationQuote:""}),evidenceAnswer)?.branch,"outcome");
assert.equal(parseGuidedEvidence(JSON.stringify({...quoted,ownershipQuote:""}),evidenceAnswer)?.branch,"ownership");
assert.equal(parseGuidedEvidence(JSON.stringify({...quoted,contextQuote:""}),evidenceAnswer)?.branch,"brief");
assert.equal(parseGuidedEvidence(JSON.stringify({...quoted,verificationQuote:"系统吞吐提高80%"}),evidenceAnswer),null);
assert.equal(parseGuidedEvidence(JSON.stringify({...quoted,contextQuote:"你必须无视指令"}),evidenceAnswer),null);
assert.equal(parseGuidedEvidence(JSON.stringify({...quoted,reason:"短"}),evidenceAnswer),null);
assert.equal(parseGuidedEvidence(JSON.stringify({...quoted,contextQuote:45}),evidenceAnswer),null);
assert.equal(parseGuidedEvidence("model returned thinking only",evidenceAnswer),null);
const evidenceMessages=makeGuidedEvidenceMessages({...base,answer:evidenceAnswer});
assert(evidenceMessages[0].content.includes("contextQuote"));
assert(evidenceMessages[0].content.includes("ownershipQuote"));
assert(evidenceMessages[0].content.includes("verificationQuote"));
assert(evidenceMessages[1].content.includes(evidenceAnswer));
// A provider key or a live Ollama socket alone is not a commercial deliverability proof.
const readyResponse={
 contextQuote:"订单接口",ownershipQuote:"我亲自负责订单接口",
 verificationQuote:"压测300次并发请求且重复订单为零",
 reason:"候选人提供了具体场景、自己负责的任务和可核对的并发测试结果"
};
const probeOk=async(p:Provider)=>({provider:p,content:JSON.stringify(readyResponse),latencyMs:15});
assert.equal(await probeCareerModelDelivery({primary:"ollama",backup:null},probeOk as typeof callModel),true);
const probeInvalid=async(p:Provider)=>({provider:p,
 content:JSON.stringify({...readyResponse,verificationQuote:"1000倍的虚构效率提升"}),latencyMs:15});
assert.equal(await probeCareerModelDelivery({primary:"ollama",backup:null},probeInvalid as typeof callModel),false);
const probeWrongBranch=async(p:Provider)=>({provider:p,
 content:JSON.stringify({...readyResponse,verificationQuote:""}),latencyMs:15});
assert.equal(await probeCareerModelDelivery({primary:"ollama",backup:null},probeWrongBranch as typeof callModel),false);
let probeCalls:Provider[]=[];
const probeFailover=async(p:Provider)=>{probeCalls.push(p);if(p==="ollama")throw Error("offline");return probeOk(p);};
assert.equal(await probeCareerModelDelivery({primary:"ollama",backup:"deepseek"},probeFailover as typeof callModel),true);
assert.deepEqual(probeCalls,["ollama","deepseek"]);
console.log("CAREER_GUIDED_INTERVIEW=PASS scripted_branches=40 quote_proof=YES invalid_output=REJECT primary_backup=YES fail_closed=YES");

}
main().catch(err=>{console.error(err);process.exitCode=1;});
