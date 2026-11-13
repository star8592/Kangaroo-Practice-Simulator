import { NextRequest, NextResponse } from "next/server";
import { sameOriginMutation } from "@/lib/site-owner-bootstrap";
import { isSiteOwner, readSiteOwner } from "@/lib/site-owner";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import { allowAuthAction } from "@/lib/auth-action-limit";
import { issueChallenge, cancelChallenge, newCode } from "@/lib/auth-challenges";
import { authEmailStatus, sendAuthCode } from "@/lib/auth-email";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(req: NextRequest) {
  if (!sameOriginMutation(req)) return NextResponse.json({error:"无效操作来源"},{status:403,headers});
  const parent = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!isSiteOwner(parent)) return NextResponse.json({error:"需要已绑定的站点所有者微信"},{status:403,headers});
  const binding = readSiteOwner();
  if (!binding || binding.emailVerifiedAt) return NextResponse.json({error:"邮箱已经验证或所有者不存在"},{status:409,headers});
  const delivery = authEmailStatus();
  if (!delivery.enabled || (process.env.NODE_ENV==="production" && !delivery.productionReady)) {
    return NextResponse.json({error:"网站邮箱验证码服务尚未启用"},{status:503,headers});
  }
  const limited = allowAuthAction("owner-email:"+parent!.id,4,60*60*1000);
  if (!limited.allowed) return NextResponse.json({error:"验证请求过于频繁"},{status:429,headers});
  const code = newCode();
  try {
    issueChallenge({purpose:"site-owner-email",email:binding.contactEmail,code,
      payload:{ownerParentId:parent!.id}});
    await sendAuthCode({to:binding.contactEmail,code,kind:"verify-email"});
  } catch {
    cancelChallenge("site-owner-email",binding.contactEmail);
    return NextResponse.json({error:"验证码发送失败"},{status:503,headers});
  }
  return NextResponse.json({ok:true,expiresInSeconds:600},{headers});
}
