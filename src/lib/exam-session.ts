import crypto from "node:crypto";
import fs from "node:fs";
import type { ExamTimingSection } from "./types";
import { atomicWriteJson, ensureUserDataDir, userDataPath } from "./user-data-store";

export type ExamSectionLock = {
  sectionIndex: number;
  startedAt: number;
  lockedAt: number;
  answers: Record<string, string>;
};

export type ExamSessionRecord = {
  id: string;
  userId: string;
  examId: string;
  startedAt: number;
  expiresAt: number;
  completedAt?: number;
  attemptId?: string;
  sectionIndex?: number;
  sectionStartedAt?: number;
  sectionLocks?: ExamSectionLock[];
  sectionDrafts?: Record<string, { answers: Record<string, string>; updatedAt: number }>;
};

const FILE = userDataPath("exam-sessions.json");
const LOCK_FILE = userDataPath("exam-sessions.lock");
const sleepCell = new Int32Array(new SharedArrayBuffer(4));

function all(): ExamSessionRecord[] {
  ensureUserDataDir();
  if (!fs.existsSync(FILE)) return [];
  let value: unknown;
  try { value = JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { throw new Error("EXAM_SESSION_STORE_CORRUPT"); }
  if (!Array.isArray(value)) throw new Error("EXAM_SESSION_STORE_CORRUPT");
  return value as ExamSessionRecord[];
}

function save(rows: ExamSessionRecord[]) {
  atomicWriteJson(FILE, rows.filter(row => row.startedAt > Date.now() - 12096e5).slice(-2000));
}

function processAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === "EPERM"; }
}

function withSessionLock<T>(fn: () => T): T {
  ensureUserDataDir();
  const deadline = Date.now() + 5000;
  let fd: number | null = null;
  while (fd === null) {
    try {
      fd = fs.openSync(LOCK_FILE, "wx", 0o600);
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: Date.now() }));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const stat = fs.statSync(LOCK_FILE);
        if (Date.now() - stat.mtimeMs > 60_000) {
          let pid = 0;
          try { pid = Number(JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")).pid || 0); } catch { /* malformed stale lock */ }
          if (!processAlive(pid)) fs.rmSync(LOCK_FILE, { force: true });
        }
      } catch { /* lock disappeared; retry */ }
      if (Date.now() >= deadline) throw new Error("EXAM_SESSION_STORE_BUSY");
      Atomics.wait(sleepCell, 0, 0, 25);
    }
  }
  try { return fn(); }
  finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } finally { fs.rmSync(LOCK_FILE, { force: true }); }
    }
  }
}

/** Preserved compatibility for session-resume routes and existing test harnesses. */
export function ownedExamSession(id: string, userId: string, examId: string): ExamSessionRecord | null {
  if (!id || !userId || !examId) return null;
  return all().find(row => row.id === id && row.userId === userId && row.examId === examId) ?? null;
}

export function activeExamSession(userId: string, examId: string) {
  return all().filter(row => row.userId === userId && row.examId === examId && !row.completedAt && row.expiresAt > Date.now())
    .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
}

export function startExamSession(userId: string, examId: string, durationSeconds: number, sections?: ExamTimingSection[], now = Date.now()) {
  return withSessionLock(() => {
    const old = activeExamSession(userId, examId);
    if (old) return { session: old, resumed: true };
    const split = Boolean(sections?.length);
    const session: ExamSessionRecord = {
      id: "sess_" + crypto.randomBytes(12).toString("hex"),
      userId,
      examId,
      startedAt: now,
      expiresAt: now + ((durationSeconds > 0 ? durationSeconds + (split ? 7200 : 600) : 86400)) * 1000,
      ...(split ? { sectionIndex: 0, sectionStartedAt: now, sectionLocks: [], sectionDrafts: {} } : {}),
    };
    const rows = all();
    rows.push(session);
    save(rows);
    return { session, resumed: false };
  });
}

export function cancelExamSession(id: string, userId: string, examId: string) {
  return withSessionLock(() => {
    const rows = all();
    const row = rows.find(item => item.id === id && item.userId === userId && item.examId === examId);
    if (!row || row.completedAt || row.attemptId) return false;
    save(rows.filter(item => item.id !== id));
    return true;
  });
}

export function validateExamSession(id: string, userId: string, examId: string) {
  const row = all().find(item => item.id === id);
  if (!row || row.userId !== userId || row.examId !== examId) return { ok: false as const, error: "考试会话无效" };
  if (row.completedAt) return { ok: false as const, error: "该考试已经交卷" };
  if (row.expiresAt < Date.now()) return { ok: false as const, error: "考试会话已过期" };
  return { ok: true as const, session: row };
}

function mutateSession(id: string, userId: string, examId: string, fn: (session: ExamSessionRecord) => void) {
  return withSessionLock(() => {
    const rows = all();
    const session = rows.find(row => row.id === id && row.userId === userId && row.examId === examId);
    if (!session) throw new Error("考试会话无效");
    if (session.completedAt) throw new Error("该考试已经交卷");
    fn(session);
    save(rows);
    return session;
  });
}

export function saveExamSectionDraft(args: {
  id: string; userId: string; examId: string; sectionIndex: number;
  answers: Record<string, string>; questionIds: string[]; durationSeconds: number; now?: number;
}) {
  const now = args.now ?? Date.now();
  return mutateSession(args.id, args.userId, args.examId, session => {
    if ((session.sectionIndex ?? 0) !== args.sectionIndex) throw new Error("考试部分状态不匹配");
    if (!session.sectionStartedAt) throw new Error("当前部分尚未开始");
    const deadline = session.sectionStartedAt + args.durationSeconds * 1000;
    if (now > deadline) throw new Error("当前部分作答时间已结束");
    const allowed = new Set(args.questionIds);
    const snapshot = Object.fromEntries(Object.entries(args.answers).filter(([key]) => allowed.has(key)));
    session.sectionDrafts ??= {};
    session.sectionDrafts[String(args.sectionIndex)] = { answers: snapshot, updatedAt: now };
  });
}

export function lockExamSection(args: {
  id: string; userId: string; examId: string; sectionIndex: number;
  answers: Record<string, string>; questionIds: string[]; durationSeconds: number; now?: number;
}) {
  const now = args.now ?? Date.now();
  return mutateSession(args.id, args.userId, args.examId, session => {
    const current = session.sectionIndex ?? 0;
    if (current !== args.sectionIndex) throw new Error("考试部分状态不匹配");
    if (!session.sectionStartedAt) throw new Error("当前部分尚未开始");
    const locks = session.sectionLocks ?? [];
    if (locks.some(row => row.sectionIndex === args.sectionIndex)) throw new Error("该部分已经锁定");
    const allowed = new Set(args.questionIds);
    const deadline = session.sectionStartedAt + args.durationSeconds * 1000;
    if (now <= deadline) {
      const snapshot = Object.fromEntries(Object.entries(args.answers).filter(([key]) => allowed.has(key)));
      session.sectionDrafts ??= {};
      session.sectionDrafts[String(args.sectionIndex)] = { answers: snapshot, updatedAt: now };
    }
    const snapshot = session.sectionDrafts?.[String(args.sectionIndex)]?.answers ?? {};
    locks.push({
      sectionIndex: args.sectionIndex,
      startedAt: session.sectionStartedAt,
      lockedAt: Math.min(now, deadline),
      answers: snapshot,
    });
    session.sectionLocks = locks;
    session.sectionIndex = args.sectionIndex + 1;
    delete session.sectionStartedAt;
  });
}

export function startExamSection(args: { id: string; userId: string; examId: string; sectionIndex: number; now?: number }) {
  const now = args.now ?? Date.now();
  return mutateSession(args.id, args.userId, args.examId, session => {
    if ((session.sectionIndex ?? 0) !== args.sectionIndex) throw new Error("考试部分状态不匹配");
    if (session.sectionStartedAt) throw new Error("当前部分已经开始");
    if ((session.sectionLocks ?? []).some(row => row.sectionIndex === args.sectionIndex)) throw new Error("该部分已经锁定");
    session.sectionStartedAt = now;
  });
}

export function lockedExamAnswers(session: ExamSessionRecord) {
  const output: Record<string, string> = {};
  for (const lock of [...(session.sectionLocks ?? [])].sort((a, b) => a.sectionIndex - b.sectionIndex)) {
    Object.assign(output, lock.answers);
  }
  return output;
}

export function allExamSectionsLocked(session: ExamSessionRecord, count: number) {
  const got = new Set((session.sectionLocks ?? []).map(row => row.sectionIndex));
  return Array.from({ length: count }, (_, index) => got.has(index)).every(Boolean);
}

export function activeSectionElapsedSeconds(session: ExamSessionRecord, sections: ExamTimingSection[]) {
  return Math.round((session.sectionLocks ?? []).reduce((sum, lock) => {
    const cap = sections[lock.sectionIndex]?.durationSeconds ?? 0;
    return sum + Math.min(Math.max(0, lock.lockedAt - lock.startedAt), cap * 1000);
  }, 0) / 1000);
}

export function completeExamSession(id: string, attemptId: string, submittedAt = Date.now()) {
  return withSessionLock(() => {
    const rows = all();
    const row = rows.find(item => item.id === id);
    if (!row) throw new Error("考试会话不可完成");
    if (row.completedAt) {
      if (row.attemptId === attemptId) return row;
      throw new Error("考试会话已由其他提交完成");
    }
    row.completedAt = submittedAt;
    row.attemptId = attemptId;
    save(rows);
    return row;
  });
}

export function activeExamSessionsForUser(userId: string, now = Date.now()) {
  return all().filter(row => row.userId === userId && !row.completedAt && row.expiresAt > now);
}
