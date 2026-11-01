import {createHash} from "node:crypto";
import {hasValidBlueprintItems,type AssessmentItemContract,
  type AssessmentBlueprintContract} from "./assessment-core-contract";
import {getCareerPractice,type CareerPracticeCase,
  type CareerPracticeQuestion} from "./career-practice";
import {getCareerFormalAnswer,isCareerFormalPaper} from "./career-formal-bank";

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
  attemptPersistence:"browser-only"|"account";
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
    scoringRubricVersion:isCareerFormalPaper(exercise.id)?"career-full-paper-original-v1":exercise.id==="supplier-selection-001"?"procurement-expected-yield-v1":"career-deterministic-original-v1",
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

/**
 * Case-specific, server-only objective rubrics. The scoring/feedback pipeline is
 * generic across occupations. These keys must never be serialized to page props.
 */
const RUBRICS:Readonly<Record<string,Readonly<Record<string,{
  value:string|readonly string[];explanation:string
}>>>>={
  "campaign-performance-001":{
    "eligible":{value:["search","community"],explanation:"站内搜索退款率8%，社群推荐5%，均低于10%；短视频20%不符合。"},
    "net-revenue":{value:"33120",explanation:"站内搜索退款后净收入＝36,000×(1－8%)＝33,120元。"},
    "contribution":{value:"12100",explanation:"社群推荐净收入18,000×95%＝17,100元；扣除5,000元广告费，净贡献12,100元。"},
    "best-roi":{value:"community",explanation:"社群ROI＝12,100÷5,000＝242%，高于搜索的176%与短视频的152%。ROI最高不等于绝对贡献最高。"},
    "largest-contribution":{value:"21120",explanation:"搜索净贡献33,120－12,000＝21,120元，超过短视频12,160与社群12,100元。"},
    "roi-threshold":{value:"community",explanation:"社群退款率5%且ROI为242%，同时满足门槛；其他渠道ROI未达到200%或退款率超标。"},
  },
  "manufacturing-quality-001":{
    "temperature-rpn":{value:"240",explanation:"温度传感器漂移的简化RPN＝8×5×6＝240。"},
    "largest-rpn":{value:"temperature",explanation:"接头216、划痕42、传感器240、标签60，传感器RPN最高。但实际FMEA不能仅凭RPN判定最终行动优先级。"},
    "high-rpn":{value:["connector","temperature"],explanation:"电源接头RPN＝9×3×8＝216，温度传感器＝240，均达到练习复核阈值200。"},
    "improved-rpn":{value:"120",explanation:"温度传感器D从6改善到3，新的简化RPN＝8×5×3＝120。"},
    "rpn-reduction":{value:"120",explanation:"简化RPN由240降到120，差额为120；还须评估改进方案是否真正有效。"},
    "professional-judgement":{value:"review-severity",explanation:"真正的失效分析应考虑严重度、风险后果、预防检测控制和AIAG-VDA行动优先级，不能只比较RPN。"},
  },
};
export function validateCareerPracticeRubrics():string[]{
  const errors:string[]=[];
  for(const exercise of [
    "campaign-performance-001","manufacturing-quality-001",
  ]){
    const c=getCareerPractice(exercise);
    if(!c){errors.push("case-missing:"+exercise);continue;}
    const rubric=RUBRICS[exercise];
    if(!rubric){errors.push("rubric-missing:"+exercise);continue;}
    for(const q of c.questions){
      const expected=rubric[q.id];
      if(!expected){errors.push("missing-answer:"+exercise+":"+q.id);continue;}
      if(q.kind==="multiple"){
        if(!Array.isArray(expected.value)||!expected.value.every(x=>
          q.options?.some(o=>o.id===x)))errors.push("bad-multiselect:"+exercise+":"+q.id);
      }else if(typeof expected.value!=="string"||
        q.kind==="integer"&&!/^-?\d+$/.test(expected.value)||
        q.kind==="single"&&!q.options?.some(x=>x.id===expected.value)){
        errors.push("bad-answer:"+exercise+":"+q.id);
      }
    }
    for(const key of Object.keys(rubric)){
      if(!c.questions.some(q=>q.id===key))errors.push("orphan-answer:"+exercise+":"+key);
    }
  }
  return errors;
}

function expectedAnswer(exercise:CareerPracticeCase,id:string):
  {value:string|readonly string[],explanation:string}{
  if(RUBRICS[exercise.id]){
    const answer=RUBRICS[exercise.id][id];
    if(!answer)throw Error("NO_RUBRIC_FOR_ITEM:"+exercise.id+":"+id);
    return answer;
  }
  if(isCareerFormalPaper(exercise.id)){
    const answer=getCareerFormalAnswer(exercise.id,id);
    if(!answer)throw Error("NO_RUBRIC_FOR_ITEM:"+exercise.id+":"+id);
    return answer;
  }
  if(exercise.id!=="supplier-selection-001")
    throw Error("UNSUPPORTED_SCORING_CASE:"+exercise.id);
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
