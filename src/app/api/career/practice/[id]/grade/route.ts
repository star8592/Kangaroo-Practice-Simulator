import {NextRequest,NextResponse} from "next/server";
import {getCareerPractice} from "@/lib/career-practice";
import {gradeCareerPractice} from "@/lib/career-practice-grade";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const PRIVATE={"Cache-Control":"private, no-store"};

type RouteContext={params:Promise<{id:string}>};

/** Free, bounded and deterministic; never executes user code or touches billing. */
export async function POST(req:NextRequest,{params}:RouteContext){
  const {id}=await params;
  if(!getCareerPractice(id))
    return NextResponse.json({error:"未找到已开放的职业实操案例",code:"CASE_NOT_FOUND"},
      {status:404,headers:PRIVATE});
  const type=req.headers.get("content-type")||"";
  if(!type.toLowerCase().startsWith("application/json"))
    return NextResponse.json({error:"请求格式必须为 JSON",code:"INVALID_CONTENT_TYPE"},
      {status:415,headers:PRIVATE});
  const length=Number(req.headers.get("content-length")||0);
  if(length>8192)
    return NextResponse.json({error:"答案内容超过限制",code:"ANSWERS_TOO_LARGE"},
      {status:413,headers:PRIVATE});
  try{
    const text=await req.text();
    if(Buffer.byteLength(text,"utf8")>8192)
      return NextResponse.json({error:"答案内容超过限制",code:"ANSWERS_TOO_LARGE"},
        {status:413,headers:PRIVATE});
    const value=JSON.parse(text) as {answers?:unknown};
    if(!value||typeof value!=="object"||Array.isArray(value))
      throw Error("INVALID_BODY");
    const grade=gradeCareerPractice(id,value.answers);
    if(!grade) return NextResponse.json({error:"案例不存在"},{status:404,headers:PRIVATE});
    return NextResponse.json({grade},{status:200,headers:PRIVATE});
  }catch(e){
    if(e instanceof Error&&/^(ANSWERS_|UNKNOWN_QUESTION|MULTIPLE_CHOICE_|ANSWER_|INVALID_BODY)/.test(e.message)||
      e instanceof SyntaxError){
      return NextResponse.json({error:"答案格式无效，请检查后重试",code:"INVALID_ANSWERS"},
        {status:400,headers:PRIVATE});
    }
    return NextResponse.json({error:"评分服务暂时不可用",code:"GRADE_UNAVAILABLE"},
      {status:503,headers:PRIVATE});
  }
}
