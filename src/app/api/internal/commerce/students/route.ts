import { NextRequest, NextResponse } from "next/server";
import { createStudent, loadUsers } from "@/lib/auth";
import { commerceProvisionAuthorized, stableProvisionIdentity } from "@/lib/internal-service-auth";
import { grantExamEntitlement } from "@/lib/exam-entitlement-store";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { EXAM_DIAGNOSTIC_CREDITS, EXAM_DIAGNOSTIC_PRODUCT_ID, isCommercialMockExamReady } from "@/lib/exam-service-policy";

const COMPETITION_LABELS: Record<string, string> = {
  "australian-amc": "澳洲AMC",
  cemc: "CEMC",
  kangaroo: "袋鼠数学",
  "maa-amc": "美国 MAA AMC",
};

function publicStudentByCandidateNo(candidateNo: string) {
  const user = loadUsers().find(row => row.role === "student" && row.candidateNo === candidateNo && row.active);
  if (!user) return null;
  const { pinHash, ...publicUser } = user;
  void pinHash;
  return publicUser;
}

function currentExamCatalogue() {
  // Only verified, time-limited commercial bundles appear in the paid product catalogue.
  // Training-ready historical papers with noncommercial rights must not be sold.
  const profiles = listTrainingExamProfiles().filter(profile =>
    Boolean(profile.competitionId) && isCommercialMockExamReady(profile),
  );
  const counts = new Map<string, number>();
  for (const profile of profiles) {
    const id = profile.competitionId!;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const availableCompetitions = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, examCount]) => ({ id, label: COMPETITION_LABELS[id] || id, examCount }));
  return {
    profiles,
    allowedCompetitionIds: availableCompetitions.map(item => item.id),
    availableCompetitions,
    availableExamCount: profiles.length,
  };
}

function publicEntitlement(
  summary: ReturnType<typeof grantExamEntitlement>["summary"],
  catalogue: ReturnType<typeof currentExamCatalogue>,
) {
  return {
    ...summary,
    allowedCompetitionIds: catalogue.allowedCompetitionIds,
    availableExamCount: catalogue.availableExamCount,
    availableCompetitions: catalogue.availableCompetitions,
  };
}

export async function POST(req: NextRequest) {
  if (!commerceProvisionAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const externalRef = String(body?.externalRef || "").trim();
    const productId = String(body?.productId || "").trim();
    const examCredits = Number(body?.examCredits);
    const name = String(body?.name || "").trim();
    const grade = Number(body?.grade);
    const school = String(body?.school || "").trim() || undefined;
    const pin = String(body?.pin || "");
    const examId = String(body?.examId || "").trim();

    if (!externalRef || externalRef.length > 160) return NextResponse.json({ error: "externalRef 不能为空或过长" }, { status: 400 });
    if (productId !== EXAM_DIAGNOSTIC_PRODUCT_ID || examCredits !== EXAM_DIAGNOSTIC_CREDITS) {
      return NextResponse.json({ error: "该商品必须且只能开通1次仿真模拟考试权益" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      return NextResponse.json({ error: "grade 必须为 1–13" }, { status: 400 });
    }
    if (pin.length < 4 || pin.length > 32) {
      return NextResponse.json({ error: "PIN 长度必须为 4–32 位" }, { status: 400 });
    }

    const catalogue = currentExamCatalogue();
    const selectedExam = catalogue.profiles.find(profile => profile.id === examId);
    if (!selectedExam || !selectedExam.competitionId) {
      return NextResponse.json({ error: "所选年份／场次没有通过商业交付审核，请勿发放考试权益" }, { status: 422 });
    }

    const identity = stableProvisionIdentity(externalRef);
    const existing = publicStudentByCandidateNo(identity.candidateNo);
    let user = existing;
    let created = false;
    if (existing) {
      if (existing.name !== name || existing.grade !== grade || (existing.school || "") !== (school || "")) {
        return NextResponse.json({ error: "externalRef 已绑定到不同学生信息" }, { status: 409 });
      }
    } else {
      user = createStudent({
        username: identity.username,
        candidateNo: identity.candidateNo,
        name,
        grade,
        school,
        pin,
      });
      created = true;
    }
    if (!user) throw new Error("STUDENT_PROVISION_FAILED");

    const granted = grantExamEntitlement({
      purchaseRef: externalRef,
      userId: user.id,
      productId: EXAM_DIAGNOSTIC_PRODUCT_ID,
      examCredits: EXAM_DIAGNOSTIC_CREDITS,
      allowedCompetitionIds: [selectedExam.competitionId],
      allowedExamId: selectedExam.id,
    });
    const entitlement = { ...publicEntitlement(granted.summary, catalogue), selectedExamId: selectedExam.id };
    if (entitlement.total !== EXAM_DIAGNOSTIC_CREDITS) {
      return NextResponse.json({ error: "考试权益数量不一致", entitlement }, { status: 409 });
    }

    return NextResponse.json({
      user,
      created,
      idempotent: granted.idempotent,
      entitlement,
    }, { status: created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建失败";
    const status = /INVALID_|CONFLICT|不能为空|必须为|长度必须/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
