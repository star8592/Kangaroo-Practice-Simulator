import assert from "node:assert/strict";
import {getQuickJS} from "quickjs-emscripten";
import {ENGINEERING_TRACK_LIST,ENGINEERING_CODE_CHALLENGES,validateEngineeringTracks} from "../src/lib/engineering-code-tracks";
import {CODE_CHALLENGES} from "../src/lib/code-lab";
import {gradeCodeWithQuickJS} from "../src/lib/code-lab-engine";
import {ENGINEERING_TRACK_REFERENCE} from "./engineering_track_reference";
async function main(){
 assert.deepEqual(validateEngineeringTracks(),[]);
 assert.equal(ENGINEERING_TRACK_LIST.length,3);
 assert.equal(ENGINEERING_CODE_CHALLENGES.length,12);
 assert.equal(CODE_CHALLENGES.length,6,"legacy training cannot change");
 assert.equal(new Set([...CODE_CHALLENGES,...ENGINEERING_CODE_CHALLENGES].map(t=>t.id)).size,18);
 const engine=await getQuickJS();
 for(const task of ENGINEERING_CODE_CHALLENGES){
  assert.equal(task.cases.length,4,task.id);
  const answer=ENGINEERING_TRACK_REFERENCE[task.id];
  assert(answer,"reference missing "+task.id);
  const result=gradeCodeWithQuickJS(engine,task.id,answer);
  assert.equal(result.correct,true,task.id+": "+result.message);
  assert.equal(result.passed,4,task.id);
  assert.equal(result.total,4,task.id);
  const starter=gradeCodeWithQuickJS(engine,task.id,task.starter);
  assert.equal(starter.correct,false,"starter unexpectedly passes: "+task.id);
 }
 // Reject plausible but wrong business logic.
 const falseSolutions:[string,string][]=[
  ["fe-form","function validateSignupForm(f){return {valid:true,errors:[]}}"],
  ["fe-products","function visibleProductIds(x){return x.products.map(p=>p.id)}"],
  ["be-access","function canEditDocument(x){return x.user.role==='admin'}"],
  ["be-webhook","function acceptedPaymentEventIds(events){return events.map(e=>e.eventId)}"],
  ["be-limit","function allowRequests(x){return x.timestamps.map(()=>true)}"],
  ["qa-slo","function countSloBreaches(x){return x.values.filter(v=>v<=x.minAvailability).length}"],
 ];
 for(const [id,source] of falseSolutions)
  assert.equal(gradeCodeWithQuickJS(engine,id,source).correct,false,"reject wrong rule "+id);
 console.log("ENGINEERING_TRACKS=PASS tracks=3 tasks=12 cases=48 QuickJS_WASM=YES legacy_unchanged=YES wrong_logic_rejected=YES");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
