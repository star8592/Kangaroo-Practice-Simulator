import { NextRequest, NextResponse } from "next/server";
import { sameOriginMutation } from "@/lib/site-owner-bootstrap";
import { isSiteOwner, readSiteOwner, verifySiteOwnerEmail } from "@/lib/site-owner";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import { verifyChallenge } from "@/lib/auth-challenges";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(req: NextRequest) {
  if (!sameOriginMutation(req)) return NextResponse.json({error:"无效操作来源"},{status:403,headers});
  const parent = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!isSiteOwner(parent)) return NextResponse.json({error:"需要已绑定的站点所有者微信"},{status:403,headers});
  const binding = readSiteOwner();
  if (!binding || binding.emailVerifiedAt) return NextResponse.json({error:"邮箱已经验证或所有者不存在"},{status:409,headers});
  const code = String((await req.json().catch(()=>null))?.code || "").trim();
  if (!/^\d{6}$/.test(code)) return NextResponse.json({error:"请输入6位验证码"},{status:400,headers});
  try {
    const claim = verifyChallenge("site-owner-email",binding.contactEmail,code);
    if (claim.payload?.ownerParentId !== parent!.id || !verifySiteOwnerEmail(parent!,binding.contactEmail)) {
      return NextResponse.json({error:"验证身份与绑定记录不一致"},{status:403,headers});
    }
    return NextResponse.json({ok:true,emailVerified:true},{headers});
  } catch {
    return NextResponse.json({error:"邮箱验证码不正确或已失效"},{status:400,headers});
  }
}
