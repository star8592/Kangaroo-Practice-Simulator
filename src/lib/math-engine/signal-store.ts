import fs from "node:fs";
import path from "node:path";
import { loadArithmeticSessions } from "../arithmetic-session-store";
import { arithmeticAttemptToSignal } from "./adapters/arithmetic";
import type { LearnerSignal } from "./core/model";
export type StoredLearnerSignal=LearnerSignal&{studentId:string;source:"arithmetic"|"structure_discovery"};
const DIR=path.join(process.cwd(),"private","math-engine");const FILE=path.join(DIR,"signals.jsonl");
export function appendLearnerSignal(signal:StoredLearnerSignal){fs.mkdirSync(DIR,{recursive:true});fs.appendFileSync(FILE,JSON.stringify(signal)+"\n");}
export function loadLearnerSignals(studentId:string,limit=1000):StoredLearnerSignal[]{if(!studentId||!fs.existsSync(FILE))return[];return fs.readFileSync(FILE,"utf8").split("\n").filter(Boolean).flatMap(line=>{try{const x=JSON.parse(line) as StoredLearnerSignal;return x.studentId===studentId?[x]:[]}catch{return[]}}).slice(-Math.max(1,limit));}
export function loadUnifiedLearnerSignals(studentId:string,grade?:number,limit=1000):StoredLearnerSignal[]{
 const stored=loadLearnerSignals(studentId,limit).filter(x=>grade===undefined||x.grade===grade);
 const derived=loadArithmeticSessions(studentId,500).filter(s=>grade===undefined||s.grade===grade).flatMap(s=>s.attempts.map(a=>({...arithmeticAttemptToSignal(a),studentId,source:"arithmetic" as const})));
 const unique=new Map<string,StoredLearnerSignal>();for(const x of [...derived,...stored])unique.set(`${x.source}:${x.entityId}:${x.timestamp}`,x);
 return [...unique.values()].sort((a,b)=>a.timestamp-b.timestamp).slice(-Math.max(1,limit));
}
