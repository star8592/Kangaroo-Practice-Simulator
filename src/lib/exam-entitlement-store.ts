import crypto from "node:crypto";
import fs from "node:fs";
import { atomicWriteJson, ensureUserDataDir, userDataPath } from "./user-data-store";
import { findExamAttemptBySession } from "./attempt-store";

export type ExamEntitlementStatus = "available" | "reserved" | "submitting" | "consumed" | "expired";
export type ExamEntitlement = {
  id: string;
  purchaseRef: string;
  creditIndex: number;
  productId: "math-competition-diagnostic";
  userId: string;
  examCredits: 1;
  allowedCompetitionIds: string[];
  /** Unique purchased year/paper/round. Cannot be changed on retry. */
  allowedExamId: string;
  status: ExamEntitlementStatus;
  createdAt: number;
  reservedAt?: number;
  reservedSessionId?: string;
  reservedExamId?: string;
  reservedCompetitionId?: string;
  reservedExpiresAt?: number;
  submittingAt?: number;
  consumedAt?: number;
  attemptId?: string;
};

export type ExamEntitlementSummary = {
  purchaseRequired: boolean;
  total: number;
  available: number;
  reserved: number;
  consumed: number;
  expired: number;
};

const DATA_FILE = userDataPath("exam-entitlements.json");
const LOCK_FILE = userDataPath("exam-entitlements.lock");
const sleepCell = new Int32Array(new SharedArrayBuffer(4));
const SUBMIT_RECOVERY_MS = 10 * 60 * 1000;

function readRows(): ExamEntitlement[] {
  ensureUserDataDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  let value: unknown;
  try { value = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { throw new Error("EXAM_ENTITLEMENT_STORE_CORRUPT"); }
  if (!Array.isArray(value)) throw new Error("EXAM_ENTITLEMENT_STORE_CORRUPT");
  return value as ExamEntitlement[];
}

function writeRows(rows: ExamEntitlement[]) {
  atomicWriteJson(DATA_FILE, rows);
}

function processAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === "EPERM"; }
}

function withLock<T>(fn: () => T): T {
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
      if (Date.now() >= deadline) throw new Error("EXAM_ENTITLEMENT_STORE_BUSY");
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

function clearReservation(row: ExamEntitlement) {
  delete row.reservedAt;
  delete row.reservedSessionId;
  delete row.reservedExamId;
  delete row.reservedCompetitionId;
  delete row.reservedExpiresAt;
  delete row.submittingAt;
}

function reconcile(rows: ExamEntitlement[], now: number) {
  let changed = false;
  for (const row of rows) {
    if (row.status === "reserved" && row.reservedExpiresAt && row.reservedExpiresAt <= now) {
      row.status = "available";
      clearReservation(row);
      changed = true;
      continue;
    }
    if (row.status === "submitting" && row.submittingAt && now - row.submittingAt >= SUBMIT_RECOVERY_MS && row.reservedSessionId) {
      const attempt = findExamAttemptBySession(row.userId, row.reservedSessionId);
      if (attempt) {
        row.status = "consumed";
        row.attemptId = attempt.id;
        row.consumedAt = attempt.submittedAt;
        delete row.submittingAt;
        changed = true;
      } else if (row.reservedExpiresAt && row.reservedExpiresAt <= now) {
        row.status = "available";
        clearReservation(row);
        changed = true;
      }
    }
  }
  return changed;
}

function summary(rows: ExamEntitlement[], userId: string): ExamEntitlementSummary {
  const owned = rows.filter(row => row.userId === userId);
  return {
    purchaseRequired: owned.length > 0,
    total: owned.reduce((sum, row) => sum + Number(row.examCredits || 0), 0),
    available: owned.filter(row => row.status === "available").reduce((sum, row) => sum + Number(row.examCredits || 0), 0),
    reserved: owned.filter(row => row.status === "reserved" || row.status === "submitting").reduce((sum, row) => sum + Number(row.examCredits || 0), 0),
    consumed: owned.filter(row => row.status === "consumed").reduce((sum, row) => sum + Number(row.examCredits || 0), 0),
    expired: owned.filter(row => row.status === "expired").reduce((sum, row) => sum + Number(row.examCredits || 0), 0),
  };
}

export function grantExamEntitlement(args: {
  purchaseRef: string;
  userId: string;
  productId: string;
  examCredits: number;
  allowedCompetitionIds: string[];
  allowedExamId: string;
  now?: number;
}) {
  const purchaseRef = args.purchaseRef.trim();
  const userId = args.userId.trim();
  const allowedCompetitionIds = [...new Set(args.allowedCompetitionIds.map(x => String(x).trim()).filter(Boolean))].sort();
  const allowedExamId = String(args.allowedExamId || "").trim();
  if (!purchaseRef || purchaseRef.length > 160 || !userId) throw new Error("INVALID_EXAM_ENTITLEMENT_IDENTITY");
  if (!/^[A-Za-z0-9_-]{3,100}$/.test(allowedExamId)) throw new Error("INVALID_EXAM_ENTITLEMENT_EXAM_ID");
  if (args.productId !== "math-competition-diagnostic" || args.examCredits !== 1 || allowedCompetitionIds.length < 1) {
    throw new Error("INVALID_EXAM_ENTITLEMENT_PRODUCT_OR_QUANTITY");
  }
  return withLock(() => {
    const rows = readRows();
    const existing = rows.filter(row => row.purchaseRef === purchaseRef);
    if (existing.length) {
      const sameGrant = existing.length === 1
        && existing.every(row => row.userId === userId
          && row.productId === args.productId
          && row.examCredits === 1
          && row.allowedExamId === allowedExamId
          && JSON.stringify([...(row.allowedCompetitionIds || [])].sort()) === JSON.stringify(allowedCompetitionIds))
        && new Set(existing.map(row => row.creditIndex)).size === 1
        && existing[0]?.creditIndex === 1;
      if (!sameGrant) throw new Error("EXAM_ENTITLEMENT_PURCHASE_REF_CONFLICT");
      const changed = reconcile(rows, args.now ?? Date.now());
      if (changed) writeRows(rows);
      return { entitlements: existing, summary: summary(rows, userId), idempotent: true };
    }
    const now = args.now ?? Date.now();
    const entitlements: ExamEntitlement[] = Array.from({ length: 1 }, (_, index) => ({
      id: "exm_" + crypto.randomBytes(12).toString("hex"),
      purchaseRef,
      creditIndex: index + 1,
      productId: "math-competition-diagnostic",
      userId,
      examCredits: 1,
      allowedCompetitionIds,
      allowedExamId,
      status: "available",
      createdAt: now + index,
    }));
    rows.push(...entitlements);
    writeRows(rows);
    return { entitlements, summary: summary(rows, userId), idempotent: false };
  });
}

export function isCommerceExamUser(userId: string) {
  if (!userId) return false;
  return readRows().some(row => row.userId === userId);
}

export function getExamEntitlementSummary(userId: string) {
  if (!userId) return summary([], userId);
  return withLock(() => {
    const rows = readRows();
    if (reconcile(rows, Date.now())) writeRows(rows);
    return summary(rows, userId);
  });
}

export function getExamEntitlementForSession(userId: string, sessionId: string) {
  if (!userId || !sessionId) return null;
  return withLock(() => {
    const rows = readRows();
    if (reconcile(rows, Date.now())) writeRows(rows);
    return rows.find(row => row.userId === userId && row.reservedSessionId === sessionId) ?? null;
  });
}

export function getExamEntitlementForExam(userId: string, examId: string) {
  if (!userId || !examId) return null;
  return withLock(() => {
    const rows = readRows();
    if (reconcile(rows, Date.now())) writeRows(rows);
    return rows.filter(row => row.userId === userId && row.reservedExamId === examId
      && ["reserved", "submitting", "consumed", "expired"].includes(row.status))
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  });
}

export function getExamEntitlementForAttempt(userId: string, examId: string, attemptId: string) {
  if (!userId || !examId || !attemptId) return null;
  return withLock(() => {
    const rows = readRows();
    if (reconcile(rows, Date.now())) writeRows(rows);
    return rows.find(row => row.userId === userId && row.reservedExamId === examId
      && row.attemptId === attemptId && row.status === "consumed") ?? null;
  });
}

export function getActiveExamReservation(userId: string) {
  if (!userId) return null;
  return withLock(() => {
    const rows = readRows();
    if (reconcile(rows, Date.now())) writeRows(rows);
    return rows.filter(row => row.userId === userId && (row.status === "reserved" || row.status === "submitting"))
      .sort((a, b) => (b.reservedAt || 0) - (a.reservedAt || 0))[0] ?? null;
  });
}

export function hasAvailableExamCreditForExam(userId: string, examId: string) {
  if (!userId || !examId) return false;
  return withLock(() => {
    const rows = readRows();
    if (reconcile(rows, Date.now())) writeRows(rows);
    return rows.some(row => row.userId === userId
      && row.allowedExamId === examId
      && ["available", "reserved", "submitting"].includes(row.status));
  });
}

export function reserveExamEntitlement(args: {
  userId: string;
  sessionId: string;
  examId: string;
  competitionId: string;
  expiresAt: number;
  now?: number;
}) {
  if (!args.userId || !args.sessionId || !args.examId || !args.competitionId || !Number.isFinite(args.expiresAt)) {
    throw new Error("INVALID_EXAM_RESERVATION");
  }
  return withLock(() => {
    const rows = readRows();
    const now = args.now ?? Date.now();
    if (reconcile(rows, now)) writeRows(rows);
    const same = rows.find(row => row.userId === args.userId && row.reservedSessionId === args.sessionId);
    if (same) {
      if (same.reservedExamId !== args.examId || same.reservedCompetitionId !== args.competitionId
        || !["reserved", "submitting", "consumed"].includes(same.status)) {
        return { ok: false as const, reason: "reservation_conflict" as const };
      }
      return { ok: true as const, entitlement: same, idempotent: true };
    }
    const active = rows.find(row => row.userId === args.userId && (row.status === "reserved" || row.status === "submitting"));
    if (active) return { ok: false as const, reason: "exam_in_progress" as const, activeExamId: active.reservedExamId };
    const availableForCompetition = rows.filter(row => row.userId === args.userId && row.status === "available"
      && row.allowedExamId === args.examId
      && (row.allowedCompetitionIds || []).includes(args.competitionId)).sort((a, b) => a.createdAt - b.createdAt);
    const available = availableForCompetition[0];
    if (!available) {
      const anyAvailable = rows.some(row => row.userId === args.userId && row.status === "available");
      return { ok: false as const, reason: anyAvailable ? "exam_not_included" as const : "no_exam_credit" as const };
    }
    available.status = "reserved";
    available.reservedAt = now;
    available.reservedSessionId = args.sessionId;
    available.reservedExamId = args.examId;
    available.reservedCompetitionId = args.competitionId;
    available.reservedExpiresAt = Math.max(now + 60_000, args.expiresAt);
    writeRows(rows);
    return { ok: true as const, entitlement: available, idempotent: false };
  });
}

export function releaseExamEntitlement(userId: string, sessionId: string) {
  return withLock(() => {
    const rows = readRows();
    const row = rows.find(item => item.userId === userId && item.reservedSessionId === sessionId);
    if (!row || row.status !== "reserved") return false;
    row.status = "available";
    clearReservation(row);
    writeRows(rows);
    return true;
  });
}

export function beginExamEntitlementSubmission(userId: string, sessionId: string) {
  return withLock(() => {
    const rows = readRows();
    const row = rows.find(item => item.userId === userId && item.reservedSessionId === sessionId);
    if (!row || !["reserved", "submitting"].includes(row.status)) throw new Error("EXAM_ENTITLEMENT_RESERVATION_REQUIRED");
    row.status = "submitting";
    row.submittingAt = Date.now();
    writeRows(rows);
    return row;
  });
}

export function restoreExamEntitlementSubmission(userId: string, sessionId: string) {
  return withLock(() => {
    const rows = readRows();
    const row = rows.find(item => item.userId === userId && item.reservedSessionId === sessionId);
    if (!row || row.status !== "submitting") return false;
    row.status = "reserved";
    delete row.submittingAt;
    writeRows(rows);
    return true;
  });
}

export function consumeExamEntitlement(args: { userId: string; sessionId: string; attemptId: string; now?: number }) {
  return withLock(() => {
    const rows = readRows();
    const row = rows.find(item => item.userId === args.userId && item.reservedSessionId === args.sessionId);
    if (!row) throw new Error("EXAM_ENTITLEMENT_RESERVATION_REQUIRED");
    if (row.status === "consumed" && row.attemptId === args.attemptId) return row;
    if (!["reserved", "submitting"].includes(row.status)) throw new Error("EXAM_ENTITLEMENT_ALREADY_USED");
    row.status = "consumed";
    row.attemptId = args.attemptId;
    row.consumedAt = args.now ?? Date.now();
    delete row.submittingAt;
    writeRows(rows);
    return row;
  });
}

