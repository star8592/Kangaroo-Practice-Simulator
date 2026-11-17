/**
 * B2 offline parity: TypeScript gradeExam vs Rust pure grader.
 * No HTTP endpoint is exposed. Synthetic questions/answers only.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {gradeExam} from "../src/lib/grading";
import type {ExamProfile,Question} from "../src/lib/types";

const binary=process.env.SOCTHINK_GRADE_FIXTURE_BIN;
assert(binary && binary.startsWith("/"),"Set absolute SOCTHINK_GRADE_FIXTURE_BIN");
let seed=0x738351;
function rand(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}
function sample<T>(a:readonly T[]):T{return a[Math.floor(rand()*a.length)]}
function compare(test:number,lang:"zh"|"en",profile:ExamProfile,questions:Question[],answers:Record<string,string>){
 const expected=JSON.parse(JSON.stringify(gradeExam(questions,answers,profile,lang)));
 const inp=JSON.stringify({questions,answers,profile,lang});
 const proc=spawnSync(binary!,[],{input:inp,encoding:"utf8",timeout:4500,maxBuffer:3*1024*1024});
 assert.equal(proc.status,0,"Rust grader failed: "+String(proc.stderr));
 const actual=JSON.parse(proc.stdout);
 try{assert.deepStrictEqual(actual,expected)}
 catch(e){throw new Error("Rust vs TS grading mismatch test="+test+" mode="+profile.wrongPenaltyMode+" competition="+profile.competitionId+" lang="+lang+"\n"+String(e))}
}
let total=0,questionsChecked=0;
for(let t=0;t<120;t++){
 const competition=sample(["maa-amc","kangaroo","seamo","cemc"] as const);
 const lang=t%2===0?"zh":"en";
 const profile:ExamProfile={
  id:"test-"+t,name:"Fixture",grades:"3-4",durationSeconds:3600,
  questionCount:0,initialScore:sample([0,5,10,17.5]),maxScore:150,
  wrongPenaltyMode:sample(["fixed","quarter-points"] as const),
  wrongPenaltyValue:sample([0,0.25,0.5,0.75,1,1.25,1.5]),
  blankScoreValue:sample([0,0.5,1,1.75]),
  blankScoreMaxQuestions:sample([0,1,3,8,undefined]),
  competitionId:competition,
  formatId:sample(["maa-aime-I","maa-amc-8","maa-amc-12",undefined]),
 };
 const n=5+Math.floor(rand()*26),questions:Question[]=[];
 const answers:Record<string,string>={};
 for(let i=0;i<n;i++){
  const mode=sample(["integer","choice"] as const);
  const key=mode==="integer"?sample(["0","3","005","30","99","010"]):sample(["A","B","C","D"]);
  const bilingual=rand()<0.6,localeOnly=rand()<0.3;
  const q:Question={
   id:"q"+t+"-"+i,questionNo:i+1,points:sample([1,2,3,4,5,6,7,0.5,1.5]),
   answerMode:mode,answer:key,concept:"concept"+(i%4),solution:"default-"+i,
   year:2026,level:"G4",grades:"3-4",language:"en",stem:"Q"+i,choices:[],
   sourceFile:"synthetic-only",...((bilingual||localeOnly)?{localized:{
    zh:{stem:"中文",choices:[],solution:"中文解答-"+i},
    ...(bilingual?{en:{stem:"English",choices:[],solution:"English solution-"+i}}:{})
   }}:{})
  };
  questions.push(q);
  const caseNo=Math.floor(rand()*7);
  if(caseNo===0)continue; // missing is blank
  if(caseNo===1){answers[q.id]="";continue} // explicit blank retained
  if(caseNo===2||caseNo===6){answers[q.id]=key;continue}
  if(caseNo===3&&mode==="integer"){answers[q.id]="0"+key;continue}
  answers[q.id]=mode==="choice"?"Z":"999";
 }
 profile.questionCount=n;
 compare(t,lang,profile,questions,answers);
 total++;questionsChecked+=n;
}
console.log("RUST_GRADE_TS_OFFLINE_PARITY=PASS scenarios="+total+" questions="+questionsChecked+
 " fixed_quarter_blank_integer_bilingual_amc_seamo=true public_grade_endpoint=false");
