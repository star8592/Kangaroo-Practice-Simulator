import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, updateStudent, userFromSessionToken } from "@/lib/auth";

function currentUser(req: NextRequest) {
  return userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const user = currentUser(req);
  return user
    ? NextResponse.json({ user })
    : NextResponse.json({ error: "not logged in" }, { status: 401 });
}

export async function PATCH(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "student") {
    return NextResponse.json({ error: "仅学生账号可修改学生资料" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const grade = Number(body?.grade);
    const school = String(body?.school ?? "").trim();
    const avatarKey = body?.avatarKey === undefined ? user.avatarKey : String(body.avatarKey);

    if (!name || name.length > 50) {
      return NextResponse.json({ error: "姓名或昵称请填写 1–50 个字符" }, { status: 400 });
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      return NextResponse.json({ error: "年级必须为 1–13" }, { status: 400 });
    }
    if (school.length > 80) {
      return NextResponse.json({ error: "学校名称不能超过 80 个字符" }, { status: 400 });
    }

    const updated = updateStudent(user.id, { name, grade, school, avatarKey });
    return NextResponse.json({ user: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 },
    );
  }
}
