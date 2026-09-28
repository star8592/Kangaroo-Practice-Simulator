import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, Question } from "./types";
import { listStoredExamProfiles, loadStoredExamBundle } from "./exam-bundle-store";

const BANK_PATH = path.join(process.cwd(), "private", "question-bank.json");
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

export function loadExamBundle(examId: string): ExamBundle {
  return loadStoredExamBundle(examId, { gate: isExamBundleStudentReady });
}

export function listExamProfiles() {
  return listStoredExamProfiles(isExamBundleStudentReady);
}
