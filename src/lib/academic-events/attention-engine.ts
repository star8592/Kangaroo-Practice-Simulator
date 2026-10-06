import type {AcademicEvent,AcademicMilestone,AcademicSession,AttentionItem,EnrollmentState,StudentAcademicContext} from "./types";

const committed=new Set<EnrollmentState>(["registered","confirmed","preparing","ready"]);
const terminal=new Set<EnrollmentState>(["taken","result-pending","result-known","awarded","closed"]);
const dayMs=86400000;
function utcDay(s:string){return Date.parse(s.slice(0,10)+"T00:00:00Z")}
export function daysUntil(date:string,today:string){return Math.ceil((utcDay(date)-utcDay(today))/dayMs)}

export function buildAttentionItems(args:{events:AcademicEvent[];sessions:AcademicSession[];milestones:AcademicMilestone[];student:StudentAcademicContext;today:string}):AttentionItem[]{
 const eventById=new Map(args.events.map(x=>[x.id,x]));
 const completed=new Set(args.student.completedMilestoneIds||[]);
 const items:AttentionItem[]=[];
 for(const session of args.sessions){
  const event=eventById.get(session.eventId); if(!event)continue;
  if(event.minGrade&&args.student.grade<event.minGrade)continue;
  if(event.maxGrade&&args.student.grade>event.maxGrade)continue;
  if(args.student.region&&session.region!=="global"&&session.region!==args.student.region)continue;
  const state=args.student.enrollments[session.id]||"eligible";
  if(terminal.has(state))continue;
  for(const milestone of args.milestones){
   if(milestone.sessionId!==session.id||completed.has(milestone.id))continue;
   const d=daysUntil(milestone.start,args.today);
   if(d < -2)continue;
   let priority:AttentionItem["priority"]="P5";
   let reasonZh="供你了解"; let reasonEn="For reference";
   if(committed.has(state)&&d<0&&milestone.consequence==="critical"){priority="P0";reasonZh="已报名，关键事项已经到期";reasonEn="Registered; critical action is overdue";}
   else if(committed.has(state)&&d<=7){priority="P1";reasonZh="已报名，关键节点临近";reasonEn="Registered; milestone is imminent";}
   else if(milestone.kind==="registration-deadline"&&d>=0&&d<=14&&(state==="eligible"||state==="interested"||state==="planned")){priority="P2";reasonZh="适合你，报名即将截止";reasonEn="Relevant to you; registration closes soon";}
   else if(committed.has(state)){priority="P3";reasonZh="已报名，提前准备";reasonEn="Registered; prepare ahead";}
   else if((args.student.explicitInterestEventIds||[]).includes(event.id)){priority="P4";reasonZh="你关注的赛事";reasonEn="An event you follow";}
   items.push({milestone,session,event,priority,daysUntil:d,reasonZh,reasonEn});
  }
 }
 const weight={P0:0,P1:1,P2:2,P3:3,P4:4,P5:5};
 return items.sort((a,b)=>weight[a.priority]-weight[b.priority]||a.daysUntil-b.daysUntil||a.milestone.id.localeCompare(b.milestone.id));
}
export function attentionBudget(items:AttentionItem[]){return {doNow:items[0]||null,next:items.slice(1,4),hiddenCount:Math.max(0,items.length-4)}}
