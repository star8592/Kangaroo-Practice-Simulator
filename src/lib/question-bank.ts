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
};

function safeExamId(examId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(examId)) throw new Error("Invalid exam id");
  return examId;
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
  if (fs.existsSync(EXAMS_DIR)) {
    for (const name of fs.readdirSync(EXAMS_DIR).filter((x) => x.endsWith(".json")).sort()) {
      try {
        const bundle = JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, name), "utf8")) as ExamBundle;
        if (!profiles.some((p) => p.id === bundle.profile.id)) profiles.push(bundle.profile);
      } catch { /* skip invalid local bundles */ }
    }
  }
  return profiles;
}

export function publicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => ({
    id: q.id, year: q.year, level: q.level, grades: q.grades, language: q.language,
    questionNo: q.questionNo, points: q.points, concept: q.concept, stem: q.stem,
    stemEn: q.stemEn, choices: q.choices, choicesEn: q.choicesEn, assetUrl: q.assetUrl, verified: q.verified,
  }));
}
