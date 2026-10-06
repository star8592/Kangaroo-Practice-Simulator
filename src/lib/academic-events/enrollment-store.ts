import {atomicWriteJson,readJsonArray,userDataPath} from "../user-data-store";
import type {EnrollmentState} from "./types";
export type EnrollmentRecord={studentId:string;sessionId:string;state:EnrollmentState;updatedAt:number;source:"student"|"parent"|"system"};
const FILE=userDataPath("academic-enrollments.json");
export function getStudentEnrollments(studentId:string){return readJsonArray<EnrollmentRecord>(FILE).filter(x=>x.studentId===studentId)}
export function setStudentEnrollment(studentId:string,sessionId:string,state:EnrollmentState,source:EnrollmentRecord["source"]){const rows=readJsonArray<EnrollmentRecord>(FILE);const i=rows.findIndex(x=>x.studentId===studentId&&x.sessionId===sessionId);const next={studentId,sessionId,state,source,updatedAt:Date.now()};if(i>=0)rows[i]=next;else rows.push(next);atomicWriteJson(FILE,rows);return next}
