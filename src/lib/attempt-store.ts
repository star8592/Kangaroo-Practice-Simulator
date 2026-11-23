import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, GradeResult, Choice, Question } from "./types";
import type { PublicStudent } from "./auth";
import { ensureUserDataDir, userDataPath } from "./user-data-store";

export type ExamEvent = { type: string; questionId?: string; at: number; value?: string };
export type QuestionReviewSnapshot = {
  stem: string;
  stemEn?: string;
  choices: Choice[];
  choicesEn?: Choice[];
  answerMode?: "choice" | "integer";
  assetUrl?: string;
  assetUrlZh?: string;
  assetUrlEn?: string;
};
export type QuestionBehavior = {
  questionId: string; questionNo: number; points: number; concept: string;
  selected: string | null; correctAnswer: string; correct: boolean | null;
  dwellMs: number; firstAnswerMs: number | null; answerChanges: number;
  flagCount: number; answerHistory: string[]; awayMs: number; tabAwayCount: number;
  reviewSnapshot?: QuestionReviewSnapshot;
};
export type ExamAttemptRecord = {
  id: string; sessionId?: string; userId: string; candidateNo: string; examId: string;
  profile: { name: string; country?: string; year?: number; grades: string; questionCount: number;
    maxScore: number; competitionId?: string; formatId?: string; paperType?: string };
  startedAt: number; submittedAt: number; elapsedSeconds: number;
  grade: GradeResult; questions: QuestionBehavior[]; events: ExamEvent[];
};

const FILE = userDataPath("exam-attempts.jsonl");
const LOCK_DIR = userDataPath(".exam-submit-locks");

function readAll(): ExamAttemptRecord[] {
  ensureUserDataDir();
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, "utf8").split("\n").filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line) as ExamAttemptRecord]; } catch { return []; }
  });
}

export function withExamSubmitLock<T>(userId: string, examId: string, sessionId: string, fn: () => T): T {
  if (!userId || !examId || !sessionId) throw new Error("EXAM_SUBMIT_SESSION_REQUIRED");
  ensureUserDataDir();
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  // Preserve the historical submit lock key so old and new graders cannot race.
  const key = crypto.createHash("sha256").update(JSON.stringify([userId, examId, sessionId])).digest("hex");
  const directory = path.join(LOCK_DIR, key);
  try {
    fs.mkdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const stale = Date.now() - fs.statSync(directory).mtimeMs > 10 * 60 * 1000;
    if (!stale) throw new Error("EXAM_SUBMIT_BUSY");
    fs.rmdirSync(directory);
    try { fs.mkdirSync(directory); } catch { throw new Error("EXAM_SUBMIT_BUSY"); }
  }
  try { return fn(); }
  finally { fs.rmdirSync(directory); }
}

function span(events: ExamEvent[], id: string, end: number, types: [string, string]) {
  const rows = events.filter(e => e.questionId === id && types.includes(e.type) && e.at <= end).sort((a, b) => a.at - b.at);
  let start: number | null = null, total = 0, count = 0;
  for (const event of rows) {
    if (event.type === types[0] && start === null) { start = event.at; count++; }
    else if (event.type === types[1] && start !== null) { total += Math.max(0, event.at - start); start = null; }
  }
  if (start !== null) total += Math.max(0, end - start);
  return { ms: total, count };
}

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function reviewSnapshot(question: Question): QuestionReviewSnapshot {
  const zh = question.localized?.zh;
  const en = question.localized?.en;
  const commonVisual = question.studentAssetUrl || question.assetUrl;
  return {
    stem: text(zh?.stem) || text(question.stem) || "请查看下方原题图。",
    stemEn: text(en?.stem) || text(question.stemEn) || text(question.stem) || "See the problem image below.",
    choices: zh?.choices?.length ? zh.choices : question.choices,
    choicesEn: en?.choices?.length ? en.choices : question.choicesEn?.length ? question.choicesEn : question.choices,
    answerMode: question.answerMode || (question.choices?.length ? "choice" : "integer"),
    assetUrl: commonVisual,
    assetUrlZh: question.studentAssetUrlZh || question.assetUrlZh || commonVisual,
    assetUrlEn: question.studentAssetUrlEn || question.assetUrlEn || commonVisual,
  };
}

export function findExamAttemptBySession(userId: string, sessionId: string): ExamAttemptRecord | null {
  if (!userId || !sessionId) return null;
  return readAll().filter(row => row.userId === userId && row.sessionId === sessionId)
    .sort((a, b) => b.submittedAt - a.submittedAt)[0] ?? null;
}

/** Compatibility wrapper to ensure the exam ID also matches when reading existing attempts. */
export function findExamAttemptForSession(userId: string, examId: string, sessionId: string) {
  const result = findExamAttemptBySession(userId, sessionId);
  return result?.examId === examId ? result : null;
}

export function appendExamAttempt(args: {
  user: PublicStudent; bundle: ExamBundle; grade: GradeResult; events: ExamEvent[];
  startedAt: number; submittedAt: number; elapsedSeconds: number; sessionId: string;
}) {
  if (!args.sessionId) throw new Error("EXAM_ATTEMPT_SESSION_REQUIRED");
  const existing = findExamAttemptBySession(args.user.id, args.sessionId);
  if (existing) return existing;

  const events = args.events.slice(-5000);
  const byQuestion = new Map(args.grade.items.map(item => [item.questionId, item]));
  const questions = args.bundle.questions.map(question => {
    const item = byQuestion.get(question.id);
    const selectedEvents = events.filter(event => event.questionId === question.id && event.type === "answer_selected" && event.value)
      .sort((a, b) => a.at - b.at);
    const history = selectedEvents.map(event => event.value!).filter((value, index, all) => !index || value !== all[index - 1]);
    const enteredAt = events.filter(event => event.questionId === question.id && event.type === "question_enter")
      .sort((a, b) => a.at - b.at)[0]?.at;
    const dwell = span(events, question.id, args.submittedAt, ["question_enter", "question_leave"]);
    const away = span(events, question.id, args.submittedAt, ["visibility_hidden", "visibility_visible"]);
    return {
      questionId: question.id,
      questionNo: question.questionNo,
      points: question.points,
      concept: question.concept,
      selected: item?.selected ?? null,
      correctAnswer: item?.correctAnswer ?? question.answer,
      correct: item?.correct ?? null,
      dwellMs: Math.max(0, dwell.ms - away.ms),
      firstAnswerMs: enteredAt && selectedEvents[0]
        ? Math.max(0, selectedEvents[0].at - enteredAt - span(events, question.id, selectedEvents[0].at, ["visibility_hidden", "visibility_visible"]).ms)
        : null,
      answerChanges: Math.max(0, history.length - 1),
      flagCount: events.filter(event => event.questionId === question.id && event.type === "flagged").length,
      answerHistory: history.slice(-10),
      awayMs: away.ms,
      tabAwayCount: away.count,
      reviewSnapshot: reviewSnapshot(question),
    } as QuestionBehavior;
  });

  const record: ExamAttemptRecord = {
    id: "att_" + crypto.randomBytes(9).toString("hex"),
    sessionId: args.sessionId,
    userId: args.user.id,
    candidateNo: args.user.candidateNo,
    examId: args.bundle.profile.id,
    profile: {
      name: args.bundle.profile.name,
      country: args.bundle.profile.country,
      year: args.bundle.profile.year,
      grades: args.bundle.profile.grades,
      questionCount: args.bundle.profile.questionCount,
      maxScore: args.bundle.profile.maxScore,
      competitionId: args.bundle.profile.competitionId,
      formatId: args.bundle.profile.formatId,
      paperType: args.bundle.profile.paperType,
    },
    startedAt: args.startedAt,
    submittedAt: args.submittedAt,
    elapsedSeconds: args.elapsedSeconds,
    grade: args.grade,
    questions,
    events,
  };
  ensureUserDataDir();
  fs.appendFileSync(FILE, JSON.stringify(record) + "\n", { mode: 0o600 });
  return record;
}

export function loadExamAttempts(userId: string, limit = 300): ExamAttemptRecord[] {
  return readAll().filter(row => row.userId === userId).slice(-limit);
}

export function hasSubmittedQuestion(userId: string, questionId: string) {
  return loadExamAttempts(userId, 2000).some(attempt => attempt.questions.some(question => question.questionId === questionId));
}
