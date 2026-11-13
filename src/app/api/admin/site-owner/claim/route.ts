import { NextRequest, NextResponse } from "next/server";
import { bootstrapIdentity, sameOriginMutation } from "@/lib/site-owner-bootstrap";
import { bindSiteOwner, hasSiteOwnerBinding } from "@/lib/site-owner";
import { validEmail } from "@/lib/parent-auth";
import { authEmailStatus } from "@/lib/auth-email";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(req: NextRequest) {
  if (!sameOriginMutation(req)) return NextResponse.json({error:"无效操作来源"},{status:403,headers});
  const actor = bootstrapIdentity(req);
  if (!actor) return NextResponse.json({error:"须同时登录原主站管理员与本人微信账号"},{status:403,headers});
  if (hasSiteOwnerBinding()) return NextResponse.json({error:"站点所有者已经绑定"},{status:409,headers});
  // Strong existing admin authentication + same-person WeChat is enough to
  // claim the owner role while mail is unavailable; email NEVER authenticates.
  if (authEmailStatus().productionReady) {
    return NextResponse.json({error:"邮件验证已可用，请完成邮箱验证码验证"},{status:409,headers});
  }
  const email = String((await req.json().catch(() => null))?.email || "").trim().toLowerCase();
  if (!validEmail(email)) return NextResponse.json({error:"请输入有效联系邮箱"},{status:400,headers});
  try {
    bindSiteOwner({parent:actor.parent,email,adminId:actor.admin.id,verifiedAt:null});
    return NextResponse.json({ok:true,siteAdmin:true,emailVerified:false},{headers});
  } catch {
    return NextResponse.json({error:"所有者绑定失败或已存在"},{status:409,headers});
  }
}
