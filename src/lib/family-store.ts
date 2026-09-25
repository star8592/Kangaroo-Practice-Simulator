import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {loadUsers} from "./auth";

export type FamilyRecord={id:string;parentId:string;studentIds:string[];createdAt:number};
const DIR=path.join(process.cwd(),"private","users"),FILE=path.join(DIR,"families.json");
function ensure(){fs.mkdirSync(DIR,{recursive:true})}
function load():FamilyRecord[]{ensure();if(!fs.existsSync(FILE))return[];try{const x=JSON.parse(fs.readFileSync(FILE,"utf8"));return Array.isArray(x)?x:[]}catch{return[]}}
function save(rows:FamilyRecord[]){ensure();const tmp=FILE+".tmp";fs.writeFileSync(tmp,JSON.stringify(rows,null,2));fs.renameSync(tmp,FILE)}
export function familyForParent(parentId:string){return load().find(x=>x.parentId===parentId)||null}
export function ensureFamily(parentId:string){const rows=load();let f=rows.find(x=>x.parentId===parentId);if(!f){f={id:"fam_"+crypto.randomBytes(8).toString("hex"),parentId,studentIds:[],createdAt:Date.now()};rows.push(f);save(rows)}return f}
export function addStudentToFamily(parentId:string,studentId:string){const rows=load();let f=rows.find(x=>x.parentId===parentId);if(!f){f={id:"fam_"+crypto.randomBytes(8).toString("hex"),parentId,studentIds:[],createdAt:Date.now()};rows.push(f)}if(!f.studentIds.includes(studentId))f.studentIds.push(studentId);save(rows);return f}
export function familyOwnsStudent(parentId:string,studentId:string){return !!familyForParent(parentId)?.studentIds.includes(studentId)}
export function publicFamilyStudents(parentId:string){const ids=new Set(familyForParent(parentId)?.studentIds||[]);return loadUsers().filter(x=>ids.has(x.id)&&x.role==="student").map(({pinHash,...u})=>{void pinHash;return u})}
