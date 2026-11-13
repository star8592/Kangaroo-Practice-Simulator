import { NextRequest, NextResponse } from "next/server";
import { bootstrapIdentity, sameOriginMutation } from "@/lib/site-owner-bootstrap";
import { hasSiteOwnerBinding } from "@/lib/site-owner";
import { validEmail } from "@/lib/parent-auth";
import { allowAuthAction } from "@/lib/auth-action-limit";
import { issueChallenge, cancelChallenge, newCode } from "@/lib/auth-challenges";
import { authEmailStatus, sendAuthCode } from "@/lib/auth-email";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  if (!sameOriginMutation(req)) return NextResponse.json({error:"无效操作来源"}, {status:403,headers});
  const actor = bootstrapIdentity(req);
  if (!actor) return NextResponse.json({error:"须同时登录原主站管理员与本人微信账号"}, {status:403,headers});
  if (hasSiteOwnerBinding()) return NextResponse.json({error:"站点所有者已经绑定"}, {status:409,headers});
  const email = String((await req.json().catch(() => null))?.email || "").trim().toLowerCase();
  if (!validEmail(email)) return NextResponse.json({error:"请输入有效邮箱"}, {status:400,headers});
  const status = authEmailStatus();
  if (!status.enabled || (process.env.NODE_ENV === "production" && !status.productionReady)) {
    return NextResponse.json({error:"邮件验证码服务尚未就绪"}, {status:503,headers});
  }
  const limited = allowAuthAction("site-owner:" + actor.parent.id + ":" + email, 4, 60*60*1000);
  if (!limited.allowed) return NextResponse.json({error:"请求过于频繁"}, {status:429,headers});
  const code = newCode();
  try {
    issueChallenge({purpose:"site-owner",email,code,payload:{
      ownerParentId:actor.parent.id, ownerAdminId:actor.admin.id,
    }});
    await sendAuthCode({to:email,code,kind:"verify-email"});
  } catch {
    cancelChallenge("site-owner",email);
    return NextResponse.json({error:"验证码发送失败"}, {status:503,headers});
  }
  return NextResponse.json({ok:true,expiresInSeconds:600}, {headers});
}
