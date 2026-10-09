import { WORLD_COMPETITIONS } from "./world-competitions";
import { getWorldCompetitionFollows } from "./world-competition-follows";
import { getWorldCompanion } from "./competition-companion";
import { getCompetitionCompanionProgress } from "./competition-companion-progress";

export type FollowedCompetitionPlan = {
  eventId:string; nameZh:string; nameEn:string; region:string; completed:number;total:number;
  nextTaskZh:string|null; nextTaskEn:string|null; nextTaskId:string|null;
  /** Following a competition does not imply a verified dated session or enrollment. */
  registrationVerified:boolean;
};
export function buildWorldFollowedCalendar(studentId:string,today:string):FollowedCompetitionPlan[] {
  return getWorldCompetitionFollows(studentId).map(follow=>{
    const event=WORLD_COMPETITIONS.find(x=>x.id===follow.eventId)!;
    const companion=getWorldCompanion(event.id,today);
    const tasks=companion?.tasks||[];
    const completed=new Set(companion?getCompetitionCompanionProgress(studentId,companion.id).completedTaskIds:[]);
    const next=tasks.find(t=>!completed.has(t.id));
    return {
      eventId:event.id,nameZh:event.nameZh,nameEn:event.nameEn,region:event.region,
      completed:tasks.filter(t=>completed.has(t.id)).length,total:tasks.length,
      nextTaskZh:next?.titleZh||null,nextTaskEn:next?.titleEn||null,nextTaskId:next?.id||null,
      registrationVerified:!!companion?.registrationVerified,
    };
  });
}
