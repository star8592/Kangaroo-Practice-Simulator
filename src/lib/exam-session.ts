import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ExamTimingSection } from "./types";

export type ExamSectionLock = {
  sectionIndex: number;
  startedAt: number;
  lockedAt: number;
  answers: Record<string,string>;
};

export type ExamSessionRecord = {
  id: string;
  userId: string;
  examId: string;
  startedAt: number;
  expiresAt: number;
  completedAt?: number;
  attemptId?: string;
  sectionIndex?: number;
  sectionStartedAt?: number;
  sectionLocks?: ExamSectionLock[];
  sectionDrafts?: Record<string,{answers:Record<string,string>;updatedAt:number}>;
};

const D=path.join(process.cwd(),"private","users");
const F=path.join(D,"exam-sessions.json");

function all():ExamSessionRecord[]{
  if(!fs.existsSync(F))return[];
  try{
    const x=JSON.parse(fs.readFileSync(F,"utf8"));
    return Array.isArray(x)?x:[];
  }catch{return[]}
}
function save(x:ExamSessionRecord[]){
  fs.mkdirSync(path.dirname(F),{recursive:true});
  fs.writeFileSync(F,JSON.stringify(x.filter(r=>r.startedAt>Date.now()-12096e5).slice(-2000),null,2));
}

export function activeExamSession(u:string,e:string){
  return all().filter(x=>x.userId===u&&x.examId===e&&!x.completedAt&&x.expiresAt>Date.now()).sort((a,b)=>b.startedAt-a.startedAt)[0]??null;
}

export function startExamSession(u:string,e:string,d:number,sections?:ExamTimingSection[],now=Date.now()){
  const old=activeExamSession(u,e);
  if(old)return{session:old,resumed:true};
  const split=Boolean(sections?.length);
  const s:ExamSessionRecord={
    id:`sess_${crypto.randomBytes(12).toString("hex")}`,
    userId:u,examId:e,startedAt:now,
    expiresAt:now+((d>0?d+(split?7200:600):86400))*1000,
    ...(split?{sectionIndex:0,sectionStartedAt:now,sectionLocks:[],sectionDrafts:{}}:{})
  };
  const x=all();x.push(s);save(x);return{session:s,resumed:false};
}

export function validateExamSession(id:string,u:string,e:string){
  const x=all().find(r=>r.id===id);
  if(!x||x.userId!==u||x.examId!==e)return{ok:false as const,error:"考试会话无效"};
  if(x.completedAt)return{ok:false as const,error:"该考试已经交卷"};
  if(x.expiresAt<Date.now())return{ok:false as const,error:"考试会话已过期"};
  return{ok:true as const,session:x};
}

function mutateSession(id:string,u:string,e:string,fn:(s:ExamSessionRecord)=>void){
  const x=all(),s=x.find(r=>r.id===id&&r.userId===u&&r.examId===e);
  if(!s)throw new Error("考试会话无效");
  if(s.completedAt)throw new Error("该考试已经交卷");
  fn(s);save(x);return s;
}

export function saveExamSectionDraft(args:{
  id:string;userId:string;examId:string;sectionIndex:number;
  answers:Record<string,string>;questionIds:string[];durationSeconds:number;now?:number;
}){
  const now=args.now??Date.now();
  return mutateSession(args.id,args.userId,args.examId,s=>{
    if((s.sectionIndex??0)!==args.sectionIndex)throw new Error("考试部分状态不匹配");
    if(!s.sectionStartedAt)throw new Error("当前部分尚未开始");
    const deadline=s.sectionStartedAt+args.durationSeconds*1000;
    if(now>deadline)throw new Error("当前部分作答时间已结束");
    const allowed=new Set(args.questionIds);
    const snapshot=Object.fromEntries(Object.entries(args.answers).filter(([k])=>allowed.has(k)));
    s.sectionDrafts??={};
    s.sectionDrafts[String(args.sectionIndex)]={answers:snapshot,updatedAt:now};
  });
}

export function lockExamSection(args:{
  id:string;userId:string;examId:string;sectionIndex:number;
  answers:Record<string,string>;questionIds:string[];durationSeconds:number;now?:number;
}){
  const now=args.now??Date.now();
  return mutateSession(args.id,args.userId,args.examId,s=>{
    const current=s.sectionIndex??0;
    if(current!==args.sectionIndex)throw new Error("考试部分状态不匹配");
    if(!s.sectionStartedAt)throw new Error("当前部分尚未开始");
    const locks=s.sectionLocks??[];
    if(locks.some(x=>x.sectionIndex===args.sectionIndex))throw new Error("该部分已经锁定");
    const allowed=new Set(args.questionIds);
    const deadline=s.sectionStartedAt+args.durationSeconds*1000;
    const onTime=now<=deadline;
    const requestSnapshot=Object.fromEntries(Object.entries(args.answers).filter(([k])=>allowed.has(k)));
    if(onTime){
      s.sectionDrafts??={};
      s.sectionDrafts[String(args.sectionIndex)]={answers:requestSnapshot,updatedAt:now};
    }
    const snapshot=s.sectionDrafts?.[String(args.sectionIndex)]?.answers??{};
    locks.push({sectionIndex:args.sectionIndex,startedAt:s.sectionStartedAt,lockedAt:Math.min(now,deadline),answers:snapshot});
    s.sectionLocks=locks;
    s.sectionIndex=args.sectionIndex+1;
    delete s.sectionStartedAt;
  });
}

export function startExamSection(args:{id:string;userId:string;examId:string;sectionIndex:number;now?:number}){
  const now=args.now??Date.now();
  return mutateSession(args.id,args.userId,args.examId,s=>{
    if((s.sectionIndex??0)!==args.sectionIndex)throw new Error("考试部分状态不匹配");
    if(s.sectionStartedAt)throw new Error("当前部分已经开始");
    if((s.sectionLocks??[]).some(x=>x.sectionIndex===args.sectionIndex))throw new Error("该部分已经锁定");
    s.sectionStartedAt=now;
  });
}

export function lockedExamAnswers(s:ExamSessionRecord){
  const out:Record<string,string>={};
  for(const lock of [...(s.sectionLocks??[])].sort((a,b)=>a.sectionIndex-b.sectionIndex))Object.assign(out,lock.answers);
  return out;
}
export function allExamSectionsLocked(s:ExamSessionRecord,count:number){
  const got=new Set((s.sectionLocks??[]).map(x=>x.sectionIndex));
  return Array.from({length:count},(_,i)=>got.has(i)).every(Boolean);
}
export function activeSectionElapsedSeconds(s:ExamSessionRecord,sections:ExamTimingSection[]){
  return Math.round((s.sectionLocks??[]).reduce((sum,lock)=>{
    const cap=sections[lock.sectionIndex]?.durationSeconds??0;
    return sum+Math.min(Math.max(0,lock.lockedAt-lock.startedAt),cap*1000);
  },0)/1000);
}

export function completeExamSession(id:string,a:string,t=Date.now()){
  const x=all(),r=x.find(v=>v.id===id);
  if(!r||r.completedAt)throw new Error("考试会话不可完成");
  r.completedAt=t;r.attemptId=a;save(x);
}

export function activeExamSessionsForUser(userId:string,now=Date.now()){
  return all().filter(x=>x.userId===userId&&!x.completedAt&&x.expiresAt>now);
}
