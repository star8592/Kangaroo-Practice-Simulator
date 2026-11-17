import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken,setWechatDisplayName} from "@/lib/parent-auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin"),host=req.headers.get("host");
 const local=req.nextUrl.hostname==="localhost"&&process.env.NODE_ENV==="development";
 if(!origin||!(local?origin==="http://localhost:3000":["https://socthink.cn","https://www.socthink.cn"].includes(origin))||
   !host||!["socthink.cn","www.socthink.cn","localhost:3000"].includes(host))
   return NextResponse.json({error:"操作来源无效"},{status:403,headers});
 const actor=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!actor?.active||!(actor.wechatId||actor.wechatOpenId))
   return NextResponse.json({error:"请先微信登录"},{status:401,headers});
 try{
  if(!req.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({error:"请求格式无效"},{status:415,headers});
  const body=await req.text();
  if(Buffer.byteLength(body,"utf8")>1024)
    return NextResponse.json({error:"请求过长"},{status:413,headers});
  const value=JSON.parse(body);
  const updated=setWechatDisplayName(actor.id,value?.name);
  return NextResponse.json({ok:true,name:updated.name},{headers});
 }catch{
  return NextResponse.json({error:"请输入2至30个字的有效姓名或昵称，不可使用通用占位名称"},{status:400,headers});
 }
}
