import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
export async function POST(req:NextRequest){const r=NextResponse.json({ok:true});r.cookies.set(PARENT_SESSION_COOKIE,"",{httpOnly:true,sameSite:"strict",secure:req.nextUrl.protocol==="https:",path:"/",maxAge:0});return r}
