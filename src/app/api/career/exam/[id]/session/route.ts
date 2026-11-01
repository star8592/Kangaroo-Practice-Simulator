import {NextRequest,NextResponse} from "next/server";
import {getCareerFormalPaper} from "@/lib/career-formal-bank";
import {createCareerExamSession} from "@/lib/career-exam-session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const HEADERS={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization"};
export async function POST(_request:NextRequest,{params}:{
  params:Promise<{id:string}>;
}){
  const {id}=await params;
  const paper=getCareerFormalPaper(id);
  if(!paper)return NextResponse.json({code:"EXAM_NOT_FOUND",error:"没有这张正式模拟卷"},
    {status:404,headers:HEADERS});
  const session=createCareerExamSession(id);
  return NextResponse.json(session,{headers:HEADERS});
}
