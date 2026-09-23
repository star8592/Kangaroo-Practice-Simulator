import fs from "node:fs";
import path from "node:path";

type Q = {
  id:string; questionNo:number; answer:string; concept?:string;
  assetUrl?:string; assetUrlZh?:string; studentAssetUrl?:string;
};
type Bundle = {
  profile:{id:string;name:string;year?:number;competitionId?:string;formatId?:string;paperType?:string;studentReady?:boolean};
  questions:Q[];
};
type Behavior = {questionId:string;correct:boolean|null;dwellMs?:number;answerChanges?:number;flagCount?:number};
type Attempt = {examId:string;questions:Behavior[]};

const root=process.cwd();
const examsDir=path.join(root,"private","exams");
const solutionsDir=path.join(root,"private","solutions");
const attemptFile=path.join(root,"private","users","exam-attempts.jsonl");

const behavior=new Map<string,{attempts:number;wrong:number;blank:number;correct:number;dwellMs:number;changes:number;flags:number}>();
if(fs.existsSync(attemptFile)){
  for(const line of fs.readFileSync(attemptFile,"utf8").split("\n").filter(Boolean)){
    try{
      const a=JSON.parse(line) as Attempt;
      for(const q of a.questions||[]){
        const s=behavior.get(q.questionId)??{attempts:0,wrong:0,blank:0,correct:0,dwellMs:0,changes:0,flags:0};
        s.attempts++;
        if(q.correct===false)s.wrong++;
        else if(q.correct===null)s.blank++;
        else s.correct++;
        s.dwellMs+=Math.max(0,q.dwellMs||0);
        s.changes+=Math.max(0,q.answerChanges||0);
        s.flags+=Math.max(0,q.flagCount||0);
        behavior.set(q.questionId,s);
      }
    }catch{}
  }
}

const verified=new Set(
  fs.existsSync(solutionsDir)
    ? fs.readdirSync(solutionsDir).filter(x=>x.endsWith(".json")&&x!=="queue.json").map(x=>x.replace(/\.json$/,""))
    : []
);

type QueueRow = {
  questionId:string; examId:string; competitionId:string; formatId:string; paperType:string;
  year:number|null; questionNo:number; concept:string; officialAnswer:string; sourceAsset:string|null;
  verified:boolean; priority:number;
  telemetry:{attempts:number;wrong:number;blank:number;correct:number;dwellMs:number;changes:number;flags:number;errorRate:number};
};
const rows:QueueRow[]=[];
const seen=new Set<string>();
for(const name of fs.readdirSync(examsDir).filter(x=>x.endsWith(".json")&&!x.includes("before-bilingual"))){
  let b:Bundle;
  try{b=JSON.parse(fs.readFileSync(path.join(examsDir,name),"utf8")) as Bundle;}catch{continue}
  if(!b?.profile?.id||!Array.isArray(b.questions))continue;
  if(b.profile.paperType==="smart")continue;
  for(const q of b.questions){
    if(!q?.id||seen.has(q.id))continue;
    seen.add(q.id);
    const st=behavior.get(q.id)??{attempts:0,wrong:0,blank:0,correct:0,dwellMs:0,changes:0,flags:0};
    const hasVerified=verified.has(q.id);
    const errorRate=st.attempts?(st.wrong+st.blank)/st.attempts:0;
    // Demand dominates. Difficulty/recency only break ties when there is little student data.
    const demand=st.wrong*100+st.blank*75+st.flags*20+st.changes*8+Math.min(30,Math.round(st.dwellMs/60000));
    const tie=(b.profile.competitionId==="maa-amc"?15:0)+Math.min(25,q.questionNo||0)+(b.profile.year?Math.max(0,b.profile.year-2000)/10:0);
    const priority=Math.round((demand+tie)*100)/100;
    rows.push({
      questionId:q.id,examId:b.profile.id,competitionId:b.profile.competitionId||"unknown",
      formatId:b.profile.formatId||"",paperType:b.profile.paperType||"",year:b.profile.year??null,
      questionNo:q.questionNo,concept:q.concept||"",officialAnswer:q.answer,
      sourceAsset:q.studentAssetUrl||q.assetUrlZh||q.assetUrl||null,
      verified:hasVerified,priority,
      telemetry:{...st,errorRate:Math.round(errorRate*1000)/1000}
    });
  }
}

const missing=rows.filter(x=>!x.verified).sort((a,b)=>b.priority-a.priority||String(a.questionId).localeCompare(String(b.questionId)));
const byCompetition:Record<string,{total:number;verified:number;missing:number}>={};
for(const r of rows){
  const k=r.competitionId;
  byCompetition[k]??={total:0,verified:0,missing:0};
  byCompetition[k].total++;
  if(r.verified)byCompetition[k].verified++; else byCompetition[k].missing++;
}
const payload={
  generatedAt:new Date().toISOString(),
  policy:"Local code ranks demand only. Mathematical reasoning and verified storyboard generation require the high-capability AI core.",
  totals:{questions:rows.length,verified:rows.filter(x=>x.verified).length,missing:missing.length},
  byCompetition,
  queue:missing
};
fs.mkdirSync(solutionsDir,{recursive:true});
fs.writeFileSync(path.join(solutionsDir,"queue.json"),JSON.stringify(payload,null,2)+"\n");
console.log("SOLUTION_QUEUE=PASS",JSON.stringify(payload.totals),JSON.stringify(byCompetition));
console.log("TOP10");
for(const r of missing.slice(0,10))console.log(r.priority,r.questionId,"wrong="+r.telemetry.wrong,"blank="+r.telemetry.blank,"attempts="+r.telemetry.attempts);