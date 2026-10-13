import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Choice } from "./types";
import { buildReadAloudText } from "./read-aloud-script";

export const EXAM_READ_ALOUD_VERSION = "v1";

export function examSpeechAsset(stem: string, choices: Choice[], language: "zh" | "en") {
  const script = buildReadAloudText(stem, choices, language);
  if (!script.trim()) return null;
  const digest = createHash("sha256")
    .update(EXAM_READ_ALOUD_VERSION + "\n" + language + "\n" + script, "utf8")
    .digest("hex");
  const filename = language + "-" + digest + ".mp3";
  return {
    text: script,
    file: path.join(process.cwd(), "public", "exam-read-aloud", EXAM_READ_ALOUD_VERSION, filename),
    url: "/exam-read-aloud/" + EXAM_READ_ALOUD_VERSION + "/" + filename,
  };
}

export function availableExamSpeech(stem: string, choices: Choice[], language: "zh" | "en") {
  const asset = examSpeechAsset(stem, choices, language);
  return asset && existsSync(asset.file) ? asset.url : undefined;
}
