import fs from "node:fs";
import path from "node:path";
import type { PublicQuestion, Question } from "./types";

const BANK_PATH = path.join(process.cwd(), "private", "question-bank.json");

export function loadQuestionBank(): Question[] {
  if (!fs.existsSync(BANK_PATH)) {
    throw new Error(`Local question bank not found: ${BANK_PATH}. Run scripts/import_level_a.py first.`);
  }
  return JSON.parse(fs.readFileSync(BANK_PATH, "utf8")) as Question[];
}

export function publicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => ({
    id: q.id, year: q.year, level: q.level, grades: q.grades, language: q.language,
    questionNo: q.questionNo, points: q.points, concept: q.concept, stem: q.stem,
    stemEn: q.stemEn, choices: q.choices, choicesEn: q.choicesEn, assetUrl: q.assetUrl, verified: q.verified,
  }));
}

export const LEVEL_A_PROFILE = {
  id: "level-a",
  name: "Level A 仿真赛",
  grades: "Grades 1–2",
  durationSeconds: 75 * 60,
  questionCount: 24,
  initialScore: 24,
  maxScore: 120,
};
