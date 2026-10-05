import { NextRequest,NextResponse } from "next/server";import { userFromRequest } from "@/lib/auth";import { buildStudentAnalytics } from "@/lib/student-analytics";
export async function GET(req:NextRequest){const user=userFromRequest(req);return user?NextResponse.json(buildStudentAnalytics(user)):NextResponse.json({error:"请先登录"},{status:401})}
