/** A signed server ticket lasts four hours; local resume ends earlier. */
export const ARITHMETIC_DRAFT_LIFETIME_MS = 225 * 60 * 1000
export const arithmeticDraftKey = (userId:string) => 'socthink_arithmetic_draft_v1:'+userId
export type ArithmeticDraft = {
 userId: string
 startedAt: number
 savedAt: number
 session: { token:string; grade:number; questions:ReadonlyArray<{id:string}>; [key:string]:unknown }
 idx: number
 raw: string
 feedback: {correct:boolean;correctAnswer?:string}|null
 responses: Array<{questionId:string;answer:string;responseMs:number;firstInputMs:number;edits:number;backspaces:number}>
}
export function validateArithmeticDraft(value:unknown,userId:string,now=Date.now()):ArithmeticDraft|null {
 if(!userId || !value || typeof value!=='object')return null
 const d=value as Partial<ArithmeticDraft>,s=d.session
 if(d.userId!==userId || !Number.isFinite(d.startedAt) || !Number.isFinite(d.savedAt) ||
   (d.startedAt as number)>now || (d.savedAt as number)>now ||
   now-(d.startedAt as number)>=ARITHMETIC_DRAFT_LIFETIME_MS ||
   typeof s?.token!=='string' || !s.token || !Number.isInteger(s.grade) || s.grade<1 || s.grade>12 ||
   !Array.isArray(s.questions) || !s.questions.length || s.questions.length>60 ||
   !s.questions.every(q=>q && typeof q.id==='string' && q.id.length>0) ||
   !Number.isInteger(d.idx) || (d.idx as number)<0 || (d.idx as number)>=s.questions.length ||
   typeof d.raw!=='string' || d.raw.length>100 ||
   !Array.isArray(d.responses) || d.responses.length>60 ||
   !d.responses.every(x=>x && typeof x.questionId==='string' && typeof x.answer==='string'))return null
 if(d.feedback!==null && (typeof d.feedback!=='object' || typeof d.feedback.correct!=='boolean'))return null
 return d as ArithmeticDraft
}
