import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Choice, ExamBundle, GradeResult, Question } from "./types";
import type { PublicStudent } from "./auth";

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
  questionId: string;
  questionNo: number;
  points: number;
  concept: string;
  selected: string | null;
  correctAnswer: string;
  correct: boolean | null;
  dwellMs: number;
  firstAnswerMs: number | null;
  answerChanges: number;
  flagCount: number;
  answerHistory: string[];
  awayMs: number;
  tabAwayCount: number;
  reviewSnapshot?: QuestionReviewSnapshot;
};

export type ExamAttemptRecord = {
  id: string;
  userId: string;
  candidateNo: string;
  examId: string;
  profile: {
    name: string;
    country?: string;
    year?: number;
    grades: string;
    questionCount: number;
    maxScore: number;
    competitionId?: string;
    formatId?: string;
    paperType?: string;
  };
  startedAt: number;
  submittedAt: number;
  elapsedSeconds: number;
  grade: GradeResult;
  questions: QuestionBehavior[];
  events: ExamEvent[];
};

const D = path.join(process.cwd(), "private", "users");
const F = path.join(D, "exam-attempts.jsonl");
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function span(es: ExamEvent[], id: string, end: number, types: [string, string]) {
  const rows = es
    .filter(e => e.questionId === id && types.includes(e.type) && e.at <= end)
    .sort((a, b) => a.at - b.at);
  let s: number | null = null, t = 0, c = 0;
  for (const e of rows) {
    if (e.type === types[0] && s === null) {
      s = e.at;
      c++;
    } else if (e.type === types[1] && s !== null) {
      t += Math.max(0, e.at - s);
      s = null;
    }
  }
  if (s !== null) t += Math.max(0, end - s);
  return { ms: t, count: c };
}

function reviewSnapshot(q: Question): QuestionReviewSnapshot {
  const zh = q.localized?.zh;
  const en = q.localized?.en;
  const commonVisual = q.studentAssetUrl || q.assetUrl;
  return {
    stem: text(zh?.stem) || text(q.stem) || "请查看下方原题图。",
    stemEn: text(en?.stem) || text(q.stemEn) || text(q.stem) || "See the problem image below.",
    choices: zh?.choices?.length ? zh.choices : q.choices,
    choicesEn: en?.choices?.length ? en.choices : q.choicesEn?.length ? q.choicesEn : q.choices,
    answerMode: q.answerMode || (q.choices?.length ? "choice" : "integer"),
    assetUrl: commonVisual,
    assetUrlZh: q.studentAssetUrlZh || q.assetUrlZh || commonVisual,
    assetUrlEn: q.studentAssetUrlEn || q.assetUrlEn || commonVisual,
  };
}

export function appendExamAttempt(a: {
  user: PublicStudent;
  bundle: ExamBundle;
  grade: GradeResult;
  events: ExamEvent[];
  startedAt: number;
  submittedAt: number;
  elapsedSeconds: number;
}) {
  const es = a.events.slice(-5000);
  const by = new Map(a.grade.items.map(x => [x.questionId, x]));
  const qs = a.bundle.questions.map(q => {
    const item = by.get(q.id);
    const sel = es
      .filter(e => e.questionId === q.id && e.type === "answer_selected" && e.value)
      .sort((x, y) => x.at - y.at);
    const hist = sel.map(e => e.value!).filter((v, i, z) => !i || v !== z[i - 1]);
    const enter = es
      .filter(e => e.questionId === q.id && e.type === "question_enter")
      .sort((x, y) => x.at - y.at)[0]?.at;
    const d = span(es, q.id, a.submittedAt, ["question_enter", "question_leave"]);
    const away = span(es, q.id, a.submittedAt, ["visibility_hidden", "visibility_visible"]);
    return {
      questionId: q.id,
      questionNo: q.questionNo,
      points: q.points,
      concept: q.concept,
      selected: item?.selected ?? null,
      correctAnswer: item?.correctAnswer ?? q.answer,
      correct: item?.correct ?? null,
      dwellMs: Math.max(0, d.ms - away.ms),
      firstAnswerMs: enter && sel[0]
        ? Math.max(0, sel[0].at - enter - span(es, q.id, sel[0].at, ["visibility_hidden", "visibility_visible"]).ms)
        : null,
      answerChanges: Math.max(0, hist.length - 1),
      flagCount: es.filter(e => e.questionId === q.id && e.type === "flagged").length,
      answerHistory: hist.slice(-10),
      awayMs: away.ms,
      tabAwayCount: away.count,
      reviewSnapshot: reviewSnapshot(q),
    } as QuestionBehavior;
  });
  const r: ExamAttemptRecord = {
    id: `att_${crypto.randomBytes(9).toString("hex")}`,
    userId: a.user.id,
    candidateNo: a.user.candidateNo,
    examId: a.bundle.profile.id,
    profile: {
      name: a.bundle.profile.name,
      country: a.bundle.profile.country,
      year: a.bundle.profile.year,
      grades: a.bundle.profile.grades,
      questionCount: a.bundle.profile.questionCount,
      maxScore: a.bundle.profile.maxScore,
      competitionId: a.bundle.profile.competitionId,
      formatId: a.bundle.profile.formatId,
      paperType: a.bundle.profile.paperType,
    },
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    elapsedSeconds: a.elapsedSeconds,
    grade: a.grade,
    questions: qs,
    events: es,
  };
  fs.mkdirSync(D, { recursive: true });
  fs.appendFileSync(F, JSON.stringify(r) + "\n");
  return r;
}

export function loadExamAttempts(uid: string, limit = 300): ExamAttemptRecord[] {
  if (!fs.existsSync(F)) return [];
  return fs.readFileSync(F, "utf8").split("\n").filter(Boolean).flatMap(l => {
    try {
      const x = JSON.parse(l) as ExamAttemptRecord;
      return x.userId === uid ? [x] : [];
    } catch {
      return [];
    }
  }).slice(-limit);
}

export function hasSubmittedQuestion(uid: string, questionId: string) {
  return loadExamAttempts(uid, 2000).some(a => a.questions.some(q => q.questionId === questionId));
}
