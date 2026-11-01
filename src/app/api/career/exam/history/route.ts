import {NextRequest,NextResponse} from "next/server";
import {userFromRequest} from "@/lib/auth";
import {CAREER_FORMAL_PAPERS,isCareerFormalPaper} from "@/lib/career-formal-bank";
import {
  isValidCareerAttemptId,isVerifiedCareerStudyIdentity,
  listCareerAttemptSummaries,readCareerAttempt,
} from "@/lib/career-attempt-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const PRIVATE={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization"};

/** Read only the history owned by the server-authenticated WeChat learning ID.
 * Anonymous users can still grade freely; no historical record is created.
 * Never accept userId, parentId, buyerId or a score from query parameters.
 */
export async function GET(req:NextRequest){
  const user=userFromRequest(req);
  if(!isVerifiedCareerStudyIdentity(user)){
    return NextResponse.json({
      error:"请先使用微信账号登录后查看跨设备成绩",
      code:"WECHAT_LOGIN_REQUIRED",
    },{status:401,headers:PRIVATE});
  }
  const query=req.nextUrl.searchParams;
  const attemptId=query.get("attemptId");
  try{
    if(attemptId!==null){
      if(!isValidCareerAttemptId(attemptId))
        return NextResponse.json({error:"成绩编号无效",code:"INVALID_ATTEMPT_ID"},
          {status:400,headers:PRIVATE});
      const record=readCareerAttempt(user.id,attemptId);
      if(!record||!isCareerFormalPaper(record.summary.caseId))
        return NextResponse.json({error:"成绩不存在",code:"ATTEMPT_NOT_FOUND"},
          {status:404,headers:PRIVATE});
      return NextResponse.json({summary:record.summary,grade:record.grade},
        {status:200,headers:PRIVATE});
    }
    const caseId=query.get("caseId");
    if(caseId!==null&&!isCareerFormalPaper(caseId))
      return NextResponse.json({error:"标准模拟笔试不存在",code:"CASE_NOT_FOUND"},
        {status:404,headers:PRIVATE});
    const limitRaw=query.get("limit")||"20";
    if(!/^\d{1,2}$/.test(limitRaw)||Number(limitRaw)<1||Number(limitRaw)>50)
      return NextResponse.json({error:"查询条数应为1至50",code:"INVALID_LIMIT"},
        {status:400,headers:PRIVATE});
    // Old six-item exercises are permanently retired: do not include their
    // saved reports in the active standard-exam history. Stored snapshots remain
    // untouched so account data is never silently destroyed during deployment.
    const attempts=caseId?
      listCareerAttemptSummaries(user.id,{caseId,limit:Number(limitRaw)}):
      CAREER_FORMAL_PAPERS.flatMap(p=>
        listCareerAttemptSummaries(user.id,{caseId:p.id,limit:50}))
        .sort((a,b)=>b.submittedAt-a.submittedAt).slice(0,Number(limitRaw));
    return NextResponse.json({attempts,persistence:"account" as const},
      {status:200,headers:PRIVATE});
  }catch{
    return NextResponse.json({error:"读取成绩失败，请稍后重试",code:"HISTORY_UNAVAILABLE"},
      {status:503,headers:PRIVATE});
  }
}
