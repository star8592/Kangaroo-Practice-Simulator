import assert from "node:assert/strict";
import {getQuickJS} from "quickjs-emscripten";
import {CODE_CHALLENGES,validateCodeLab} from "../src/lib/code-lab";
import {gradeCodeWithQuickJS} from "../src/lib/code-lab-engine";
import {CODE_LAB_REFERENCE} from "./code_lab_reference";
async function main(){
 assert.deepEqual(validateCodeLab(),[]);
 assert.equal(CODE_CHALLENGES.length,6);
 assert.equal(Object.keys(CODE_LAB_REFERENCE).length,6);
 assert(CODE_CHALLENGES.every(t=>t.cases.length===4));
 const QuickJS=await getQuickJS();
 const vm=QuickJS.newContext();
 try{
  for(const symbol of ["fetch","Worker","document","window","process","require","Deno","XMLHttpRequest","WebSocket","self"]){
   const v=vm.evalCode("typeof "+symbol);
   if(v.error){v.error.dispose();throw new Error("inspection failed: "+symbol);}
   assert.equal(vm.dump(v.value),"undefined","no host binding "+symbol);
   v.value.dispose();
  }
 }finally{vm.dispose();}
 for(const task of CODE_CHALLENGES){
  const correct=gradeCodeWithQuickJS(QuickJS,task.id,CODE_LAB_REFERENCE[task.id]);
  assert.equal(correct.correct,true,task.id+": "+correct.message);
  assert.equal(correct.passed,4,task.id);
  assert.equal(correct.total,4,task.id);
  const incomplete=gradeCodeWithQuickJS(QuickJS,task.id,task.starter);
  assert.equal(incomplete.correct,false,"starter must not accidentally solve task "+task.id);
  assert.equal(incomplete.passed,0,task.id);
 }
 const bad=gradeCodeWithQuickJS(QuickJS,"retry-backoff","function retryBackoff(n){return Array(n).fill(100)}");
 assert.equal(bad.correct,false);
 assert.equal(bad.passed,0);
 const infinite=gradeCodeWithQuickJS(QuickJS,"retry-backoff","function retryBackoff(){while(true){} }");
 assert.equal(infinite.correct,false);
 assert(infinite.elapsedMs<4000,"interrupt must stop infinite loop");
 const network=gradeCodeWithQuickJS(QuickJS,"retry-backoff","function retryBackoff(){return fetch('https://example.com')}");
 assert.equal(network.correct,false);
 assert.match(network.message,/fetch|not defined/i);
 assert.throws(()=>gradeCodeWithQuickJS(QuickJS,"unknown","function x(){}"),/UNKNOWN_CODE_TASK/);
 assert.throws(()=>gradeCodeWithQuickJS(QuickJS,"retry-backoff","a".repeat(5001)),/SOURCE_LENGTH/);
 console.log("ENGINEERING_CODE_LAB=PASS tasks=6 cases=24 real_QuickJS_WASM=YES network=UNAVAILABLE infinite_loop=INTERRUPTED memory=16MiB source_max=5000");
}
main().catch(error=>{console.error(error);process.exitCode=1});
