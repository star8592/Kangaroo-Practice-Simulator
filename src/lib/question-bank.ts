import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, ExamProfile, PublicQuestion, Question } from "./types";

const BANK_PATH = path.join(process.cwd(), "private", "question-bank.json");
const EXAMS_DIR = path.join(process.cwd(), "private", "exams");

export const LEVEL_A_PROFILE: ExamProfile = {
  id: "level-a",
  name: "Level A 仿真赛",
  grades: "Grades 1–2",
  durationSeconds: 75 * 60,
  questionCount: 24,
  initialScore: 24,
  maxScore: 120,
  wrongPenaltyMode: "fixed",
  wrongPenaltyValue: 1,
  country: "China-style",
  language: "zh/en",
  studentReady: true,
};

function safeExamId(examId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(examId)) throw new Error("Invalid exam id");
  return examId;
}

function hasBilingualText(q: Question) {
  return Boolean(q.localized?.zh?.stem?.trim() && q.localized?.en?.stem?.trim());
}

function isStudentReady(q: Question) {
  if (q.language === "zh/en" || (q.stem && q.stemEn)) return true;
  return Boolean(q.examReady && hasBilingualText(q) && q.studentAssetUrl);
}

export function loadQuestionBank(): Question[] {
  if (!fs.existsSync(BANK_PATH)) {
    throw new Error(`Local question bank not found: ${BANK_PATH}. Run scripts/import_level_a.py first.`);
  }
  return JSON.parse(fs.readFileSync(BANK_PATH, "utf8")) as Question[];
}

export function loadExamBundle(examId: string): ExamBundle {
  const id = safeExamId(examId);
  const file = path.join(EXAMS_DIR, `${id}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")) as ExamBundle;
  if (id === "level-a") return { profile: LEVEL_A_PROFILE, questions: loadQuestionBank() };
  throw new Error(`Local exam bundle not found: ${id}`);
}

export function listExamProfiles(): ExamProfile[] {
  const profiles: ExamProfile[] = [];
  if (fs.existsSync(BANK_PATH)) profiles.push(LEVEL_A_PROFILE);
  if (!fs.existsSync(EXAMS_DIR)) return profiles;

  for (const name of fs.readdirSync(EXAMS_DIR).filter((x) => x.endsWith(".json")).sort()) {
    if (name.includes("before-bilingual")) continue;
    try {
      const bundle = JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, name), "utf8")) as ExamBundle;
      if (!bundle.questions.length || !bundle.questions.every(isStudentReady)) continue;
      if (!profiles.some((p) => p.id === bundle.profile.id)) profiles.push({ ...bundle.profile, studentReady: true });
    } catch { /* skip invalid or source-only local bundles */ }
  }
  return profiles;
}

export function publicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => {
    const localized = hasBilingualText(q);
    if (!localized && q.language !== "zh/en" && !q.stemEn) {
      throw new Error(`Question ${q.id} is not bilingual-ready`);
    }
    const zh = q.localized?.zh;
    const en = q.localized?.en;
    return {
      id: q.id,
      year: q.year,
      level: q.level,
      grades: q.grades,
      language: localized ? "zh/en" : q.language,
      questionNo: q.questionNo,
      points: q.points,
      concept: q.concept,
      stem: zh?.stem || q.stem,
      stemEn: en?.stem || q.stemEn,
      choices: zh?.choices?.length ? zh.choices : q.choices,
      choicesEn: en?.choices?.length ? en.choices : q.choicesEn,
      assetUrl: q.studentAssetUrl || q.assetUrl,
      verified: Boolean(q.verified || q.review?.verified),
    };
  });
}
