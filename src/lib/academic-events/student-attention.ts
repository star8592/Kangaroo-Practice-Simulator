import { ACADEMIC_EVENTS,ACADEMIC_MILESTONES,ACADEMIC_SESSIONS } from "./catalog";
import { attentionBudget,buildAttentionItems } from "./attention-engine";
import { COMPETITION_COMPANIONS } from "../competition-companion";
import { getCompetitionCompanionProgress } from "../competition-companion-progress";
import type { EnrollmentState } from "./types";
function companionSessionId(competitionId:string,season:number){if(competitionId==="australian-amc"&&season===2026)return "au-amc-cn-2026";return null}
export function buildStudentAttention(user:{id:string;grade:number;school?:string},today:string){
 const enrollments:Record<string,EnrollmentState>={};const completed:string[]=[];
 for(const c of COMPETITION_COMPANIONS){const sid=companionSessionId(c.competitionId,c.season);if(!sid)continue;const p=getCompetitionCompanionProgress(user.id,c.id);if(p.updatedAt>0){enrollments[sid]="preparing";for(const taskId of p.completedTaskIds){const task=c.tasks.find(x=>x.id===taskId);if(!task)continue;const same=ACADEMIC_MILESTONES.find(m=>m.sessionId===sid&&m.start===task.date);if(same)completed.push(same.id)}}}
 const items=buildAttentionItems({events:ACADEMIC_EVENTS,sessions:ACADEMIC_SESSIONS,milestones:ACADEMIC_MILESTONES,today,student:{grade:user.grade,region:"CN",school:user.school,enrollments,completedMilestoneIds:completed}});
 return attentionBudget(items.filter(x=>x.priority!=="P5"));
}
