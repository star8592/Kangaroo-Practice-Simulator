import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, ExamProfile, PublicQuestion, Question } from "./types";
import { buildSmartBundle, mixedProfiles, parseSmartExamId } from "./mixed-exam";
import { normalizeExamProfile } from "./competition-format";

const BANK_PATH = path.join(process.cwd(), "private", "question-bank.json");
const EXAMS_DIR = path.join(process.cwd(), "private", "exams");
const RIGHTS_REGISTRY_PATH = path.join(
  process.cwd(),
  "private",
  "source-registry",
  "competition_sources.json",
);

type RightsRegistry = {
  sources?: Array<{ id?: string; rights?: { publicQuestionDisplay?: boolean } }>;
};

let publicRightsBySource: Map<string, boolean> | null = null;

function sourceAllowsPublicQuestionDisplay(sourceRegistryId: unknown) {
  if (typeof sourceRegistryId !== "string" || !sourceRegistryId.trim()) return true;
  if (!publicRightsBySource) {
    publicRightsBySource = new Map<string, boolean>();
    try {
      const registry = JSON.parse(
        fs.readFileSync(RIGHTS_REGISTRY_PATH, "utf8"),
      ) as RightsRegistry;
      for (const source of registry.sources || []) {
        if (source.id) {
          publicRightsBySource.set(
            source.id,
            source.rights?.publicQuestionDisplay === true,
          );
        }
      }
    } catch {
      // Conservative failure: a declared source cannot be published when its
      // registry is unavailable or malformed.
    }
  }
  return publicRightsBySource.get(sourceRegistryId) === true;
}

function safeExamId(examId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(examId)) throw new Error("Invalid exam id");
  return examId;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasCjk(value: unknown) {
  return /[\u3400-\u9fff]/.test(text(value));
}

function hasBilingualText(q: Question) {
  return Boolean(text(q.localized?.zh?.stem) && text(q.localized?.en?.stem));
}

function hasVisual(q: Question) {
  return Boolean(
    q.studentAssetUrl ||
      q.studentAssetUrlZh ||
      q.studentAssetUrlEn ||
      q.assetUrl ||
      q.assetUrlZh ||
      q.assetUrlEn,
  );
}

function hasChineseDelivery(q: Question) {
  if (text(q.localized?.zh?.stem)) return true;
  if (hasCjk(q.stem)) return true;
  // Official bilingual source images are allowed when the bundle explicitly
  // declares zh/en and the question has a visual carrying the source content.
  if (q.language === "zh/en" && hasVisual(q)) return true;
  return false;
}

function hasEnglishDelivery(q: Question) {
  if (text(q.localized?.en?.stem)) return true;
  if (text(q.stemEn)) return true;
  if (q.language === "zh/en" && hasVisual(q)) return true;
  return false;
}

function needsVisual(q: Question) {
  const zh = text(q.localized?.zh?.stem) || text(q.stem);
  const en = text(q.localized?.en?.stem) || text(q.stemEn);
  const combined = `${zh} ${en}`.toLowerCase();
  return (
    combined.includes("image below") ||
    combined.includes("problem shown below") ||
    combined.includes("原题图") ||
    combined.includes("题图") ||
    combined.includes("下图")
  );
}

/**
 * Student delivery gate.
 *
 * Chinese is the product default. A raw English-only question is source material,
 * not a student-ready question. It must be localized before it can enter an exam.
 */
export function isStudentReady(q: Question) {
  if (!hasChineseDelivery(q) || !hasEnglishDelivery(q)) return false;
  if (q.review?.needsReview === true) return false;
  if (q.review?.visualVerified === false) return false;
  if (needsVisual(q) && !hasVisual(q)) return false;

  // Non-official source languages and migrated English-only sources must pass the
  // explicit bilingual review gate. Legacy official zh/en bundles remain valid.
  if (q.language !== "zh/en") {
    return Boolean(
      q.examReady &&
        hasBilingualText(q) &&
        q.review?.translationStatus === "reviewed" &&
        q.review?.visualVerified === true,
    );
  }

  return true;
}

export function loadQuestionBank(): Question[] {
  if (!fs.existsSync(BANK_PATH)) {
    throw new Error(`Local question bank not found: ${BANK_PATH}`);
  }
  return JSON.parse(fs.readFileSync(BANK_PATH, "utf8")) as Question[];
}

export function isExamBundleStudentReady(bundle: ExamBundle) {
  if (bundle.profile.studentReady === false) return false;
  if (!sourceAllowsPublicQuestionDisplay(bundle.profile.sourceRegistryId)) return false;
  return Boolean(bundle.questions.length && bundle.questions.every(isStudentReady));
}

function normalizeBundle(raw: ExamBundle): ExamBundle {
  return { ...raw, profile: normalizeExamProfile(raw.profile) };
}

function loadReadyArchiveBundles(): ExamBundle[] {
  if (!fs.existsSync(EXAMS_DIR)) return [];
  const bundles: ExamBundle[] = [];
  for (const name of fs
    .readdirSync(EXAMS_DIR)
    .filter((x) => x.endsWith(".json"))
    .sort()) {
    if (name.includes("before-bilingual")) continue;
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(EXAMS_DIR, name), "utf8"),
      ) as ExamBundle;
      const bundle = normalizeBundle(raw);
      if (bundle.profile.country === "Mixed") continue;
      if (isExamBundleStudentReady(bundle)) bundles.push(bundle);
    } catch {}
  }
  return bundles;
}

export function loadExamBundle(examId: string): ExamBundle {
  const id = safeExamId(examId);
  if (id === "level-a") return loadExamBundle("au-amc-pre-a-sample-1");
  const file = path.join(EXAMS_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    return normalizeBundle(
      JSON.parse(fs.readFileSync(file, "utf8")) as ExamBundle,
    );
  }
  const smart = parseSmartExamId(id);
  if (smart) {
    return buildSmartBundle(
      smart.baseId,
      smart.seed,
      loadReadyArchiveBundles(),
    );
  }
  throw new Error(`Local exam bundle not found: ${id}`);
}

export function listExamProfiles(): ExamProfile[] {
  const archives = loadReadyArchiveBundles();
  const profiles: ExamProfile[] = [...mixedProfiles(archives)];
  for (const bundle of archives) {
    if (!profiles.some((p) => p.id === bundle.profile.id)) {
      profiles.push({ ...bundle.profile, studentReady: true });
    }
  }
  return profiles;
}

export function publicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => {
    if (!isStudentReady(q)) {
      throw new Error(`Question ${q.id} is not bilingual student-ready`);
    }

    const localized = hasBilingualText(q);
    const zh = q.localized?.zh;
    const en = q.localized?.en;
    const commonVisual = q.studentAssetUrl || q.assetUrl;
    const zhVisual =
      q.studentAssetUrlZh || q.assetUrlZh || commonVisual;
    const enVisual =
      q.studentAssetUrlEn || q.assetUrlEn || commonVisual;

    const stem =
      text(zh?.stem) ||
      (hasCjk(q.stem) ? q.stem : "请查看下方中英双语原题图。");
    const stemEn =
      text(en?.stem) ||
      text(q.stemEn) ||
      "See the bilingual problem image below.";

    return {
      id: q.id,
      year: q.year,
      level: q.level,
      grades: q.grades,
      language: "zh/en",
      questionNo: q.questionNo,
      points: q.points,
      answerMode: q.answerMode,
      concept: localized ? "official_original" : q.concept,
      stem,
      stemEn,
      choices: zh?.choices?.length ? zh.choices : q.choices,
      choicesEn: en?.choices?.length
        ? en.choices
        : q.choicesEn?.length
          ? q.choicesEn
          : q.choices,
      assetUrl: commonVisual,
      assetUrlZh: zhVisual,
      assetUrlEn: enVisual,
      verified: Boolean(q.verified || q.review?.verified),
    };
  });
}
