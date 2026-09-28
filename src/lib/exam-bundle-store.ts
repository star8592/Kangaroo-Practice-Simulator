import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, ExamProfile } from "./types";
import { normalizeExamProfile } from "./competition-format";
import { buildSmartBundle, mixedProfiles, parseSmartExamId } from "./mixed-exam";

const EXAMS_DIR = path.join(process.cwd(), "private", "exams");

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

export function loadArchiveBundles(gate: BundleGate): ExamBundle[] {
  if (!fs.existsSync(EXAMS_DIR)) return [];
  const bundles: ExamBundle[] = [];
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
  return bundles;
}

export function loadStoredExamBundle(examId: string, options: LoadOptions): ExamBundle {
  const id = safeExamId(examId);
  if (id === "level-a") return loadStoredExamBundle("au-amc-pre-a-sample-1", options);

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
