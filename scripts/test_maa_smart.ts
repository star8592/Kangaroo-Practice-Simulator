import { listExamProfiles,loadExamBundle } from "../src/lib/question-bank";

const ps=listExamProfiles().filter(x=>x.competitionId==="maa-amc");
const smart=ps.find(x=>x.id==="smart-maa-amc8");
const readyIds=new Set(ps.filter(x=>x.formatId==="maa-amc8"&&x.paperType!=="smart").map(x=>x.id));

if(readyIds.has("maa-amc8-2023-sample"))throw new Error("English-only 2023 sample leaked into the Chinese-ready AMC8 pool");
if(readyIds.has("maa-amc8-2024-user-owned"))throw new Error("rights-gated historical AMC8 source leaked into the public pool");

// A smart mock is only valid when at least two student-ready, publicly displayable
// source papers exist. Rights review may intentionally reduce the public pool below
// that threshold; in that state, absence of the smart paper is the correct result.
if(readyIds.size<2){
  if(smart)throw new Error("smart AMC8 exposed without enough public student-ready sources");
  let rejected=false;
  try{loadExamBundle("smart-maa-amc8--verify2024")}catch{rejected=true}
  if(!rejected)throw new Error("smart AMC8 could still be built from a rights-gated pool");
  console.log("SMART_AMC8=PASS public_pool_insufficient=true smart_hidden=true rights_gate=true");
  process.exit(0);
}

if(!smart)throw new Error("smart-maa-amc8 missing despite sufficient public sources");
const b=loadExamBundle("smart-maa-amc8--verify2024");
const counts=new Map<string,number>();
for(const q of b.questions){
  const m=(q.sourceMeta||{}) as Record<string,unknown>;
  const id=String(m.smartSourceExamId||"");
  const sourcePos=Number(m.smartSourceQuestionNo||0);
  if(sourcePos!==q.questionNo)throw new Error(`difficulty-position drift: new Q${q.questionNo} came from source Q${sourcePos}`);
  if(!readyIds.has(id))throw new Error(`non-public source leaked into smart AMC8: ${id}`);
  counts.set(id,(counts.get(id)||0)+1);
}
console.log("MAA_PROFILES",ps.filter(x=>x.formatId==="maa-amc8").map(x=>[x.id,x.paperType]));
console.log("SMART_AMC8",b.questions.length,b.profile.durationSeconds,b.profile.maxScore,Object.fromEntries(counts));
if(b.questions.length!==25||b.profile.durationSeconds!==2400||b.profile.maxScore!==25)throw new Error("smart format wrong");
if(!String(b.profile.rulesSummaryEn||"").includes("calculators are not allowed"))throw new Error("smart AMC8 inherited obsolete historical calculator policy");
if(counts.size<2)throw new Error("smart paper did not use multiple public bilingual sources");
console.log("SMART_AMC8=PASS public_pool_only=true position_preserved=true");
