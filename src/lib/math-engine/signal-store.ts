import fs from "node:fs";
import path from "node:path";
import type { LearnerSignal } from "./core/model";
export type StoredLearnerSignal=LearnerSignal&{studentId:string;source:"arithmetic"|"structure_discovery"};
const DIR=path.join(process.cwd(),"private","math-engine");const FILE=path.join(DIR,"signals.jsonl");
export function appendLearnerSignal(signal:StoredLearnerSignal){fs.mkdirSync(DIR,{recursive:true});fs.appendFileSync(FILE,JSON.stringify(signal)+"\n");}
export function loadLearnerSignals(studentId:string,limit=1000):StoredLearnerSignal[]{if(!studentId||!fs.existsSync(FILE))return[];return fs.readFileSync(FILE,"utf8").split("\n").filter(Boolean).flatMap(line=>{try{const x=JSON.parse(line) as StoredLearnerSignal;return x.studentId===studentId?[x]:[]}catch{return[]}}).slice(-Math.max(1,limit));}
