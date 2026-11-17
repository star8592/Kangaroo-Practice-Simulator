/**
 * Real-stock offline parity. Invoked only on a developer machine with the
 * private exam bundle directory already mounted as its process.cwd().
 * No answer, solution, user, or private file is logged or committed.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {listTrainingExamProfiles,loadTrainingExamBundle} from "../src/lib/training-question-bank";
import {gradeExam} from "../src/lib/grading";

const bin=process.env.SOCTHINK_GRADE_FIXTURE_BIN;
assert(bin&&bin.startsWith("/"),"Set absolute Rust fixture binary path");
const profiles=listTrainingExamProfiles().filter(p=>p.paperType!=="smart");
assert(profiles.length>100,"Expected genuine source-verified training inventory");
let scenarios=0,questions=0;
for(const p of profiles){
 const bundle=loadTrainingExamBundle(p.id);
 for(const mode of ["blank","empty","correct","wrong","alternate"] as const){
  const answers:Record<string,string>={};
  for(const q of bundle.questions){
   if(mode==="blank")continue;
   if(mode==="empty")answers[q.id]="";
   if(mode==="correct")answers[q.id]=q.answer;
   if(mode==="wrong")answers[q.id]=q.answerMode==="integer"?"999":"Z";
   if(mode==="alternate"&&q.questionNo%3!==0)answers[q.id]=q.questionNo%2===0?q.answer:"__wrong__";
  }
  const lang=mode==="alternate"?"en":"zh";
  const expected=JSON.parse(JSON.stringify(gradeExam(bundle.questions,answers,bundle.profile,lang)));
  const child=spawnSync(bin,[],{
   input:JSON.stringify({questions:bundle.questions,answers,profile:bundle.profile,lang}),
   encoding:"utf8",timeout:5500,maxBuffer:10*1024*1024,
  });
  if(child.status!==0)throw new Error("Rust grading parity failed to run for one private bundle; status="+child.status);
  const actual=JSON.parse(child.stdout);
  try{assert.deepStrictEqual(actual,expected)}
  catch{throw new Error("Rust/TS score semantics mismatch; bundleId="+p.id+" scenario="+mode+" (no private answer details logged)")}
  scenarios++;questions+=bundle.questions.length;
 }
}
console.log("RUST_GRADE_REAL_STOCK_PARITY=PASS bundles="+profiles.length+
 " scenarios="+scenarios+" question_grades="+questions+" no_private_export=true");
