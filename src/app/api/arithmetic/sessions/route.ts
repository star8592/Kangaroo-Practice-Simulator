import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { ArithmeticSession } from "@/lib/arithmetic-analytics";
import { userFromRequest } from "@/lib/auth";
import { loadArithmeticSessions } from "@/lib/arithmetic-session-store";
import { issueWebArithmeticTicket, verifyWebArithmeticSubmission } from "@/lib/web-arithmetic-awards";

const D=path.join(process.cwd(),"private","arithmetic");
const F=path.join(D,"sessions.jsonl");
const signature=(s:ArithmeticSession)=>JSON.stringify(s.attempts.map(a=>[a.item.id,a.answer]));
function errorResponse(error:unknown,status=400){
  return NextResponse.json({error:error instanceof Error?error.message:"训练请求失败"},{status});
}
export async function GET(request:NextRequest){
  const user=userFromRequest(request);
  if(!user)return NextResponse.json({error:"请先登录"},{status:401});
  const history=loadArithmeticSessions(user.id,500);
  if(request.nextUrl.searchParams.get("action")==="start"){
    try {
      const q=request.nextUrl.searchParams;
      return NextResponse.json(issueWebArithmeticTicket(user.id,Number(q.get("grade")),q.get("mode")||"adaptive",Number(q.get("seed")),history));
    }catch(error){return errorResponse(error);}
  }
  return NextResponse.json({sessions:history});
}
export async function POST(request:NextRequest){
  const user=userFromRequest(request);
  if(!user)return NextResponse.json({error:"请先登录"},{status:401});
  try{
    if(Number(request.headers.get("content-length")||0)>256*1024)return NextResponse.json({error:"训练数据过大"},{status:413});
    const body=await request.json();
    if(body?.action!=="finish" || typeof body.token!=="string" || body.token.length>100_000)return NextResponse.json({error:"需要服务端签发的训练凭证"},{status:400});
    const session=verifyWebArithmeticSubmission(user.id,body.token,body.session as ArithmeticSession);
    fs.mkdirSync(D,{recursive:true});
    const lockRoot=path.join(D,".web-finish-locks");
    fs.mkdirSync(lockRoot,{recursive:true});
    const lockPath=path.join(lockRoot,crypto.createHash("sha256").update(session.id).digest("hex"));
    let locked=false;
    try{
      try {fs.mkdirSync(lockPath);locked=true;}
      catch(err){
        if((err as NodeJS.ErrnoException).code!=="EEXIST")throw err;
        const existing=loadArithmeticSessions(user.id,Number.MAX_SAFE_INTEGER).find(x=>x.id===session.id);
        if(existing){
          if(signature(existing)!==signature(session))return errorResponse(new Error("本轮已提交，无法替换原答案"),409);
          return NextResponse.json({ok:true,session:existing,replayed:true});
        }
        if(Date.now()-fs.statSync(lockPath).mtimeMs<10*60*1000)return errorResponse(new Error("成绩正在保存，请重试"),409);
        fs.rmdirSync(lockPath);fs.mkdirSync(lockPath);locked=true;
      }
      const old=loadArithmeticSessions(user.id,Number.MAX_SAFE_INTEGER).find(x=>x.id===session.id);
      if(old){
        if(signature(old)!==signature(session))return errorResponse(new Error("本轮已提交，无法替换原答案"),409);
        return NextResponse.json({ok:true,session:old,replayed:true});
      }
      fs.appendFileSync(F,JSON.stringify(session)+"\n");
      return NextResponse.json({ok:true,session});
    }finally{if(locked)fs.rmdirSync(lockPath);}
  }catch(error){return errorResponse(error);}
}
