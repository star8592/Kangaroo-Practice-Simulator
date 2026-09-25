import {NextResponse} from "next/server";
import {authEmailStatus} from "@/lib/auth-email";
export async function GET(){const s=authEmailStatus();return NextResponse.json({registrationEnabled:s.enabled&&(process.env.NODE_ENV!=="production"||s.productionReady),emailProviderConfigured:s.productionReady})}
