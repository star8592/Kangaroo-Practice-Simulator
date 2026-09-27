import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, ExamProfile, PublicQuestion, Question } from "./types";
import { buildSmartBundle, mixedProfiles, parseSmartExamId } from "./mixed-exam";
import { normalizeExamProfile } from "./competition-format";

const EXAMS_DIR = path.join(process.cwd(), "private", "exams");
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function safeExamId(examId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(examId)) throw new Error("Invalid exam id");
  return examId;
}

function hasVisual(q: Question) {
  return Boolean(q.studentAssetUrl || q.studentAssetUrlZh || q.studentAssetUrlEn || q.assetUrl || q.assetUrlZh || q.assetUrlEn);
}

function normalizeBundle(raw: ExamBundle): ExamBundle {
  return { ...raw, profile: normalizeExamProfile(raw.profile) };
}

/** Authenticated private-training gate; independent of public distribution flags. */
export function isTrainingReadyQuestion(q: Question) {
  if (q.examReady === false || q.review?.needsReview === true || !text(q.answer)) return false;
  if (!text(q.stem) && !text(q.stemEn) && !text(q.localized?.zh?.stem) && !text(q.localized?.en?.stem) && !hasVisual(q)) return false;
  const mode = q.answerMode || (q.choices?.length ? "choice" : "integer");
  if (mode === "choice") {
    const keys = new Set((q.choices || []).map((choice) => text(choice.key)).filter(Boolean));
    if (keys.size < 2 || !keys.has(text(q.answer))) return false;
  }
  return true;
}

export function isExamBundleTrainingReady(bundle: ExamBundle) {
  return Boolean(bundle.profile.id && bundle.profile.questionCount > 0 && bundle.questions.length === bundle.profile.questionCount && bundle.questions.every(isTrainingReadyQuestion));
}

function loadTrainingArchiveBundles(): ExamBundle[] {
  if (!fs.existsSync(EXAMS_DIR)) return [];
  const bundles: ExamBundle[] = [];
  for (const name of fs.readdirSync(EXAMS_DIR).filter((x) => x.endsWith(".json")).sort()) {
    if (name.includes("before-bilingual")) continue;
    try {
      const bundle = normalizeBundle(JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, name), "utf8")) as ExamBundle);
      if (bundle.profile.country === "Mixed") continue;
      if (isExamBundleTrainingReady(bundle)) bundles.push(bundle);
    } catch {}
  }
  return bundles;
}

export function loadTrainingExamBundle(examId: string): ExamBundle {
  const id = safeExamId(examId);
  if (id === "level-a") return loadTrainingExamBundle("au-amc-pre-a-sample-1");
  const file = path.join(EXAMS_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    const bundle = normalizeBundle(JSON.parse(fs.readFileSync(file, "utf8")) as ExamBundle);
    if (!isExamBundleTrainingReady(bundle)) throw new Error(`Training exam is incomplete: ${id}`);
    return bundle;
  }
  const smart = parseSmartExamId(id);
  if (smart) return buildSmartBundle(smart.baseId, smart.seed, loadTrainingArchiveBundles());
  throw new Error(`Local training exam bundle not found: ${id}`);
}

export function listTrainingExamProfiles(): ExamProfile[] {
  const archives = loadTrainingArchiveBundles();
  const profiles: ExamProfile[] = [...mixedProfiles(archives)];
  for (const bundle of archives) {
    if (!profiles.some((profile) => profile.id === bundle.profile.id)) profiles.push({ ...bundle.profile, studentReady: true });
  }
  return profiles;
}

export function trainingQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => {
    if (!isTrainingReadyQuestion(q)) throw new Error(`Question ${q.id} is not training-ready`);
    const zh = q.localized?.zh;
    const en = q.localized?.en;
    const commonVisual = q.studentAssetUrl || q.assetUrl;
    return {
      id: q.id,
      year: q.year,
      level: q.level,
      grades: q.grades,
      language: q.language,
      questionNo: q.questionNo,
      points: q.points,
      answerMode: q.answerMode,
      concept: q.concept,
      stem: text(zh?.stem) || text(q.stem) || "请查看下方原题图。",
      stemEn: text(en?.stem) || text(q.stemEn) || text(q.stem) || "See the problem image below.",
      choices: zh?.choices?.length ? zh.choices : q.choices,
      choicesEn: en?.choices?.length ? en.choices : q.choicesEn?.length ? q.choicesEn : q.choices,
      assetUrl: commonVisual,
      assetUrlZh: q.studentAssetUrlZh || q.assetUrlZh || commonVisual,
      assetUrlEn: q.studentAssetUrlEn || q.assetUrlEn || commonVisual,
      verified: Boolean(q.verified || q.review?.verified),
    };
  });
}
