import fs from "node:fs";
import path from "node:path";
import type { SolutionStoryboard, SolutionScene } from "@/lib/solution-storyboard";

type StoredStoryboard = {
  version?: number;
  questionId?: string;
  quality?: string;
  verification?: {
    officialAnswerMatched?: boolean;
    solverAgreement?: boolean;
    confidence?: number;
  };
  scenes?: SolutionScene[];
};

const DIR = path.join(process.cwd(), "private", "solutions");

function safeQuestionId(value: string) {
  return /^[A-Za-z0-9._:-]{1,180}$/.test(value);
}

function validScene(scene: SolutionScene) {
  return Boolean(
    scene &&
    typeof scene.id === "string" &&
    typeof scene.title === "string" &&
    typeof scene.narration === "string" &&
    scene.visual &&
    typeof scene.visual.type === "string"
  );
}

export function loadVerifiedSolution(questionId: string): SolutionStoryboard | null {
  if (!safeQuestionId(questionId)) return null;
  const file = path.join(DIR, questionId + ".json");
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as StoredStoryboard;
    const verification = raw.verification;
    if (
      raw.version !== 1 ||
      raw.quality !== "verified" ||
      !verification?.officialAnswerMatched ||
      !verification?.solverAgreement ||
      typeof verification.confidence !== "number" ||
      verification.confidence < 0.65 ||
      !Array.isArray(raw.scenes) ||
      raw.scenes.length < 2 ||
      raw.scenes.length > 12 ||
      !raw.scenes.every(validScene)
    ) return null;

    return {
      version: 1,
      quality: "verified",
      requiresGeneration: false,
      scenes: raw.scenes,
    };
  } catch {
    return null;
  }
}
