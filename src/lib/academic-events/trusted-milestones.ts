import {ACADEMIC_SOURCES} from "./catalog";
import type {AcademicMilestone} from "./types";

/**
 * Date gate for legacy imported school calendars. "Raw" school spreadsheets
 * must not silently become urgent reminders or apparently confirmed exams.
 */
export function trustedAcademicMilestones(today:string):AcademicMilestone[] {
  const cutoff=new Set(ACADEMIC_SOURCES.filter(s=>{
    if(s.verification!=="verified"||
      (s.authority!=="organizer"&&s.authority!=="regional-operator")||
      !s.url?.startsWith("https://")||!s.region||!s.validThrough||
      !/^\d{4}-\d{2}-\d{2}$/.test(s.validThrough)||
      s.observedAt>today||s.validThrough<today)return false;
    return true;
  }).map(s=>s.id));
  return requireTrusted(cutoff);
}
function requireTrusted(sourceIds:Set<string>):AcademicMilestone[]{
  // Import here rather than copy rows, so dates keep a single provenance.
  return importMilestones().filter(m=>sourceIds.has(m.sourceId));
}
import {ACADEMIC_MILESTONES} from "./catalog";
function importMilestones(){return ACADEMIC_MILESTONES;}
