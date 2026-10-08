import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { findExamAttemptForSession } from "./attempt-store";
import { completeExamSession, ownedExamSession } from "./exam-session";
import type { ExamAttemptRecord } from "./attempt-store";

const DIRECTORY = path.join(process.cwd(), "private", "users", ".exam-submit-locks");

export function recoveredExamResult(userId:string, examId:string, sessionId:string) {
  const session=ownedExamSession(sessionId,userId,examId);
  if(!session)return null;
  const attempt=findExamAttemptForSession(userId,examId,sessionId);
  if(!attempt)return null;
  // A process may die between append and session completion. Reconcile only
  // after checking ownership of BOTH records.
  if(!session.completedAt)completeExamSession(sessionId,attempt.id,attempt.submittedAt);
  return responseFor(attempt);
}

function responseFor(attempt:ExamAttemptRecord){
  return {...attempt.grade,attemptId:attempt.id,
    elapsedSeconds:attempt.elapsedSeconds,submittedAt:attempt.submittedAt};
}

/**
 * A filesystem-backed compare-and-commit section for the existing single,
 * shared-storage Next runtime. Never claim multi-DB-node exactly-once.
 */
export function withExamSubmitLock<T>(
  userId:string,examId:string,sessionId:string,commit:()=>T,
):T{
  if(!userId||!examId||!sessionId)throw new Error("考试会话无效");
  fs.mkdirSync(DIRECTORY,{recursive:true});
  const name=crypto.createHash("sha256").update(JSON.stringify([userId,examId,sessionId])).digest("hex");
  const lock=path.join(DIRECTORY,name);
  let owned=false;
  try{
    try{
      fs.mkdirSync(lock);
      owned=true;
    }catch(error){
      if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;
      // If the original response was lost but the attempt is safely stored,
      // recover that receipt instead of asking the pupil to submit twice.
      const existing=recoveredExamResult(userId,examId,sessionId);
      if(existing)return existing as T;
      const stale=Date.now()-fs.statSync(lock).mtimeMs>10*60*1000;
      if(!stale)throw new Error("正在保存成绩，请稍后重试",{cause:error});
      try{
        fs.rmdirSync(lock);
        fs.mkdirSync(lock);
        owned=true;
      }catch(cause){
        throw new Error("成绩保存正在恢复，请稍后重试",{cause});
      }
    }
    const existing=recoveredExamResult(userId,examId,sessionId);
    if(existing)return existing as T;
    return commit();
  }finally{
    if(owned)fs.rmdirSync(lock);
  }
}
