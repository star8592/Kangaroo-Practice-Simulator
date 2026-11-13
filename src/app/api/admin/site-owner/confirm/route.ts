import { NextRequest, NextResponse } from "next/server";
import { bootstrapIdentity, sameOriginMutation } from "@/lib/site-owner-bootstrap";
import { bindSiteOwner, hasSiteOwnerBinding } from "@/lib/site-owner";
import { verifyChallenge } from "@/lib/auth-challenges";
import { validEmail } from "@/lib/parent-auth";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(req: NextRequest) {
  if (!sameOriginMutation(req)) return NextResponse.json({error:"无效操作来源"}, {status:403,headers});
  const actor = bootstrapIdentity(req);
  if (!actor) return NextResponse.json({error:"须同时登录原主站管理员与本人微信账号"}, {status:403,headers});
  if (hasSiteOwnerBinding()) return NextResponse.json({error:"站点所有者已经绑定"}, {status:409,headers});
  const data = await req.json().catch(() => null);
  const email = String(data?.email || "").trim().toLowerCase(), code = String(data?.code || "").trim();
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({error:"邮箱或验证码格式不正确"}, {status:400,headers});
  }
  try {
    const claim = verifyChallenge("site-owner",email,code);
    if (claim.payload?.ownerParentId !== actor.parent.id ||
        claim.payload?.ownerAdminId !== actor.admin.id) {
      return NextResponse.json({error:"验证账号已变化，请重新申请验证码"}, {status:403,headers});
    }
    bindSiteOwner({parent:actor.parent,email,adminId:actor.admin.id,verifiedAt:Date.now()});
    return NextResponse.json({ok:true,siteAdmin:true},{headers});
  } catch {
    return NextResponse.json({error:"邮箱验证失败或站点已有所有者"},{status:400,headers});
  }
}
