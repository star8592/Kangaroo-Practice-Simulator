import {CAREER_FORMAL_PAPERS} from "./career-formal-bank";

/** Shared public contract for formal original career exams only.
 * The obsolete six-item quick exercises were retired. No six-question
 * case content, public exam endpoint or answer key remains in this module.
 */
export type CareerPracticeKind="single"|"multiple"|"integer";
export type CareerPracticeQuestion=Readonly<{
  id:string;kind:CareerPracticeKind;skill:string;weight:number;prompt:string;
  hint?:string;options?:readonly Readonly<{id:string;label:string}>[];
  placeholder?:string;
  provenance?:Readonly<{
    sourceKind:"original";authoredAt:string;sourceObservedAt:string;
    topicSourceId:string;topicSourcePlatform:string;
    topicSourceTitle:string;topicSourceUrl?:string;
  }>;
}>;
export type CareerPracticeCase=Readonly<{
  id:string;revision:number;title:string;domain:"career";
  family:"procurement"|"operations"|"supply";
  evidenceSignalId:string;evidenceSkillCodes:readonly string[];
  sourceRights:"original";deliveryState:"free-live-preview";
  maxPoints:number;durationMinutes:number;context:string;
  assumptions:readonly string[];
  questions:readonly CareerPracticeQuestion[];
}>;
export function getCareerPractice(id:string):CareerPracticeCase|undefined{
  return CAREER_FORMAL_PAPERS.find(p=>p.id===id);
}
export type CareerPracticeAnswers=Readonly<Record<string,string|readonly string[]>>;
