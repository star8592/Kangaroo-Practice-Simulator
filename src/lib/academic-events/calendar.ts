import {ACADEMIC_EVENTS,ACADEMIC_MILESTONES,ACADEMIC_SESSIONS} from "./catalog";
import {getStudentEnrollments} from "./enrollment-store";
import {daysUntil} from "./attention-engine";
import type {AcademicMilestone,EnrollmentState} from "./types";
const order:Record<string,number>={"registration-deadline":0,mock:1,"device-check":2,"check-in":3,"submission-deadline":4,exam:5,"score-release":6,result:7,certificate:8};
export type CalendarStage="报名"|"备赛"|"待考试"|"考试完成"|"等待成绩"|"成绩/证书"|"已结束";
export function lifecycleStage(state:EnrollmentState,milestones:AcademicMilestone[],today:string):CalendarStage{
 if(state==="closed")return "已结束";if(state==="awarded"||state==="result-known")return "成绩/证书";if(state==="result-pending")return "等待成绩";if(state==="taken")return "考试完成";
 const future=milestones.filter(x=>daysUntil(x.start,today)>=0).sort((a,b)=>a.start.localeCompare(b.start));
 if(state==="eligible"||state==="interested"||state==="planned")return "报名";
 if(future[0]?.kind==="exam"||state==="ready")return "待考试";
 return "备赛";
}
export function buildAcademicCalendar(student:{id:string;grade:number},today:string){
 const states=new Map(getStudentEnrollments(student.id).map(x=>[x.sessionId,x.state]));
 return ACADEMIC_SESSIONS.flatMap(session=>{
  const event=ACADEMIC_EVENTS.find(x=>x.id===session.eventId);if(!event)return[];
  if(event.minGrade&&student.grade<event.minGrade)return[];if(event.maxGrade&&student.grade>event.maxGrade)return[];
  const state=states.get(session.id)||"eligible";
  if(state==="eligible")return[]; // Full calendar is personal, not a catalog.
  const milestones=ACADEMIC_MILESTONES.filter(x=>x.sessionId===session.id).sort((a,b)=>a.start.localeCompare(b.start)||((order[a.kind]||0)-(order[b.kind]||0)));
  return[{session,event,state,stage:lifecycleStage(state,milestones,today),milestones}];
 }).sort((a,b)=>(a.milestones.find(x=>daysUntil(x.start,today)>=0)?.start||"9999").localeCompare(b.milestones.find(x=>daysUntil(x.start,today)>=0)?.start||"9999"));
}
