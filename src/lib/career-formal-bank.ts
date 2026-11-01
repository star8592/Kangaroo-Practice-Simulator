import procurement from "../../data/career/formal_exam_procurement_20261101.json";
import operations from "../../data/career/formal_exam_operations_20261101.json";
import quality from "../../data/career/formal_exam_quality_20261101.json";
import sourceLedger from "../../data/career/formal_exam_sources_20261101.json";
import type {CareerPracticeCase,CareerPracticeQuestion} from "./career-practice";

/** Versioned original test bank. Unlike a scraped PDF this file has separate
 * immutable questions, grading rubrics, provenance and controlled publication.
 * The raw answer-bearing objects MUST NEVER be returned to the browser.
 */
type BankQuestion=Readonly<{
  id:string;kind:"single"|"multiple"|"integer";skill:string;prompt:string;
  options:readonly string[];correct:string|readonly string[];explanation:string;
  points:number;authoredAt:string;sourceKind:"original";topicSourceId:string;
}>;
type BankPaper=Readonly<{
  id:string;revision:number;category:"procurement"|"operations"|"supply";
  title:string;role:string;durationMinutes:number;authoredAt:string;
  observedAt:string;origin:"socthink-original";form:string;
  referenceIds:readonly string[];context:string;assumptions:readonly string[];
  questions:readonly BankQuestion[];
}>;
type SourceRecord=Readonly<{
  id:string;url:string;title:string;platform:string;sourceKind:string;
  observedAt:string;publishedAt:string|null;reportedExamDate:string|null;
  rights:string;verifiedLevel:string;
}>;
const BANK=[procurement,operations,quality] as unknown as readonly BankPaper[];
const SOURCES=sourceLedger.sources as readonly SourceRecord[];
const sourceById=new Map(SOURCES.map(x=>[x.id,x]));

export function getCareerFormalSource(id:string):SourceRecord|undefined{
  return sourceById.get(id);
}
export const CAREER_FORMAL_SOURCE_SUMMARY=Object.freeze({
  reviewedAt:sourceLedger.lastSourceReviewAt,
  sources:SOURCES.map(x=>({id:x.id,url:x.url,title:x.title,platform:x.platform,
    observedAt:x.observedAt,publishedAt:x.publishedAt,
    reportedExamDate:x.reportedExamDate,sourceKind:x.sourceKind,
    verification:x.verifiedLevel})),
});

function publicQuestion(q:BankQuestion):CareerPracticeQuestion{
  const ref=sourceById.get(q.topicSourceId);
  return {
    id:q.id,kind:q.kind,skill:q.skill,prompt:q.prompt,weight:q.points,
    ...(q.kind==="integer"?{placeholder:"请输入整数（按题目指定的单位）"}:{
      options:q.options.map((label,i)=>({id:String.fromCharCode(65+i),label})),
    }),
    provenance:{
      sourceKind:"original" as const,authoredAt:q.authoredAt,
      sourceObservedAt:ref?.observedAt??q.authoredAt,
      topicSourceId:q.topicSourceId,
      topicSourcePlatform:ref?.platform??"本站研究",
      topicSourceTitle:ref?.title??"来源待核",
      topicSourceUrl:ref?.url??undefined,
    },
  };
}

export const CAREER_FORMAL_PAPERS:readonly CareerPracticeCase[]=BANK.map(p=>({
  id:p.id,revision:p.revision,domain:"career",family:p.category,
  title:p.title,evidenceSignalId:p.category==="procurement"?"meituan-procurement":
    p.category==="operations"?"meituan-ops":"schneider-quality",
  evidenceSkillCodes:p.category==="procurement"?["supplier_selection"]:
    p.category==="operations"?["roi"]:["quality_risk"],
  sourceRights:"original",deliveryState:"free-live-preview",
  durationMinutes:p.durationMinutes,maxPoints:100,context:p.context,
  assumptions:p.assumptions,suppliers:[],questions:p.questions.map(publicQuestion),
}));

export function getCareerFormalPaper(id:string):CareerPracticeCase|undefined{
  return CAREER_FORMAL_PAPERS.find(x=>x.id===id);
}
export function isCareerFormalPaper(id:string):boolean{
  return BANK.some(x=>x.id===id);
}

/** This answer-key access must remain server-side, used only by grade.ts. */
export function getCareerFormalAnswer(paperId:string,questionId:string):
  {value:string|readonly string[];explanation:string}|undefined{
  const q=BANK.find(p=>p.id===paperId)?.questions.find(x=>x.id===questionId);
  return q?{value:q.correct,explanation:q.explanation}:undefined;
}

export function validateCareerFormalBank():string[]{
  const errors:string[]=[];const seen=new Set<string>();const stems=new Set<string>();
  const idReg=/^[A-Z]\d{2}$/;const date=/^20\d{2}-\d{2}-\d{2}$/;
  for(const p of BANK){
    if(seen.has(p.id))errors.push("duplicate-paper:"+p.id);
    seen.add(p.id);
    if(p.revision!==1||p.questions.length!==24||p.durationMinutes!==45||
      p.questions.reduce((n,q)=>n+q.points,0)!==100)
      errors.push("invalid-paper-shape:"+p.id);
    if(p.form!=="original-mock-not-employer-paper"||
      p.origin!=="socthink-original")errors.push("mislabelled-provenance:"+p.id);
    if(!date.test(p.authoredAt)||!date.test(p.observedAt))errors.push("missing-paper-dates:"+p.id);
    for(const s of p.referenceIds)if(!sourceById.has(s))errors.push("source-not-found:"+s);
    const ids=new Set<string>();
    for(const q of p.questions){
      if(ids.has(q.id)||!idReg.test(q.id))errors.push("bad-question-id:"+p.id+"/"+q.id);
      ids.add(q.id);
      if(stems.has(q.prompt.trim()))errors.push("duplicate-stem:"+p.id+"/"+q.id);
      stems.add(q.prompt.trim());
      if(!q.skill.trim()||q.prompt.length<22||q.explanation.length<15)
        errors.push("low-quality-question:"+p.id+"/"+q.id);
      if(q.sourceKind!=="original"||q.authoredAt!==p.authoredAt||
        !sourceById.has(q.topicSourceId))
        errors.push("invalid-source:"+p.id+"/"+q.id);
      if(q.kind==="integer"){
        if(!/^\d+$/.test(String(q.correct))||q.options.length!==0)
          errors.push("invalid-number:"+p.id+"/"+q.id);
      }else{
        const options=q.options.map((_,i)=>String.fromCharCode(65+i));
        if(options.length<3||options.length>5)errors.push("invalid-options:"+p.id+"/"+q.id);
        if(q.kind==="multiple"){
          if(!Array.isArray(q.correct)||q.correct.length<2||
            q.correct.some(x=>!options.includes(x)))
            errors.push("invalid-multiple:"+p.id+"/"+q.id);
        }else if(typeof q.correct!=="string"||!options.includes(q.correct))
          errors.push("invalid-single:"+p.id+"/"+q.id);
      }
    }
  }
  if(BANK.length!==3)errors.push("invalid-case-count");
  return errors;
}
