import {NextResponse} from "next/server";
import {authEmailStatus} from "@/lib/auth-email";
import {wechatConfigured} from "@/lib/wechat-parent-auth";
export async function GET(){const s=authEmailStatus();return NextResponse.json({registrationEnabled:s.enabled&&(process.env.NODE_ENV!=="production"||s.productionReady),emailProviderConfigured:s.productionReady,wechatLoginConfigured:wechatConfigured()})}
