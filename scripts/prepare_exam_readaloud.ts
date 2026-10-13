/**
 * Build audio worklist from every eligible G1/G2 exam, regardless of organizer.
 * Usage: npx tsx scripts/prepare_exam_readaloud.ts
 */
import fs from "node:fs";
import path from "node:path";
import type { ExamBundle } from "../src/lib/types";
import { normalizeExamProfile } from "../src/lib/competition-format";
import { lowerPrimaryGrade } from "../src/lib/read-aloud-script";
import { examSpeechAsset } from "../src/lib/exam-audio";
import { isExamBundleTrainingReady, trainingQuestions } from "../src/lib/training-question-bank";

const dir = path.join(process.cwd(), "private", "exams");
const tasks = new Map<string, { file: string; url: string; language: string; text: string; questionId: string }>();
const covered: { examId: string; grades: string; questionCount: number }[] = [];
const inactive: { examId: string; grades: string; questionCount: number; reason: string }[] = [];
let skipped = 0;
let missingEnglish = 0;
for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  if (file.includes("before-bilingual")) continue;
  let bundle: ExamBundle;
  try {
    bundle = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as ExamBundle;
    bundle.profile = normalizeExamProfile(bundle.profile);
  } catch { skipped++; continue; }
  const profile = bundle.profile;
  if (!lowerPrimaryGrade(profile.gradesEn || profile.grades || profile.gradesZh || "", profile.gradeBand)) continue;
  if (!isExamBundleTrainingReady(bundle)) {
    inactive.push({ examId: profile.id, grades: profile.grades,
      questionCount: bundle.questions.length, reason: "not_training_ready" });
    skipped++;
    continue;
  }
  const questions = trainingQuestions(bundle.questions);
  covered.push({ examId: profile.id, grades: profile.grades, questionCount: questions.length });
  for (const q of questions) {
    const zh = examSpeechAsset(q.stem, q.choices, "zh");
    if (zh) tasks.set(zh.url, { file: zh.file, url: zh.url, language: "zh", text: zh.text, questionId: q.id });
    if (q.stemEn && q.choicesEn?.length && q.choicesEn.length === q.choices.length &&
        q.choicesEn.every((choice, i) => choice.key === q.choices[i]?.key && choice.label.trim())) {
      const en = examSpeechAsset(q.stemEn, q.choicesEn, "en");
      if (en) tasks.set(en.url, { file: en.file, url: en.url, language: "en", text: en.text, questionId: q.id });
    } else {
      missingEnglish++;
    }
  }
}
const output = path.join(process.cwd(), "reports", "exam-read-aloud-worklist.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ version: 1, covered, inactive, skipped, missingEnglish, tasks: [...tasks.values()] }, null, 2) + "\n");
const outputStats = { eligibleExams: covered.length, inactiveExams: inactive.length, questions: covered.reduce((a, b) => a + b.questionCount, 0), uniqueAudioTracks: tasks.size, missingEnglish, skipped, output };
console.log("EXAM_READ_ALOUD_WORKLIST=" + JSON.stringify(outputStats));
if (!covered.length || !tasks.size) process.exitCode = 1;
