import crypto from "node:crypto";
import {loadUsers} from "./auth";
import {atomicWriteJson,readJsonArray,userDataPath} from "./user-data-store";

type FamilyRecord={id:string;parentId:string;studentIds:string[];createdAt:number};
const FILE=userDataPath("families.json");
function load():FamilyRecord[]{return readJsonArray<FamilyRecord>(FILE)}
function save(rows:FamilyRecord[]){atomicWriteJson(FILE,rows)}
function familyForParent(parentId:string){return load().find(x=>x.parentId===parentId)||null}
export function addStudentToFamily(parentId:string,studentId:string){const rows=load();let f=rows.find(x=>x.parentId===parentId);if(!f){f={id:"fam_"+crypto.randomBytes(8).toString("hex"),parentId,studentIds:[],createdAt:Date.now()};rows.push(f)}if(!f.studentIds.includes(studentId))f.studentIds.push(studentId);save(rows);return f}
export function familyOwnsStudent(parentId:string,studentId:string){return !!familyForParent(parentId)?.studentIds.includes(studentId)}
export function publicFamilyStudents(parentId:string){const ids=new Set(familyForParent(parentId)?.studentIds||[]);return loadUsers().filter(x=>ids.has(x.id)&&x.role==="student").map(({pinHash,...u})=>{void pinHash;return u})}
