import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { renderArithmeticPdfFromUrl } from "@/lib/arithmetic-print-pdf";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function internalOrigin(){return process.env.PDF_INTERNAL_ORIGIN?.trim()||`http://127.0.0.1:${process.env.PORT?.trim()||"3000"}`}

export async function GET(req:NextRequest){
  const user=userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if(!user)return NextResponse.json({error:"请先登录"},{status:401});
  try{
    const allowed=new URLSearchParams();
    for(const key of ["grade","mode","manualSkillId","questions","sheets","answers","seed"]){const value=req.nextUrl.searchParams.get(key);if(value!==null)allowed.set(key,value)}
    const sheets=Math.min(20,Math.max(1,Number(req.nextUrl.searchParams.get("sheets"))||5));
    const answers=req.nextUrl.searchParams.get("answers")!=="0";
    const expectedPages=sheets*(answers?2:1);
    const url=new URL(`/arithmetic/print/export?${allowed.toString()}`,internalOrigin()).toString();
    const pdf=await renderArithmeticPdfFromUrl(url,req.headers.get("cookie")||"",expectedPages);
    return new NextResponse(pdf,{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="arithmetic-practice-${expectedPages}p.pdf"`,"cache-control":"private, no-store","x-arithmetic-pages":String(expectedPages)}});
  }catch(error){
    return NextResponse.json({error:"PDF 生成失败",detail:error instanceof Error?error.message:String(error)},{status:500});
  }
}
