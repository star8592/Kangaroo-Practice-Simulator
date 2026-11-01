import {createHash} from "node:crypto";
import {hasValidBlueprintItems,type AssessmentItemContract,
  type AssessmentBlueprintContract} from "./assessment-core-contract";
import {getCareerPractice,type CareerPracticeAnswers,type CareerPracticeCase,
  type CareerPracticeQuestion} from "./career-practice";

export type CareerPracticeGradeItem=Readonly<{
  questionId:string;
  skill:string;
  earned:number;
  maxPoints:number;
  correct:boolean;
  expected:string;
  explanation:string;
}>;
export type CareerPracticeGrade=Readonly<{
  caseId:string;
  revision:number;
  score:number;
  maxPoints:number;
  completed:number;
  totalQuestions:number;
  items:readonly CareerPracticeGradeItem[];
  advice:readonly string[];
  attemptPersistence:"browser-only";
}>;

/** Case data is wholly original; source hash fingerprints its authored revision. */
export function buildCareerAssessmentContract(caseId:string){
  const exercise=getCareerPractice(caseId);
  if(!exercise)return null;
  const hash=createHash("sha256").update(JSON.stringify(exercise)).digest("hex");
  const items:AssessmentItemContract[]=exercise.questions.map(q=>({
    id:"career-"+exercise.id+"-"+q.id,
    revision:exercise.revision,
    domain:"career",
    format:q.kind==="integer"?"numeric":q.kind==="multiple"?"multiple-choice":"single-choice",
    stem:q.prompt,
    source:{sourceId:"socthink-original-"+exercise.id,rights:"original",
      originalHash:hash,retrievedAt:"2026-11-01T00:00:00.000Z",publisher:"SOCTHINK原创"},
    quality:"publishable",answerEvidenceId:"career-rubric-"+exercise.id+"-"+q.id,
    scoringRubricVersion:"procurement-expected-yield-v1",
  }));
  const blueprint:AssessmentBlueprintContract={
    id:"career-"+exercise.id,
    revision:exercise.revision,
    domain:"career",
    title:exercise.title,
    itemRefs:items.map(x=>({id:x.id,revision:x.revision})),
    gradingMode:"deterministic",
    totalPoints:exercise.maxPoints,
  };
  return {blueprint,items,valid:hasValidBlueprintItems(blueprint,items)};
}

function orderUnits(demand:number,defectPercent:number){
  return Math.ceil(demand/(1-defectPercent/100));
}
function costFor(s:CareerPracticeCase["suppliers"][number],demand:number){
  const units=orderUnits(demand,s.defectPercent);
  return {units,cost:units*(s.unitPrice+s.freightPerUnit)};
}
function feasible(s:CareerPracticeCase["suppliers"][number],demand:number){
  const {units,cost}=costFor(s,demand);
  return s.leadDays<=7&&units<=s.maxUnits&&cost<=35000;
}

function expectedAnswer(exercise:CareerPracticeCase,id:string):
  {value:string|readonly string[],explanation:string}{
  const [a,b,c]=exercise.suppliers;
  if(!a||!b||!c)throw Error("CASE_SUPPLIERS_INVALID");
  const eligible=exercise.suppliers.filter(s=>feasible(s,650));
  const lowest=[...eligible].sort((x,y)=>costFor(x,650).cost-costFor(y,650).cost)[0];
  switch(id){
    case "eligibility":
      return {value:eligible.map(s=>s.id).sort(),
        explanation:"需要同时满足交期、产能和预算；乙厂虽报价低，但9天交期超过7天。甲厂和丙厂均有可行的最低订货方案。"};
    case "quantity":{
      const units=costFor(c,650).units;
      return {value:String(units),
        explanation:"丙厂不良率1%，至少订货 ceil(650÷0.99)＝"+units+"件；这是按预计合格率计算的模型数量，不是质量保证。"};
    }
    case "landed-cost":{
      const {units,cost}=costFor(c,650);
      return {value:String(cost),
        explanation:"丙厂到货单价为51+2＝53元；最低订货量"+units+"件，总成本"+units+"×53＝"+cost+"元。"};
    }
    case "supplier-choice":
      return {value:lowest?.id??"none",
        explanation:"在满足约束的方案里，比较各厂所需订货量×（单价+运费），丙厂综合成本最低，而不是只比采购单价。"};
    case "savings":{
      const save=costFor(a,650).cost-costFor(c,650).cost;
      return {value:String(save),
        explanation:"甲厂应订"+costFor(a,650).units+"件、总成本"+costFor(a,650).cost+"元；丙厂成本"+costFor(c,650).cost+"元，差额"+save+"元。"};
    }
    case "contingency":{
      const matches=exercise.suppliers.filter(s=>feasible(s,750));
      return {value:matches.length===0?"none":matches[0].id,
        explanation:"需求增加后，甲厂虽可达到预计合格件数但超过35,000元预算；丙厂需订"+costFor(c,750).units+"件，超过750件产能；乙厂交期超出限制。必须调整约束或谈判，不能硬选一家。"};
    }
    default:throw Error("NO_RUBRIC_FOR_ITEM:"+id);
  }
}

function isAnswered(q:CareerPracticeQuestion,v:unknown){
  return q.kind==="multiple" ? Array.isArray(v)&&v.length>0 :
    typeof v==="string"&&v.trim().length>0;
}
function isCorrect(q:CareerPracticeQuestion,v:unknown,expected:string|readonly string[]){
  if(q.kind==="multiple"){
    if(!Array.isArray(v)||!Array.isArray(expected))return false;
    return JSON.stringify([...new Set(v)].sort())===JSON.stringify([...expected].sort());
  }
  if(typeof v!=="string"||typeof expected!=="string")return false;
  if(q.kind==="integer"){
    const normalized=v.trim();
    return /^-?\d+$/.test(normalized)&&Number(normalized)===Number(expected);
  }
  return v===expected;
}

export function gradeCareerPractice(caseId:string,raw:unknown):CareerPracticeGrade|null{
  const exercise=getCareerPractice(caseId);
  if(!exercise)return null;
  const contract=buildCareerAssessmentContract(caseId);
  if(!contract?.valid)throw Error("ASSESSMENT_CONTRACT_INVALID");
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("ANSWERS_INVALID");
  const answers=raw as Record<string,unknown>;
  const allowedIds=new Set(exercise.questions.map(x=>x.id));
  if(Object.keys(answers).length>exercise.questions.length)throw Error("ANSWERS_TOO_MANY");
  for(const [key,value] of Object.entries(answers)){
    if(!allowedIds.has(key))throw Error("UNKNOWN_QUESTION");
    const q=exercise.questions.find(x=>x.id===key)!;
    if(q.kind==="multiple"){
      if(!Array.isArray(value)||value.length>q.options!.length||
        value.some(v=>typeof v!=="string"||v.length>32||
          !q.options!.some(o=>o.id===v)))throw Error("MULTIPLE_CHOICE_INVALID");
    }else if(typeof value!=="string"||value.length>40||
      (q.kind==="single"&&value!==""&&!q.options!.some(o=>o.id===value))){
      throw Error("ANSWER_INVALID");
    }
  }
  const items=exercise.questions.map(q=>{
    const expected=expectedAnswer(exercise,q.id);
    const correct=isCorrect(q,answers[q.id],expected.value);
    return {questionId:q.id,skill:q.skill,
      earned:correct?q.weight:0,maxPoints:q.weight,correct,
      expected:Array.isArray(expected.value)?expected.value.join("、"):String(expected.value),
      explanation:expected.explanation};
  });
  const score=items.reduce((n,x)=>n+x.earned,0);
  const advice=items.filter(x=>!x.correct).map(x=>"重点复练："+x.skill+"。"+x.explanation);
  return {caseId,revision:exercise.revision,score,maxPoints:exercise.maxPoints,
    completed:exercise.questions.filter(q=>isAnswered(q,answers[q.id])).length,
    totalQuestions:exercise.questions.length,items,
    advice:advice.length?advice:["已完成本案例的全部客观考核点。可以重测，或进入其他岗位训练。"],
    attemptPersistence:"browser-only"};
}
