import {createHash} from "node:crypto";
import {hasValidBlueprintItems,type AssessmentItemContract,
  type AssessmentBlueprintContract} from "./assessment-core-contract";
import {getCareerFormalAnswer,isCareerFormalPaper} from "./career-formal-bank";
import {getCareerPractice,type CareerPracticeQuestion} from "./career-practice";

export type CareerPracticeGradeItem=Readonly<{
  questionId:string;skill:string;earned:number;maxPoints:number;
  correct:boolean;expected:string;explanation:string;
}>;
export type CareerPracticeGrade=Readonly<{
  caseId:string;revision:number;score:number;maxPoints:number;
  completed:number;totalQuestions:number;
  items:readonly CareerPracticeGradeItem[];advice:readonly string[];
  attemptPersistence:"browser-only"|"account";
}>;

/** Published original questions retain source fingerprints. Answer keys are
 * unavailable to the page layer; grading always happens on the server.
 */
export function buildCareerAssessmentContract(id:string){
  const paper=getCareerPractice(id);
  if(!paper||!isCareerFormalPaper(id))return null;
  const hash=createHash("sha256").update(JSON.stringify(paper)).digest("hex");
  const items:AssessmentItemContract[]=paper.questions.map(q=>({
    id:"career-"+paper.id+"-"+q.id,
    revision:paper.revision,domain:"career",
    format:q.kind==="integer"?"numeric":q.kind==="multiple"?"multiple-choice":"single-choice",
    stem:q.prompt,
    source:{
      sourceId:"socthink-original-"+paper.id,rights:"original",
      originalHash:hash,retrievedAt:"2026-11-01T00:00:00.000Z",
      publisher:"SOCTHINK原创",
    },
    quality:"publishable",answerEvidenceId:"career-rubric-"+paper.id+"-"+q.id,
    scoringRubricVersion:"career-formal-original-v1",
  }));
  const blueprint:AssessmentBlueprintContract={
    id:"career-"+paper.id,revision:paper.revision,domain:"career",
    title:paper.title,itemRefs:items.map(x=>({id:x.id,revision:x.revision})),
    gradingMode:"deterministic",totalPoints:paper.maxPoints,
  };
  return {blueprint,items,valid:hasValidBlueprintItems(blueprint,items)};
}
function hasAnswer(q:CareerPracticeQuestion,v:unknown){
  return q.kind==="multiple"?Array.isArray(v)&&v.length>0:
    typeof v==="string"&&v.trim().length>0;
}
function correctAnswer(q:CareerPracticeQuestion,v:unknown,
  expected:string|readonly string[]){
  if(q.kind==="multiple"){
    if(!Array.isArray(v)||!Array.isArray(expected))return false;
    return JSON.stringify([...new Set(v)].sort())===
      JSON.stringify([...expected].sort());
  }
  if(typeof v!=="string"||typeof expected!=="string")return false;
  if(q.kind==="integer")return /^-?\d+$/.test(v.trim())&&
    Number(v.trim())===Number(expected);
  return v===expected;
}
/** The only assessable career content is the full 24-item timed paper. */
export function gradeCareerPractice(id:string,raw:unknown):CareerPracticeGrade|null{
  const paper=getCareerPractice(id);
  if(!paper||!isCareerFormalPaper(id))return null;
  if(!buildCareerAssessmentContract(id)?.valid)
    throw Error("ASSESSMENT_CONTRACT_INVALID");
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("ANSWERS_INVALID");
  const answers=raw as Record<string,unknown>;
  const questions=new Map(paper.questions.map(q=>[q.id,q]));
  if(Object.keys(answers).length>paper.questions.length)throw Error("ANSWERS_TOO_MANY");
  for(const [id,value] of Object.entries(answers)){
    const q=questions.get(id);
    if(!q)throw Error("UNKNOWN_QUESTION");
    if(q.kind==="multiple"){
      if(!Array.isArray(value)||value.length>(q.options?.length??0)||
        value.some(v=>typeof v!=="string"||v.length>32||
          !q.options?.some(o=>o.id===v)))throw Error("MULTIPLE_CHOICE_INVALID");
    }else if(typeof value!=="string"||value.length>40||
      (q.kind==="single"&&value!==""&&!q.options?.some(o=>o.id===value))){
      throw Error("ANSWER_INVALID");
    }
  }
  const items=paper.questions.map(q=>{
    const answer=getCareerFormalAnswer(id,q.id);
    if(!answer)throw Error("NO_RUBRIC_FOR_ITEM:"+id+":"+q.id);
    const correct=correctAnswer(q,answers[q.id],answer.value);
    return {questionId:q.id,skill:q.skill,
      earned:correct?q.weight:0,maxPoints:q.weight,correct,
      expected:Array.isArray(answer.value)?answer.value.join("、"):String(answer.value),
      explanation:answer.explanation};
  });
  const score=items.reduce((sum,item)=>sum+item.earned,0);
  const advice=items.filter(item=>!item.correct)
    .map(item=>"重点复习："+item.skill+"。"+item.explanation);
  return {caseId:id,revision:paper.revision,score,maxPoints:paper.maxPoints,
    completed:paper.questions.filter(q=>hasAnswer(q,answers[q.id])).length,
    totalQuestions:paper.questions.length,items,
    advice:advice.length?advice:["已完成本场岗位模拟笔试全部客观考核点。"],
    attemptPersistence:"browser-only"};
}
