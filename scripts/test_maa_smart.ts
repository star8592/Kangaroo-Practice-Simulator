import { listExamProfiles,loadExamBundle } from "../src/lib/question-bank";

const ps=listExamProfiles().filter(x=>x.competitionId==="maa-amc");
const smart=ps.find(x=>x.id==="smart-maa-amc8");
if(!smart)throw new Error("smart-maa-amc8 missing");

const b=loadExamBundle("smart-maa-amc8--verify2024");
const counts=new Map<string,number>();
for(const q of b.questions){
  const m=(q.sourceMeta||{}) as Record<string,unknown>;
  const id=String(m.smartSourceExamId||"");
  const sourcePos=Number(m.smartSourceQuestionNo||0);
  if(sourcePos!==q.questionNo)throw new Error(`difficulty-position drift: new Q${q.questionNo} came from source Q${sourcePos}`);
  counts.set(id,(counts.get(id)||0)+1);
}
console.log("MAA_PROFILES",ps.filter(x=>x.formatId==="maa-amc8").map(x=>[x.id,x.paperType]));
console.log("SMART_AMC8",b.questions.length,b.profile.durationSeconds,b.profile.maxScore,Object.fromEntries(counts));
if(b.questions.length!==25||b.profile.durationSeconds!==2400||b.profile.maxScore!==25)throw new Error("smart format wrong");
if(!String(b.profile.rulesSummaryEn||"").includes("calculators are not allowed"))throw new Error("smart AMC8 inherited obsolete historical calculator policy");
if(counts.size<2)throw new Error("smart paper did not use multiple sources");
if(!counts.has("maa-amc8-2023-sample")||!counts.has("maa-amc8-2024-user-owned"))throw new Error("expected both AMC8 sources");
console.log("SMART_AMC8=PASS position_preserved=true");
