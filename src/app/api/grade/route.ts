import { NextRequest,NextResponse } from "next/server";
import { gradeExam } from "@/lib/grading";
import { isExamBundleStudentReady,loadExamBundle } from "@/lib/question-bank";
import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";
import { appendExamAttempt,type ExamEvent } from "@/lib/attempt-store";
import {
  activeSectionElapsedSeconds,
  allExamSectionsLocked,
  completeExamSession,
  lockedExamAnswers,
  validateExamSession
} from "@/lib/exam-session";

function events(v:unknown,s:number,e:number):ExamEvent[]{
  if(!Array.isArray(v))return[];
  return v.slice(-5000).flatMap(raw=>{
    if(!raw||typeof raw!=="object")return[];
    const x=raw as Record<string,unknown>;
    if(typeof x.type!=="string")return[];
    const n=Number(x.at),z:ExamEvent={type:x.type.slice(0,60),at:Number.isFinite(n)?Math.max(s,Math.min(e,n)):e};
    if(typeof x.questionId==="string")z.questionId=x.questionId.slice(0,120);
    if(typeof x.value==="string")z.value=x.value.slice(0,80);
    return[z];
  });
}

export async function POST(r:NextRequest){
  try{
    const u=userFromSessionToken(r.cookies.get(SESSION_COOKIE)?.value);
    if(!u)return NextResponse.json({error:"请先登录考生账号"},{status:401});
    const b=await r.json(),id=String(b?.examId||"level-a"),sid=String(b?.sessionId||"");
    const valid=validateExamSession(sid,u.id,id);
    if(!valid.ok)return NextResponse.json({error:valid.error},{status:409});
    const bundle=loadExamBundle(id);
    if(!isExamBundleStudentReady(bundle))return NextResponse.json({error:"Exam is not student-ready"},{status:404});

    const sections=bundle.profile.timingSections||[];
    let effectiveAnswers=(b?.answers||{}) as Record<string,string>;
    if(sections.length){
      if(!allExamSectionsLocked(valid.session,sections.length)){
        return NextResponse.json({error:"请先完成并锁定所有考试部分"},{status:409});
      }
      effectiveAnswers=lockedExamAnswers(valid.session);
    }

    const g=gradeExam(bundle.questions,effectiveAnswers,bundle.profile,b?.lang==="en"?"en":"zh");
    const submittedAt=Date.now();
    const elapsedSeconds=sections.length
      ? activeSectionElapsedSeconds(valid.session,sections)
      : bundle.profile.timingMode==="untimed"
        ? Math.max(0,Math.round((submittedAt-valid.session.startedAt)/1000))
        : Math.min(bundle.profile.durationSeconds,Math.max(0,Math.round((submittedAt-valid.session.startedAt)/1000)));

    const es=events(b?.events,valid.session.startedAt,submittedAt);
    es.push({type:"server_submit",at:submittedAt});
    const a=appendExamAttempt({user:u,bundle,grade:g,events:es,startedAt:valid.session.startedAt,submittedAt,elapsedSeconds});
    completeExamSession(sid,a.id,submittedAt);
    return NextResponse.json({...g,attemptId:a.id,elapsedSeconds,submittedAt});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"Unable to grade exam"},{status:500});
  }
}
