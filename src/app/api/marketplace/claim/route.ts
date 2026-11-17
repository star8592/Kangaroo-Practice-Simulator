import {NextRequest,NextResponse} from "next/server";
import {MARKETPLACE_COOKIE,marketplaceMode,redeemMarketplaceTicket} from "@/lib/marketplace-entitlement";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:NextRequest) {
  if(!marketplaceMode())return NextResponse.json({error:"NOT_FOUND"},{status:404});
  const allowed=process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN;
  if(!allowed||req.headers.get("origin")!==allowed||
     req.headers.get("sec-fetch-site")==="cross-site")
    return NextResponse.json({error:"INVALID_ORIGIN"},{status:403});
  let ticket="";
  try{
    const length=Number(req.headers.get("content-length")||0);
    if(length>2400)return NextResponse.json({error:"REQUEST_TOO_LARGE"},{status:413});
    const form=await req.formData();
    ticket=String(form.get("ticket")||"");
    const grant=redeemMarketplaceTicket(ticket,req.cookies.get(MARKETPLACE_COOKIE)?.value);
    const location=new URL("/exam/"+encodeURIComponent(grant.examId),allowed);
    const res=NextResponse.redirect(location,{status:303});
    res.cookies.set(MARKETPLACE_COOKIE,grant.cookie,{
      httpOnly:true,secure:location.protocol==="https:",sameSite:"lax",path:"/",maxAge:30*86400
    });
    res.headers.set("cache-control","private, no-store");
    res.headers.set("referrer-policy","no-referrer");
    return res;
  }catch(error) {
    const reason=error instanceof Error?error.message:"INVALID_CLAIM";
    const status=reason==="ALREADY_CLAIMED"?409:400;
    return NextResponse.json({code:reason,error:status===409?
      "此权益已被领取，请在原来的浏览器打开，或联系卖家申请身份恢复。":
      "考试兑换失败，请从闲鱼订单重新打开专属链接。"},
      {status,headers:{"cache-control":"no-store"}});
  }
}
