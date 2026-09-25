import {NextRequest,NextResponse} from "next/server";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
export async function GET(req:NextRequest){const u=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);return u?NextResponse.json({user:u}):NextResponse.json({error:"not logged in"},{status:401})}
