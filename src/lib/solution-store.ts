import fs from "node:fs";
import path from "node:path";
import type { SolutionStoryboard, SolutionScene } from "@/lib/solution-storyboard";
import grade1Bundle from "../../data/verified-solutions/grade1-v1.json";

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
const GRADE1_NARRATION_VERSION = "v1";
const BUNDLED_GRADE1 = (grade1Bundle as unknown as { solutions: Record<string, StoredStoryboard> }).solutions;

function withDeployableAudio(questionId: string, scenes: SolutionScene[]) {
  return scenes.map((scene, index) => {
    if (BUNDLED_GRADE1[questionId]) {
      const filename = `scene-${String(index + 1).padStart(2, "0")}.mp3`;
      const relative = path.join("grade1-narration", GRADE1_NARRATION_VERSION, questionId, filename);
      const absolute = path.join(process.cwd(), "public", relative);
      if (fs.existsSync(absolute)) {
        return { ...scene, audioUrl: `/${relative.split(path.sep).join("/")}` };
      }
    }
    if (scene.audioUrl?.startsWith("/generated-solutions/")) {
      const absolute = path.join(process.cwd(), "public", scene.audioUrl.slice(1));
      if (!fs.existsSync(absolute)) {
        const { audioUrl: _audioUrl, ...rest } = scene;
        void _audioUrl;
        return rest;
      }
    }
    return scene;
  });
}

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
  const bundled = BUNDLED_GRADE1[questionId];
  const file = path.join(DIR, questionId + ".json");
  if (!bundled && !fs.existsSync(file)) return null;
  try {
    const raw = bundled || JSON.parse(fs.readFileSync(file, "utf8")) as StoredStoryboard;
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
      scenes: withDeployableAudio(questionId, raw.scenes),
    };
  } catch {
    return null;
  }
}
