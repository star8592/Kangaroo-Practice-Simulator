import { NextRequest, NextResponse } from "next/server";
import { createStudent, loadUsers } from "@/lib/auth";
import { commerceProvisionAuthorized, stableProvisionIdentity } from "@/lib/internal-service-auth";

function publicStudentByCandidateNo(candidateNo: string) {
  const user = loadUsers().find((row) => row.role === "student" && row.candidateNo === candidateNo && row.active);
  if (!user) return null;
  const { pinHash, ...publicUser } = user;
  void pinHash;
  return publicUser;
}

export async function POST(req: NextRequest) {
  if (!commerceProvisionAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const externalRef = String(body?.externalRef || "").trim();
    const name = String(body?.name || "").trim();
    const grade = Number(body?.grade);
    const school = String(body?.school || "").trim() || undefined;
    const pin = String(body?.pin || "");
    if (!externalRef) return NextResponse.json({ error: "externalRef 不能为空" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      return NextResponse.json({ error: "grade 必须为 1–13" }, { status: 400 });
    }
    if (pin.length < 4 || pin.length > 32) {
      return NextResponse.json({ error: "PIN 长度必须为 4–32 位" }, { status: 400 });
    }

    const identity = stableProvisionIdentity(externalRef);
    const existing = publicStudentByCandidateNo(identity.candidateNo);
    if (existing) {
      if (existing.name !== name || existing.grade !== grade) {
        return NextResponse.json({ error: "externalRef 已绑定到不同学生信息" }, { status: 409 });
      }
      return NextResponse.json({ user: existing, created: false, idempotent: true });
    }

    const user = createStudent({
      username: identity.username,
      candidateNo: identity.candidateNo,
      name,
      grade,
      school,
      pin,
    });
    return NextResponse.json({ user, created: true, idempotent: false }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建失败" }, { status: 400 });
  }
}
