import type {ArithmeticSession} from './arithmetic-analytics'

export type RecentCalculationChange={
 grade:number
 mode:ArithmeticSession['mode']
 previousCorrect:number
 previousTotal:number
 recentCorrect:number
 recentTotal:number
 previousAccuracy:number
 recentAccuracy:number
 deltaPoints:number
 descriptionZh:string
}
/** Only comparable completed groups: same grade AND same activity mode, at least 4 x 10 answers. */
export function compareRecentCalculation(sessions:readonly ArithmeticSession[]):RecentCalculationChange|null{
 const complete=sessions.filter(s=>s&&Number.isFinite(s.finishedAt)&&s.finishedAt>0&&
   Number.isInteger(s.grade)&&s.grade>=1&&s.grade<=12&&
   Array.isArray(s.attempts)&&s.attempts.length>=10&&
   ['adaptive','diagnostic','speed','guided'].includes(s.mode))
   .sort((a,b)=>a.finishedAt-b.finishedAt)
 const newest=complete[complete.length-1]
 if(!newest)return null
 const same=complete.filter(s=>s.grade===newest.grade&&s.mode===newest.mode).slice(-4)
 if(same.length<4)return null
 const sum=(rows:ArithmeticSession[])=>rows.reduce((a,s)=>({
  correct:a.correct+s.attempts.filter(q=>q.correct===true).length,
  total:a.total+s.attempts.length
 }),{correct:0,total:0})
 const early=sum(same.slice(0,2)),late=sum(same.slice(2))
 if(early.total<20||late.total<20)return null
 const previousAccuracy=early.correct/early.total,recentAccuracy=late.correct/late.total
 const deltaPoints=Math.round((recentAccuracy-previousAccuracy)*100)
 const line=Math.abs(deltaPoints)<5?'最近两轮与此前两轮的正确率接近':
   deltaPoints>0?'最近两轮正确率高于此前两轮':'最近两轮正确率低于此前两轮'
 return{
  grade:newest.grade,mode:newest.mode,
  previousCorrect:early.correct,previousTotal:early.total,
  recentCorrect:late.correct,recentTotal:late.total,
  previousAccuracy,recentAccuracy,deltaPoints,
  descriptionZh:line+'（'+Math.round(previousAccuracy*100)+'% → '+Math.round(recentAccuracy*100)+'%）。题型和难度可能不同，只是观察信号，不能据此断言能力变化。'
 }
}
