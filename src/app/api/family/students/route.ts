import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authenticate, createStudent, updateStudent } from "@/lib/auth";
import { buildStudentAnalytics } from "@/lib/student-analytics";
import {checkLoginLimit,clearLoginFailures,loginKey,recordLoginFailure} from "@/lib/login-rate-limit";
import { loadExamAttempts } from "@/lib/attempt-store";
import {
  addStudentToFamily,
  familyOwnsStudent,
  linkVerifiedStudentToFamily,
  publicFamilyStudents,
} from "@/lib/family-store";
import { buildStudentAttention } from "@/lib/academic-events/student-attention";
import {
  parentFromSessionToken,
  PARENT_SESSION_COOKIE,
} from "@/lib/parent-auth";

function parent(req: NextRequest) {
  return parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const p = parent(req);
  if (!p) return NextResponse.json({ error: "未登录家长账号" }, { status: 401 });

  const students = publicFamilyStudents(p.id).map((student) => {
    const analytics = buildStudentAnalytics(student);
    const latestExamAt = analytics.trend.at(-1)?.submittedAt ?? null;
    const recentReports = loadExamAttempts(student.id, 50)
      .filter((attempt) => attempt.profile.paperType !== "practice" && !attempt.examId.includes("-practice-"))
      .slice(-5)
      .reverse()
      .map((attempt) => ({
        attemptId: attempt.id,
        examId: attempt.examId,
        examName: attempt.profile.name,
        submittedAt: attempt.submittedAt,
        scorePct: attempt.grade.maxScore ? attempt.grade.score / attempt.grade.maxScore : 0,
        accuracy: attempt.questions.length
          ? attempt.questions.filter((question) => question.correct === true).length / attempt.questions.length
          : 0,
      }));
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    const attention = buildStudentAttention(student, today);
    return {
      ...student,
      attention,
      summary: {
        examAttempts: analytics.overview.examAttempts,
        totalQuestions: analytics.overview.totalQuestions,
        accuracy: analytics.overview.totalQuestions ? analytics.overview.accuracy : null,
        arithmeticSessions: analytics.arithmetic.sessions,
        latestExamAt,
      },
      recentReports,
    };
  });

  return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
  const p = parent(req);
  if (!p) return NextResponse.json({ error: "未登录家长账号" }, { status: 401 });

  try {
    const body = await req.json();
    const grade = Number(body?.grade);
    const name = String(body?.name || "").trim();
    // A family-managed learner needs no manually configured student PIN.
    // Generate a strong fallback secret; independent sign-in can be enabled
    // later in advanced settings without making onboarding a registration form.
    const providedPin = String(body?.pin || "");
    const pin = providedPin || crypto.randomInt(100_000_000, 1_000_000_000).toString();

    if (!name || name.length > 50) {
      return NextResponse.json({ error: "请填写 1–50 个字符的孩子姓名或昵称" }, { status: 400 });
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      return NextResponse.json({ error: "年级必须为 1–13" }, { status: 400 });
    }
    if (providedPin && !/^\d{4,12}$/.test(providedPin)) {
      return NextResponse.json({ error: "独立登录 PIN 必须为 4–12 位数字" }, { status: 400 });
    }

    const username = String(body?.username || "").trim()
      || ("kid" + crypto.randomBytes(3).toString("hex"));
    const candidateNo = "F" + crypto.randomBytes(5).toString("hex").toUpperCase();

    const user = createStudent({
      username,
      candidateNo,
      name,
      grade,
      school: String(body?.school || "") || undefined,
      pin,
    });
    addStudentToFamily(p.id, user.id);
    return NextResponse.json({ student: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建孩子账号失败" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const p = parent(req);
  if (!p) return NextResponse.json({ error: "未登录家长账号" }, { status: 401 });

  try {
    const body = await req.json();
    const id = String(body?.id || "");
    if (!familyOwnsStudent(p.id, id)) {
      return NextResponse.json({ error: "无权修改该学生" }, { status: 403 });
    }

    const patch: {
      name?: string;
      grade?: number;
      school?: string;
      pin?: string;
      active?: boolean;
    } = {};

    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 50) {
        return NextResponse.json({ error: "姓名或昵称请填写 1–50 个字符" }, { status: 400 });
      }
      patch.name = name;
    }

    if (body?.grade !== undefined) {
      const grade = Number(body.grade);
      if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
        return NextResponse.json({ error: "年级必须为 1–13" }, { status: 400 });
      }
      patch.grade = grade;
    }

    if (body?.school !== undefined) {
      const school = String(body.school).trim();
      if (school.length > 80) {
        return NextResponse.json({ error: "学校名称不能超过 80 个字符" }, { status: 400 });
      }
      patch.school = school;
    }

    if (body?.pin !== undefined && String(body.pin) !== "") {
      const pin = String(body.pin);
      if (!/^\d{4,12}$/.test(pin)) {
        return NextResponse.json({ error: "新 PIN 必须为 4–12 位数字" }, { status: 400 });
      }
      patch.pin = pin;
    }

    if (body?.active !== undefined) patch.active = Boolean(body.active);

    const student = updateStudent(id, patch);
    return NextResponse.json({ student });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 400 },
    );
  }
}

/** Explicit opt-in binding of a previously existing student account.
 * Both parent authentication and the exact student's PIN are required.
 */
export async function PUT(req:NextRequest){
 const p=parent(req);
 if(!p)return NextResponse.json({error:"请先登录家庭微信账号"},{status:401});
 const input=await req.json().catch(()=>null);
 const username=typeof input?.username==="string"?input.username.trim():"";
 const pin=typeof input?.pin==="string"?input.pin:"";
 if(username.length<2||username.length>120||!/^[0-9]{4,12}$/.test(pin)){
  return NextResponse.json({error:"请填写已有学生账号与正确的 PIN"},{status:400});
 }
 const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"local").split(",")[0].trim();
 const key=loginKey(username,ip);
 const limit=checkLoginLimit(key);
 if(!limit.allowed)return NextResponse.json({error:"验证次数过多，请稍后重试"},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
 const learner=authenticate(username,pin);
 if(!learner||learner.role!=="student"){
  const failed=recordLoginFailure(key);
  if(failed.blockedUntil>Date.now())return NextResponse.json({error:"验证次数过多，请稍后重试"},{status:429,headers:{"Retry-After":String(Math.ceil((failed.blockedUntil-Date.now())/1000))}});
  return NextResponse.json({error:"学生账号或 PIN 不正确"},{status:401});
 }
 clearLoginFailures(key);
 try{
  const link=linkVerifiedStudentToFamily(p.id,learner.id);
  return NextResponse.json({ok:true,student:{id:learner.id,name:learner.name,grade:learner.grade},alreadyLinked:link.alreadyLinked});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"无法绑定学生账号"},{status:409});
 }
}
