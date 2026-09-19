import { NextRequest,NextResponse } from "next/server";
import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";
import { isExamBundleStudentReady,loadExamBundle } from "@/lib/question-bank";
import { activeExamSession,lockExamSection,saveExamSectionDraft,startExamSection,startExamSession } from "@/lib/exam-session";

const user=(r:NextRequest)=>userFromSessionToken(r.cookies.get(SESSION_COOKIE)?.value);

export async function GET(r:NextRequest){
  const u=user(r);
  if(!u)return NextResponse.json({error:"请先登录考生账号"},{status:401});
  const id=r.nextUrl.searchParams.get("examId")||"";
  return id?NextResponse.json({session:activeExamSession(u.id,id)}):NextResponse.json({error:"missing examId"},{status:400});
}

export async function POST(r:NextRequest){
  try{
    const u=user(r);
    if(!u)return NextResponse.json({error:"请先登录考生账号"},{status:401});
    const b=await r.json(),id=String(b?.examId||""),bundle=loadExamBundle(id);
    if(!isExamBundleStudentReady(bundle))return NextResponse.json({error:"Exam is not student-ready"},{status:404});
    return NextResponse.json({
      ...startExamSession(u.id,id,bundle.profile.durationSeconds,bundle.profile.timingSections),
      durationSeconds:bundle.profile.durationSeconds
    });
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"无法创建考试会话"},{status:500});
  }
}

export async function PATCH(r:NextRequest){
  try{
    const u=user(r);
    if(!u)return NextResponse.json({error:"请先登录考生账号"},{status:401});
    const b=await r.json(),id=String(b?.examId||""),sid=String(b?.sessionId||""),action=String(b?.action||"");
    const bundle=loadExamBundle(id),sections=bundle.profile.timingSections||[];
    if(!sections.length)return NextResponse.json({error:"该考试不是分段计时赛制"},{status:400});
    const idx=Number(b?.sectionIndex);
    if(!Number.isInteger(idx)||idx<0||idx>=sections.length)return NextResponse.json({error:"无效的考试部分"},{status:400});
    if(action==="start-section"){
      const session=startExamSection({id:sid,userId:u.id,examId:id,sectionIndex:idx});
      return NextResponse.json({session});
    }
    if(action==="save-section"){
      const sec=sections[idx];
      const questionIds=bundle.questions.filter(q=>q.questionNo>=sec.questionStart&&q.questionNo<=sec.questionEnd).map(q=>q.id);
      const answers=(b?.answers&&typeof b.answers==="object"?b.answers:{}) as Record<string,string>;
      const session=saveExamSectionDraft({id:sid,userId:u.id,examId:id,sectionIndex:idx,answers,questionIds,durationSeconds:sec.durationSeconds});
      return NextResponse.json({session});
    }
    if(action==="lock-section"){
      const sec=sections[idx];
      const questionIds=bundle.questions.filter(q=>q.questionNo>=sec.questionStart&&q.questionNo<=sec.questionEnd).map(q=>q.id);
      const answers=(b?.answers&&typeof b.answers==="object"?b.answers:{}) as Record<string,string>;
      const session=lockExamSection({id:sid,userId:u.id,examId:id,sectionIndex:idx,answers,questionIds,durationSeconds:sec.durationSeconds});
      return NextResponse.json({session,finalSection:idx===sections.length-1});
    }
    return NextResponse.json({error:"未知操作"},{status:400});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"无法更新考试会话"},{status:409});
  }
}
