import { NextRequest,NextResponse } from "next/server";import { SESSION_COOKIE,userFromSessionToken } from "@/lib/auth";
export async function GET(req:NextRequest){const user=userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);return user?NextResponse.json({students:[{id:user.id,name:user.name,createdAt:user.createdAt}]}):NextResponse.json({error:"请先登录"},{status:401})}
export async function POST(){return NextResponse.json({error:"学生档案由统一账号系统管理"},{status:405})}
