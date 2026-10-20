import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, ExamProfile } from "./types";
import { normalizeExamProfile } from "./competition-format";
import { buildSmartBundle, mixedProfiles, parseSmartExamId } from "./mixed-exam";
import seamoG1 from "@/data/seamo-original-mocks/seamo-original-g1-mock-1.json";
import seamoG2 from "@/data/seamo-original-mocks/seamo-original-g2-mock-1.json";

const EXAMS_DIR = path.join(process.cwd(), "private", "exams");
const ORIGINAL_SEAMO_BUNDLES: ExamBundle[] = [seamoG1, seamoG2] as unknown as ExamBundle[];

type BundleGate = (bundle: ExamBundle) => boolean;

type LoadOptions = {
  gate: BundleGate;
  requireReadyDirect?: boolean;
  incompleteMessage?: (examId: string) => string;
  missingMessage?: (examId: string) => string;
};

function safeExamId(examId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(examId)) throw new Error("Invalid exam id");
  return examId;
}

function normalizeBundle(raw: ExamBundle): ExamBundle {
  return { ...raw, profile: normalizeExamProfile(raw.profile) };
}

function loadArchiveBundles(gate: BundleGate): ExamBundle[] {
  const bundles: ExamBundle[] = [];
  if (fs.existsSync(EXAMS_DIR)) {
  for (const name of fs.readdirSync(EXAMS_DIR).filter((x) => x.endsWith(".json")).sort()) {
    if (name.includes("before-bilingual")) continue;
    try {
      const bundle = normalizeBundle(
        JSON.parse(fs.readFileSync(path.join(EXAMS_DIR, name), "utf8")) as ExamBundle,
      );
      if (bundle.profile.country === "Mixed") continue;
      if (gate(bundle)) bundles.push(bundle);
    } catch {}
  }
  }
  for (const raw of ORIGINAL_SEAMO_BUNDLES) {
    const bundle = normalizeBundle(raw);
    if (bundle.profile.competitionId === "seamo" && gate(bundle)) bundles.push(bundle);
  }
  return bundles;
}

export function loadStoredExamBundle(examId: string, options: LoadOptions): ExamBundle {
  const id = safeExamId(examId);
  if (id === "level-a") return loadStoredExamBundle("au-amc-pre-a-sample-1", options);

  const originalSeamo = ORIGINAL_SEAMO_BUNDLES.find(bundle => bundle.profile.id === id);
  if (originalSeamo) {
    const bundle = normalizeBundle(originalSeamo);
    if (options.requireReadyDirect && !options.gate(bundle)) throw new Error(`Training exam is incomplete: ${id}`);
    return bundle;
  }

  const file = path.join(EXAMS_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    const bundle = normalizeBundle(
      JSON.parse(fs.readFileSync(file, "utf8")) as ExamBundle,
    );
    if (options.requireReadyDirect && !options.gate(bundle)) {
      throw new Error(options.incompleteMessage?.(id) || `Exam is incomplete: ${id}`);
    }
    return bundle;
  }

  const smart = parseSmartExamId(id);
  if (smart) {
    return buildSmartBundle(
      smart.baseId,
      smart.seed,
      loadArchiveBundles(options.gate),
    );
  }
  throw new Error(options.missingMessage?.(id) || `Local exam bundle not found: ${id}`);
}

export function listStoredExamProfiles(gate: BundleGate): ExamProfile[] {
  const archives = loadArchiveBundles(gate);
  const profiles: ExamProfile[] = [...mixedProfiles(archives)];
  for (const bundle of archives) {
    if (!profiles.some((profile) => profile.id === bundle.profile.id)) {
      profiles.push({ ...bundle.profile, studentReady: true });
    }
  }
  return profiles;
}
