import {NextRequest,NextResponse} from "next/server";
import {userFromRequest} from "@/lib/auth";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {familyOwnsStudent} from "@/lib/family-store";
import {ACADEMIC_SESSIONS} from "@/lib/academic-events/catalog";
import {getStudentEnrollments,setStudentEnrollment} from "@/lib/academic-events/enrollment-store";
import type {EnrollmentState} from "@/lib/academic-events/types";
const allowed=new Set<EnrollmentState>(["eligible","interested","planned","registered","confirmed","preparing","ready","taken","result-pending","result-known","awarded","closed"]);
function actor(req:NextRequest,studentId:string){const student=userFromRequest(req);if(student?.role==="student"&&student.id===studentId)return "student" as const;const parent=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);if(parent&&familyOwnsStudent(parent.id,studentId))return "parent" as const;return null}
export async function GET(req:NextRequest){const studentId=String(req.nextUrl.searchParams.get("studentId")||"");if(!actor(req,studentId))return NextResponse.json({error:"无权查看该学生"},{status:403});return NextResponse.json({enrollments:getStudentEnrollments(studentId)})}
export async function PATCH(req:NextRequest){try{const b=await req.json();const studentId=String(b?.studentId||""),sessionId=String(b?.sessionId||""),state=String(b?.state||"") as EnrollmentState;const source=actor(req,studentId);if(!source)return NextResponse.json({error:"无权修改该学生"},{status:403});if(!ACADEMIC_SESSIONS.some(x=>x.id===sessionId)||!allowed.has(state))return NextResponse.json({error:"invalid enrollment"},{status:400});return NextResponse.json({enrollment:setStudentEnrollment(studentId,sessionId,state,source)})}catch{return NextResponse.json({error:"invalid request"},{status:400})}}
