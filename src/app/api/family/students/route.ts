import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createStudent, updateStudent } from "@/lib/auth";
import { buildStudentAnalytics } from "@/lib/student-analytics";
import {
  addStudentToFamily,
  familyOwnsStudent,
  publicFamilyStudents,
} from "@/lib/family-store";
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
    return {
      ...student,
      summary: {
        examAttempts: analytics.overview.examAttempts,
        totalQuestions: analytics.overview.totalQuestions,
        accuracy: analytics.overview.totalQuestions ? analytics.overview.accuracy : null,
        arithmeticSessions: analytics.arithmetic.sessions,
        latestExamAt,
      },
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
    const pin = String(body?.pin || "");

    if (!name || name.length > 50) {
      return NextResponse.json({ error: "请填写 1–50 个字符的孩子姓名或昵称" }, { status: 400 });
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      return NextResponse.json({ error: "年级必须为 1–13" }, { status: 400 });
    }
    if (!/^\d{4,12}$/.test(pin)) {
      return NextResponse.json({ error: "学生 PIN 必须为 4–12 位数字" }, { status: 400 });
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
