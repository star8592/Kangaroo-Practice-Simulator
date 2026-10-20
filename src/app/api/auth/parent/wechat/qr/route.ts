import { NextResponse } from "next/server";
import { issueWechatQrLogin } from "@/lib/wechat-qr-login";
import { wechatAuthorizeUrl, wechatConfigured } from "@/lib/wechat-parent-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!wechatConfigured("website")) {
    return NextResponse.json({ error: "微信网站应用扫码登录尚未配置" }, { status: 503 });
  }

  const issued = issueWechatQrLogin();
  // The official website application flow must render WeChat's QR iframe.
  // Encoding a qrconnect URL inside another QR is not the documented embed flow.
  const qrAuthorizeUrl = wechatAuthorizeUrl(issued.state, "website");

  return NextResponse.json(
    { ticket: issued.ticket, qrAuthorizeUrl, expiresAt: issued.expiresAt },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
  );
}
