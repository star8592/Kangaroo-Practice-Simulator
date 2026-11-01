/**
 * One-account career attempt store, using the existing SOCTHINK private user
 * data root. The existing verified WeChat learning identity owns each record;
 * guest or legacy anonymous sessions never gain a server-side history.
 *
 * One-host filesystem semantics only. Independent, per-attempt immutable
 * records are published with an atomic hard-link (no JSONL lost updates, no
 * cross-release data tied to the immutable Next runtime).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {PublicStudent} from "./auth";
import type {CareerPracticeAnswers} from "./career-practice";
import type {CareerPracticeGrade} from "./career-practice-grade";
import {userDataPath} from "./user-data-store";

export const CAREER_ATTEMPT_STORE_VERSION=1;
const ROOT=userDataPath("career-practice-attempts");
const UUID_V4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVerifiedCareerStudyIdentity(user:PublicStudent|null|undefined):user is PublicStudent {
  return Boolean(user&&user.role==="student"&&user.candidateNo==="WECHAT"&&(
    /^wx_[a-f0-9]{32}$/.test(user.id) ||
    /^guest_family_[a-f0-9]{32}$/.test(user.id)
  ));
}

export type CareerAttemptSummary=Readonly<{
  attemptId:string;
  caseId:string;
  title:string;
  revision:number;
  score:number;
  maxPoints:number;
  completed:number;
  totalQuestions:number;
  submittedAt:number;
}>;

export type SavedCareerAttempt=Readonly<{
  version:typeof CAREER_ATTEMPT_STORE_VERSION;
  ownerId:string;
  fingerprint:string;
  summary:CareerAttemptSummary;
  grade:CareerPracticeGrade;
}>;

export class CareerAttemptConflictError extends Error{
  constructor(){super("ATTEMPT_ID_CONFLICT");}
}

function ownerDirectory(ownerId:string){
  if(!/^(wx_|guest_family_)[0-9a-f]{32}$/.test(ownerId))throw Error("INVALID_OWNER");
  const digest=crypto.createHash("sha256").update("socthink:career-owner:v1:"+ownerId).digest("hex");
  return path.join(ROOT,digest);
}
function attemptPath(ownerId:string,attemptId:string){
  if(!UUID_V4.test(attemptId))throw Error("INVALID_ATTEMPT_ID");
  return path.join(ownerDirectory(ownerId),attemptId.toLowerCase()+".json");
}
export function isValidCareerAttemptId(value:unknown):value is string{
  return typeof value==="string"&&UUID_V4.test(value);
}

function decode(record:unknown,ownerId:string):SavedCareerAttempt {
  if(!record||typeof record!=="object"||Array.isArray(record))throw Error("CORRUPTED_CAREER_ATTEMPT");
  const x=record as SavedCareerAttempt;
  if(x.version!==CAREER_ATTEMPT_STORE_VERSION||x.ownerId!==ownerId||
    !isValidCareerAttemptId(x.summary?.attemptId)||
    !/^[0-9a-f]{64}$/.test(x.fingerprint)||
    !Number.isFinite(x.summary?.score)||
    !Number.isFinite(x.summary?.submittedAt)||
    x.grade?.caseId!==x.summary.caseId||
    x.grade?.revision!==x.summary.revision||
    x.grade?.score!==x.summary.score)
    throw Error("CORRUPTED_CAREER_ATTEMPT");
  return x;
}
export function readCareerAttempt(ownerId:string,attemptId:string):SavedCareerAttempt|null{
  const filename=attemptPath(ownerId,attemptId);
  try{
    return decode(JSON.parse(fs.readFileSync(filename,"utf8")),ownerId);
  }catch(e){
    if((e as NodeJS.ErrnoException).code==="ENOENT")return null;
    throw e;
  }
}
export function careerAnswersFingerprint(caseId:string,revision:number,answers:CareerPracticeAnswers){
  return crypto.createHash("sha256").update(JSON.stringify([caseId,revision,answers])).digest("hex");
}

export function recordCareerAttempt(params:{
  ownerId:string;
  attemptId:string;
  caseId:string;
  title:string;
  revision:number;
  answers:CareerPracticeAnswers;
  grade:CareerPracticeGrade;
  submittedAt?:number;
}):{record:SavedCareerAttempt;alreadySaved:boolean}{
  const {ownerId,attemptId,caseId,revision,answers,grade}=params;
  if(!isValidCareerAttemptId(attemptId)||grade.caseId!==caseId||grade.revision!==revision||
    grade.maxPoints<=0||grade.score<0||grade.score>grade.maxPoints)
    throw Error("INVALID_CAREER_ATTEMPT");
  const fingerprint=careerAnswersFingerprint(caseId,revision,answers);
  const existing=readCareerAttempt(ownerId,attemptId);
  if(existing){
    if(existing.summary.caseId!==caseId||existing.summary.revision!==revision||
      existing.fingerprint!==fingerprint)throw new CareerAttemptConflictError();
    return {record:existing,alreadySaved:true};
  }
  const parent=ownerDirectory(ownerId);
  fs.mkdirSync(parent,{recursive:true,mode:0o700});
  const destination=attemptPath(ownerId,attemptId);
  const fullGrade={...grade,attemptPersistence:"account" as const};
  const record:SavedCareerAttempt={
    version:CAREER_ATTEMPT_STORE_VERSION,ownerId,fingerprint,
    summary:{
      attemptId:attemptId.toLowerCase(),caseId,title:params.title,revision,
      score:grade.score,maxPoints:grade.maxPoints,completed:grade.completed,
      totalQuestions:grade.totalQuestions,submittedAt:params.submittedAt??Date.now(),
    },
    grade:fullGrade,
  };
  const tmp=destination+".tmp-"+crypto.randomBytes(8).toString("hex");
  let fd:number|undefined;
  try{
    fd=fs.openSync(tmp,"wx",0o600);
    fs.writeFileSync(fd,JSON.stringify(record));
    fs.fsyncSync(fd);
  }finally{
    if(fd!==undefined)fs.closeSync(fd);
  }
  try{
    // Atomic no-overwrite commit, even if two Node workers submit the same ID.
    fs.linkSync(tmp,destination);
    return {record,alreadySaved:false};
  }catch(e){
    if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;
    const winner=readCareerAttempt(ownerId,attemptId);
    if(!winner)throw new Error("CAREER_ATTEMPT_UNAVAILABLE",{cause:e});
    if(winner.fingerprint!==fingerprint||winner.summary.caseId!==caseId||
      winner.summary.revision!==revision)throw new CareerAttemptConflictError();
    return {record:winner,alreadySaved:true};
  }finally{
    try{fs.unlinkSync(tmp);}catch{/* Temp cleanup is best effort. */}
  }
}

export function listCareerAttemptSummaries(ownerId:string,options?:{
  caseId?:string;limit?:number;
}):CareerAttemptSummary[]{
  const dir=ownerDirectory(ownerId);
  let names:string[];
  try{names=fs.readdirSync(dir).filter(x=>UUID_V4.test(x.replace(/\.json$/,""))&&x.endsWith(".json"));}
  catch(e){
    if((e as NodeJS.ErrnoException).code==="ENOENT")return [];
    throw e;
  }
  const limit=Math.max(1,Math.min(50,options?.limit??20));
  const records=names.map(filename=>{
    const id=filename.slice(0,-5);
    return readCareerAttempt(ownerId,id);
  }).filter((x):x is SavedCareerAttempt=>x!==null);
  return records.filter(x=>!options?.caseId||x.summary.caseId===options.caseId)
    .sort((a,b)=>b.summary.submittedAt-a.summary.submittedAt||
      b.summary.attemptId.localeCompare(a.summary.attemptId))
    .slice(0,limit).map(x=>x.summary);
}
