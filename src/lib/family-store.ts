import crypto from "node:crypto";
import {loadUsers} from "./auth";
import {atomicWriteJson,readJsonArray,userDataPath} from "./user-data-store";

type FamilyRecord={id:string;parentId:string;studentIds:string[];createdAt:number};
const FILE=userDataPath("families.json");
function load():FamilyRecord[]{return readJsonArray<FamilyRecord>(FILE)}
function save(rows:FamilyRecord[]){atomicWriteJson(FILE,rows)}
function familyForParent(parentId:string){return load().find(x=>x.parentId===parentId)||null}
export function addStudentToFamily(parentId:string,studentId:string){const rows=load();
 if(rows.some(x=>x.parentId!==parentId&&x.studentIds.includes(studentId)))throw new Error("该学生账号已属于其他家庭，请先联系原家庭解绑");
let f=rows.find(x=>x.parentId===parentId);if(!f){f={id:"fam_"+crypto.randomBytes(8).toString("hex"),parentId,studentIds:[],createdAt:Date.now()};rows.push(f)}if(!f.studentIds.includes(studentId))f.studentIds.push(studentId);save(rows);return f}
export function familyOwnsStudent(parentId:string,studentId:string){return !!familyForParent(parentId)?.studentIds.includes(studentId)}
export function publicFamilyStudents(parentId:string){const ids=new Set(familyForParent(parentId)?.studentIds||[]);return loadUsers().filter(x=>ids.has(x.id)&&x.role==="student").map(({pinHash,...u})=>{void pinHash;return u})}


/** Reuse an existing learner without changing its original grades or session ID.
 * A parent can bind only after the learner's own PIN is verified separately.
 */
export function linkVerifiedStudentToFamily(parentId:string,studentId:string){
 const u=loadUsers().find(x=>x.id===studentId&&x.role==="student"&&x.active);
 if(!u)throw new Error("学生账号不存在或已停用");
 if(familyOwnsStudent(parentId,studentId))return {studentId,alreadyLinked:true};
 addStudentToFamily(parentId,studentId);
 return {studentId,alreadyLinked:false};
}
