import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getQuickJS} from "quickjs-emscripten";
import {AGENT_PROJECT_CODE_VERSION,AGENT_PROJECT_CODE_CHALLENGES,validateAgentProjectCode} from "../src/lib/agent-project-code";
import {gradeCodeWithQuickJS} from "../src/lib/code-lab-engine";

/** Reference implementations are test-only, not served to browser lessons. */
const REFERENCE:Record<string,string>={
 "agent-contract":"function validateTicketPayload(p){ if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='text,ticket_id') return {ok:false,code:'FIELDS'}; if(typeof p.ticket_id!=='string'||!/^T-[0-9]{4,8}$/.test(p.ticket_id))return {ok:false,code:'ID'}; if(typeof p.text!=='string'||p.text.length<1||p.text.length>1000)return {ok:false,code:'TEXT'}; return {ok:true,code:'OK'}; }",
 "agent-route":"function routeTicketIntent(text){const kinds=[]; if(/快递|物流|发货/.test(text))kinds.push('logistics'); if(/账号|密码|登录/.test(text))kinds.push('account'); if(/退款|退钱/.test(text))kinds.push('refund'); return kinds.length>1?'ambiguous':kinds.length===1?kinds[0]:'manual';}",
 "agent-approval":"function authorizeTicketTool(r){if(r.role!=='staff')return {allow:false,reason:'ROLE'}; if(r.tool!=='draft_reply'&&r.tool!=='lookup_policy')return {allow:false,reason:'TOOL_DENIED'}; return {allow:true,reason:'ALLOW'};}",
 "agent-injection":"function filterSuggestedTools(input){const allowed=new Set(['draft_reply','lookup_policy']); return [...new Set((Array.isArray(input.suggested)?input.suggested:[]).filter(t=>allowed.has(t)))].sort();}",
 "agent-idempotency":"function deduplicateTicketEvents(events){const map=new Map(); for(const e of events){const id=e.ticket_id; if(!map.has(id))map.set(id,{id,text:e.text,replays:0,conflict:false}); else{const x=map.get(id); x.replays++; if(x.text!==e.text)x.conflict=true;}} return [...map.values()];}",
 "agent-failure":"function failClosedDecision(c){if(c.policyAvailable!==true)return {action:'manual_review',reason:'POLICY_UNAVAILABLE'}; if(c.category==='refund')return {action:'manual_review',reason:'APPROVAL_REQUIRED'}; if(c.category==='ambiguous')return {action:'manual_review',reason:'MULTIPLE_INTENTS'}; if(c.category==='logistics'||c.category==='account')return {action:'draft_only',reason:'OK'}; return {action:'manual_review',reason:'UNKNOWN_INTENT'};}",
};
async function main(){
 assert.deepEqual(validateAgentProjectCode(),[]);
 assert.equal(AGENT_PROJECT_CODE_CHALLENGES.length,6);
 assert.match(AGENT_PROJECT_CODE_VERSION,/^agent-project-code-/);
 const engine=await getQuickJS();
 let cases=0;
 for(const task of AGENT_PROJECT_CODE_CHALLENGES){
  const reference=REFERENCE[task.id];
  assert(reference,task.id+" missing reference");
  const grade=gradeCodeWithQuickJS(engine,task.id,reference,{collectAll:true});
  assert.equal(grade.correct,true,task.id+": "+grade.message);
  assert.equal(grade.passed,task.cases.length,task.id);
  assert.equal(grade.total,task.cases.length);
  cases+=grade.total;
  const unfinished=gradeCodeWithQuickJS(engine,task.id,task.starter,{collectAll:true});
  assert.equal(unfinished.correct,false,task.id+" initial code must not be a passing submission");
 }
 const page=readFileSync("src/app/skill-labs/agent-foundations/page.tsx","utf8");
 assert(page.includes("<AgentProjectCodeLab/>"));
 const component=readFileSync("src/components/AgentProjectCodeLab.tsx","utf8");
 assert(component.includes("new Worker("));
 assert(component.includes("保存本次作业到微信学习记录"));
 assert(!component.includes("reportKind:"));
 assert(component.includes("credentials:\"same-origin\""));
 const api=readFileSync("src/app/api/skill-labs/agent-project/attempts/route.ts","utf8");
 assert(api.includes("gradeCodeWithQuickJS(engine,x.taskId,x.source,{collectAll:true})"));
 assert(!api.includes("x.score")&&!api.includes("x.passed"));
 assert(!api.includes("spawn(")&&!api.includes("exec("));
 console.log("AGENT_CODE_LAB=PASS tasks=6 executed_cases="+cases+
  " sandbox=QuickJS account_save=server_regraded no_fake_paid_course=YES");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
