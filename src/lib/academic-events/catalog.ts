import raw from "../../../data/academic-events/aseeder-basis-fall-2026.json";
import type {AcademicEvent,AcademicMilestone,AcademicSession,AcademicSource} from "./types";
export const ACADEMIC_SOURCES=[raw.source as AcademicSource];
export const ACADEMIC_EVENTS=raw.events as AcademicEvent[];
export const ACADEMIC_SESSIONS=raw.sessions as AcademicSession[];
export const ACADEMIC_MILESTONES=raw.milestones as AcademicMilestone[];
