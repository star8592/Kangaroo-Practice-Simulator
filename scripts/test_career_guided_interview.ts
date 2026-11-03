import assert from "node:assert/strict";
import {INTERVIEW_PROFILES,getInterviewProfile} from "../src/lib/career-interview-scenarios";
import {validateGuidedDecision,parseGuidedDecision,composeGuidedFollowup,makeGuidedMessages} from "../src/lib/career-guided-interview";
import {getConfig,modelTimeout,withModelBackup,callModel,providerLabels} from "../src/lib/career-model-routing";
import type {Provider} from "../src/lib/career-model-routing";
import {EMPTY_INTERVIEW_JOB_CONTEXT} from "../src/lib/career-interview-context";

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
console.log("CAREER_GUIDED_INTERVIEW=PASS scripted_branches=40 quote_proof=YES invalid_output=REJECT primary_backup=YES fail_closed=YES");
