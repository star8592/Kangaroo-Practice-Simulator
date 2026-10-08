import { readSignedJsonToken, signJsonToken } from "./auth-crypto";
import { buildTrainingPlan, finalizeAttempt, type ArithmeticSession } from "./arithmetic-analytics";
import { generateArithmeticSet, generateDiagnosticSet, type ArithmeticItem } from "./arithmetic-generator";
import type { ArithmeticGrade, CleverNode } from "./arithmetic";
import type { PublicStudent } from "./auth";
import { readOrCreateSecret, userDataPath } from "./user-data-store";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

type Mode = "diagnostic" | "adaptive" | "speed";
type Ticket = {
  uid: string;
  grade: ArithmeticGrade;
  mode: Mode;
  seed: number;
  count: number;
  focusSkills: string[];
  focusNodes: CleverNode[];
  startedAt: number;
  exp: number;
};
export type MiniArithmeticResponse = {
  questionId: string;
  answer: string;
  responseMs: number;
  firstInputMs: number;
  edits?: number;
  backspaces?: number;
};

const SECRET = userDataPath("miniapp-arithmetic-secret.txt");
const SESSION_FILE = path.join(process.cwd(), "private", "arithmetic", "sessions.jsonl");
const secret = () => readOrCreateSecret(SECRET);

function previousSessions(uid: string) {
  if (!fs.existsSync(SESSION_FILE)) return [] as ArithmeticSession[];
  return fs.readFileSync(SESSION_FILE, "utf8").split("\n").filter(Boolean).flatMap(line => {
    try {
      const row = JSON.parse(line) as ArithmeticSession;
      return row.studentId === uid ? [row] : [];
    } catch {
      return [];
    }
  });
}

function generate(ticket: Pick<Ticket, "grade" | "mode" | "seed" | "count" | "focusSkills" | "focusNodes">) {
  if (ticket.mode === "diagnostic") return generateDiagnosticSet(ticket.grade, ticket.count, ticket.seed);
  return generateArithmeticSet(ticket.grade, ticket.count, ticket.seed, ticket.focusSkills, false, ticket.focusNodes);
}

function publicItem(item: ArithmeticItem) {
  return {
    id: item.id,
    grade: item.grade,
    skillId: item.skillId,
    prompt: item.prompt,
    answerKind: item.answerKind || "number",
    requireSimplified: Boolean(item.requireSimplified),
    expectedMs: item.expectedMs,
    difficulty: item.difficulty,
  };
}

export function startMiniappArithmetic(user: PublicStudent, grade: ArithmeticGrade, mode: Mode) {
  const old = previousSessions(user.id);
  const plan = buildTrainingPlan(grade, old);
  const focusSkills = mode === "adaptive" ? plan.focusSkills : [];
  const focusNodes = mode === "adaptive" ? plan.focusNodes : [];
  const count = mode === "diagnostic" ? 20 : mode === "speed" ? 60 : focusSkills.length === 0 ? 12 : focusSkills.length === 1 ? 16 : 20;
  const startedAt = Date.now();
  const ticket: Ticket = {
    uid: user.id,
    grade,
    mode,
    seed: crypto.randomInt(1, 2147483647), // unique across simultaneous devices and same-ms starts
    count,
    focusSkills,
    focusNodes,
    startedAt,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
  };
  const token = signJsonToken(ticket, secret());
  return {
    token,
    grade,
    mode,
    questions: generate(ticket).map(publicItem),
    plan: {
      focusSkills: plan.focusSkills,
      focusNodes: plan.focusNodes,
      summary: plan.summaryZh,
    },
  };
}

function validTicket(user: PublicStudent, token: string) {
  const ticket = readSignedJsonToken<Ticket>(token, secret());
  if (!ticket || ticket.uid !== user.id || ticket.exp < Math.floor(Date.now() / 1000)) throw new Error("训练会话已失效，请重新开始");
  return ticket;
}

export function checkMiniappArithmetic(user: PublicStudent, token: string, index: number, raw: string, telemetry?: Partial<MiniArithmeticResponse>) {
  const ticket = validTicket(user, token);
  const item = generate(ticket)[index];
  if (!item) throw new Error("题号无效");
  const responseMs = Math.max(1, Number(telemetry?.responseMs) || item.expectedMs);
  const firstInputMs = Math.max(0, Math.min(responseMs, Number(telemetry?.firstInputMs) || responseMs));
  const attempt = finalizeAttempt(item, raw, {
    presentedAt: 0,
    firstInputAt: firstInputMs,
    submittedAt: responseMs,
    edits: Math.max(0, Number(telemetry?.edits) || 0),
    backspaces: Math.max(0, Number(telemetry?.backspaces) || 0),
  });
  return {
    correct: attempt.correct,
    correctAnswer: String(item.answer),
    reason: attempt.reason,
  };
}

function finishedResult(
  grade: ArithmeticGrade,
  stored: ArithmeticSession,
  history: ArithmeticSession[],
  submitted: ArithmeticSession["attempts"],
) {
  // A lost HTTP response is retryable; different answers to the same ticket
  // must never overwrite or duplicate an already submitted assessment.
  const signature = (rows: ArithmeticSession["attempts"]) => JSON.stringify(
    rows.map(x => [x.item.id, x.answer, x.responseMs, x.firstInputMs, x.edits, x.backspaces]),
  );
  if (signature(stored.attempts) !== signature(submitted)) {
    throw new Error("本轮成绩已经提交，不能修改原答案");
  }
  const snapshot = history.filter(x => x.finishedAt <= stored.finishedAt);
  const plan = buildTrainingPlan(grade, snapshot);
  const correct = stored.attempts.filter(x => x.correct).length;
  const total = stored.attempts.length;
  return {
    ok: true, correct, total,
    accuracy: total ? correct / total : 0,
    plan: { focusSkills: plan.focusSkills, focusNodes: plan.focusNodes, summary: plan.summaryZh },
  };
}

export function finishMiniappArithmetic(user: PublicStudent, token: string, responses: MiniArithmeticResponse[]) {
  const ticket = validTicket(user, token);
  const items = generate(ticket);
  const byId = new Map(responses.map(row => [row.questionId, row]));
  const attempts = items.flatMap(item => {
    const row = byId.get(item.id);
    if (!row) return [];
    const responseMs = Math.max(1, Number(row.responseMs) || item.expectedMs);
    const firstInputMs = Math.max(0, Math.min(responseMs, Number(row.firstInputMs) || responseMs));
    return [finalizeAttempt(item, row.answer, {
      presentedAt: 0,
      firstInputAt: firstInputMs,
      submittedAt: responseMs,
      edits: Math.max(0, Number(row.edits) || 0),
      backspaces: Math.max(0, Number(row.backspaces) || 0),
    })];
  });
  const finishedAt = Date.now();
  const session: ArithmeticSession = {
    id: `arith-${user.id}-g${ticket.grade}-${ticket.seed}-${ticket.mode}`,
    studentId: user.id,
    grade: ticket.grade,
    mode: ticket.mode,
    startedAt: ticket.startedAt,
    finishedAt,
    attempts,
  };
  // A timeout or double tap can replay finish. Serialize by a per-session
  // atomic directory lock shared by workers using the same data directory.
  const lockRoot = path.join(path.dirname(SESSION_FILE), ".finish-locks");
  fs.mkdirSync(lockRoot, { recursive: true });
  const lockPath = path.join(lockRoot, crypto.createHash("sha256").update(session.id).digest("hex"));
  let locked = false;
  try {
    try {
      fs.mkdirSync(lockPath);
      locked = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const prior = previousSessions(user.id);
      const existing = prior.find(x => x.id === session.id);
      if (existing) return finishedResult(ticket.grade, existing, prior, attempts);
      // A worker killed while saving may leave an orphaned lock. Only recover
      // locks older than 10 minutes; a live concurrent writer is not disturbed.
      const stale = Date.now() - fs.statSync(lockPath).mtimeMs > 10 * 60 * 1000;
      if (!stale) throw new Error("正在保存本轮成绩，请稍后重试，答案不会丢失", { cause: error });
      try {
        fs.rmdirSync(lockPath);
        fs.mkdirSync(lockPath);
        locked = true;
      } catch (error) {
        throw new Error("正在恢复本轮成绩，请稍后重试", { cause: error });
      }
    }
    // Check the persisted record under the lock, not only before it.
    const previous = previousSessions(user.id);
    const existing = previous.find(x => x.id === session.id);
    if (existing) return finishedResult(ticket.grade, existing, previous, attempts);
    fs.appendFileSync(SESSION_FILE, JSON.stringify(session) + "\n");
    return finishedResult(ticket.grade, session, [...previous, session], attempts);
  } finally {
    if (locked) fs.rmdirSync(lockPath);
  }
}
