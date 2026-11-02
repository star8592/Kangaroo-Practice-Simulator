import assert from "node:assert/strict";
import {getQuickJS} from "quickjs-emscripten";
import {ENGINEERING_MOCK_ITEMS,ENGINEERING_MOCK_QUESTIONS,validateEngineeringMock,summarizeEngineeringMock} from "../src/lib/engineering-code-exam";
import {gradeCodeWithQuickJS} from "../src/lib/code-lab-engine";
import {ENGINEERING_TRACK_REFERENCE} from "./engineering_track_reference";
async function main(){
 assert.deepEqual(validateEngineeringMock(),[]);
 assert.equal(ENGINEERING_MOCK_ITEMS.length,6);
 assert.equal(ENGINEERING_MOCK_ITEMS.reduce((n,q)=>n+q.points,0),100);
 const engine=await getQuickJS();
 const marks=[];
 for(const q of ENGINEERING_MOCK_QUESTIONS){
  const src=ENGINEERING_TRACK_REFERENCE[q.id];
  const sample=gradeCodeWithQuickJS(engine,q.id,src,{sampleOnly:true});
  assert.equal(sample.correct,true,q.id);
  assert.equal(sample.passed,1,q.id);
  assert.equal(sample.total,1,q.id);
  const full=gradeCodeWithQuickJS(engine,q.id,src,{collectAll:true});
  assert.equal(full.correct,true,q.id);
  assert.equal(full.passed,4,q.id);
  marks.push({id:q.id,passed:4,total:4,message:full.message});
 }
 const fullReport=summarizeEngineeringMock(marks);
 assert.equal(fullReport.total,100);
 assert.deepEqual(fullReport.dimensions.map(x=>x.points),[30,40,30]);
 assert.equal(summarizeEngineeringMock([]).total,0);
 const onlyFirst="function validateSignupForm(){return {valid:true,errors:[]}}";
 const one=gradeCodeWithQuickJS(engine,"fe-form",onlyFirst,{collectAll:true});
 assert.equal(one.passed,1);
 assert.equal(one.correct,false);
 const first=gradeCodeWithQuickJS(engine,"fe-form",onlyFirst,{sampleOnly:true});
 assert.equal(first.passed,1);
 assert.equal(first.correct,true);
 const partial=summarizeEngineeringMock([{id:"fe-form",passed:1,total:4,message:""}]);
 assert.equal(partial.total,3.75);
 assert.equal(partial.dimensions[0].points,3.75);
 const original=gradeCodeWithQuickJS(engine,"fe-form",onlyFirst);
 assert.equal(original.passed,1); // stop-at-first-mismatch preserves legacy runtime behavior
 console.log("ENGINEERING_MOCK_EXAM=PASS tasks=6 cases=24 points=100 partial_grading=YES sample_only=YES unsubmitted_zero=YES");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
