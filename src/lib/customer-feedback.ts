import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { userDataPath } from "./user-data-store";

export const FEEDBACK_CATEGORIES = ["question_error","solution_unclear","report_inaccurate","usability","other"] as const;
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];
export type FeedbackSource = "result" | "review";

export type FeedbackInput = {
  attemptId: string;
  examId: string;
  questionId?: string;
  category: FeedbackCategory;
  rating?: number;
  message: string;
  source: FeedbackSource;
  idempotencyKey: string;
};

export class FeedbackError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function parseFeedbackInput(v: unknown): FeedbackInput {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new FeedbackError(400, "反馈内容无效");
  const x = v as Record<string, unknown>;
  const str = (k: string) => typeof x[k] === "string" ? (x[k] as string).trim() : "";
  const attemptId = str("attemptId"), examId = str("examId"), questionId = str("questionId");
  const category = str("category"), source = str("source"), idempotencyKey = str("idempotencyKey");
  const message = str("message");
  if (!/^att_[a-z0-9]{8,48}$/.test(attemptId)) throw new FeedbackError(400,"仅能评价已完成的考试");
  if (!examId || examId.includes("..") || examId.length > 150 || !/^[A-Za-z0-9_:./-]+$/.test(examId)) throw new FeedbackError(400,"考试标识无效");
  if (questionId && (questionId.includes("..") || questionId.length > 150 || !/^[A-Za-z0-9_:./-]+$/.test(questionId))) throw new FeedbackError(400,"题目标识无效");
  if (!(FEEDBACK_CATEGORIES as readonly string[]).includes(category)) throw new FeedbackError(400,"请选择反馈类型");
  if (source !== "result" && source !== "review") throw new FeedbackError(400,"反馈来源无效");
  if (!/^[A-Za-z0-9_-]{8,90}$/.test(idempotencyKey)) throw new FeedbackError(400,"请求标识无效");
  if (message.length > 400) throw new FeedbackError(400,"反馈最多400字");
  const rating = x.rating == null ? undefined : Number(x.rating);
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new FeedbackError(400,"评分必须为1–5");
  return { attemptId,examId,...(questionId?{questionId}:{}),category:category as FeedbackCategory,
    ...(rating===undefined?{}:{rating}),message,source:source as FeedbackSource,idempotencyKey };
}

export function saveCustomerFeedback(
  userId: string,
  feedback: FeedbackInput,
  options: { root?: string; now?: Date; perDayLimit?: number } = {},
): { id: string; duplicate: boolean } {
  if (!userId) throw new FeedbackError(401,"请先登录");
  const now = options.now ?? new Date();
  const date = now.toISOString().slice(0,10);
  const userDir = path.join(options.root ?? userDataPath("customer-feedback"),hash(userId).slice(0,32),date);
  fs.mkdirSync(userDir,{recursive:true,mode:0o700});
  const id = hash(userId + "\u0000" + feedback.idempotencyKey).slice(0,32);
  const target = path.join(userDir,id+".json");
  if (fs.existsSync(target)) return {id,duplicate:true};
  const count = fs.readdirSync(userDir).filter(x=>x.endsWith(".json")).length;
  if (count >= (options.perDayLimit ?? 10)) throw new FeedbackError(429,"今日反馈已达上限");
  const record = {
    id,createdAt:now.toISOString(),attemptId:feedback.attemptId,examId:feedback.examId,
    ...(feedback.questionId?{questionId:feedback.questionId}:{}),category:feedback.category,
    ...(feedback.rating===undefined?{}:{rating:feedback.rating}),message:feedback.message,
    source:feedback.source,status:"open",schemaVersion:1,
  };
  const tmp = path.join(userDir,"."+crypto.randomBytes(12).toString("hex")+".tmp");
  try {
    const fd = fs.openSync(tmp,"wx",0o600);
    try { fs.writeFileSync(fd,JSON.stringify(record)+"\n");fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    // link() atomically wins/loses a stable destination; retries never double-write.
    try { fs.linkSync(tmp,target); }
    catch(e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") return {id,duplicate:true};
      throw e;
    }
    return {id,duplicate:false};
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* next cleanup handles stale temp */ }
  }
}
