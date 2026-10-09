import {VERIFIED_EDITIONS,deriveVerifiedNotices,type VerifiedNotice} from "./competition-intelligence";
import {getParticipationRegion} from "./competition-intelligence-preferences";
import {getWorldCompetitionFollows} from "./world-competition-follows";
import {getStudentEnrollments} from "./academic-events/enrollment-store";

export function buildStudentIntelligence(student:{id:string;grade:number;username?:string},today:string):{
  region:ReturnType<typeof getParticipationRegion>;followedCount:number;notices:VerifiedNotice[];
  next:VerifiedNotice[];hiddenCount:number;reviewedEditionCount:number;
}{
  const region=getParticipationRegion(student.id);
  const follows=getWorldCompetitionFollows(student.id);
  const enrollments=getStudentEnrollments(student.id);
  const registeredSessionIds=enrollments.filter(x=>
    ["registered","confirmed","preparing","ready","taken","result-pending","result-known","awarded"].includes(x.state)
  ).map(x=>x.sessionId);
  const grade=student.username==="wechat"?null:student.grade;
  const notices=deriveVerifiedNotices({
    editions:VERIFIED_EDITIONS,followedEventIds:follows.map(x=>x.eventId),participationRegion:region,
    registeredSessionIds,grade,today,
  });
  return {region,followedCount:follows.length,notices,next:notices.slice(0,3),
    hiddenCount:Math.max(0,notices.length-3),reviewedEditionCount:VERIFIED_EDITIONS.length};
}
