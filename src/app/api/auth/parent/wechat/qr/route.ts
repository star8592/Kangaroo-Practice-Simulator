import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { issueWechatQrLogin } from "@/lib/wechat-qr-login";
import { wechatAuthorizeUrl, wechatConfigured } from "@/lib/wechat-parent-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!wechatConfigured("website")) {
    return NextResponse.json({ error: "微信网站应用扫码登录尚未配置" }, { status: 503 });
  }

  const issued = issueWechatQrLogin();
  const authorizeUrl = wechatAuthorizeUrl(issued.state, "website");
  const qrDataUrl = await QRCode.toDataURL(authorizeUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });

  return NextResponse.json(
    { ticket: issued.ticket, qrDataUrl, expiresAt: issued.expiresAt },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
  );
}
