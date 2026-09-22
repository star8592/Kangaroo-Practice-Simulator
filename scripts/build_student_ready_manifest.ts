import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { ExamBundle, Question } from "../src/lib/types";
import { isExamBundleStudentReady } from "../src/lib/question-bank";

const ROOT = process.cwd();
const EXAMS_DIR = path.join(ROOT, "private", "exams");

function sha256(file: string) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

function relative(file: string) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function assetUrls(q: Question) {
  return [
    q.studentAssetUrl,
    q.studentAssetUrlZh,
    q.studentAssetUrlEn,
    q.assetUrl,
    q.assetUrlZh,
    q.assetUrlEn,
  ].filter((x): x is string => Boolean(x));
}

function localAsset(url: string) {
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  const normalized = path.posix.normalize(url);
  if (normalized.includes("..")) {
    throw new Error(`unsafe asset URL: ${url}`);
  }
  const file = path.join(ROOT, "public", normalized.replace(/^\/+/, ""));
  return file;
}

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

type BundleManifest = {
  examId: string;
  examPath: string;
  examSha256: string;
  questionCount: number;
  canonicalSourceVerified: number;
  assets: { path: string; sha256: string }[];
};

const bundles: BundleManifest[] = [];
const missingAssets: string[] = [];

for (const name of fs.readdirSync(EXAMS_DIR).filter((x) => x.endsWith(".json")).sort()) {
  if (name.includes("before-bilingual")) continue;
  const examPath = path.join(EXAMS_DIR, name);
  let bundle: ExamBundle;
  try {
    bundle = JSON.parse(fs.readFileSync(examPath, "utf8")) as ExamBundle;
  } catch {
    continue;
  }
  if (bundle.profile?.country === "Mixed") continue;
  if (!bundle.questions?.length || !isExamBundleStudentReady(bundle)) continue;

  const assets = new Map<string, string>();
  for (const q of bundle.questions) {
    for (const url of assetUrls(q)) {
      const file = localAsset(url);
      if (!file) continue;
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        missingAssets.push(`${name}: ${url} -> ${relative(file)}`);
        continue;
      }
      assets.set(relative(file), sha256(file));
    }
  }

  const canonicalSourceVerified = bundle.questions.filter((q) => {
    const sourceMeta = q.sourceMeta as
      | { canonicalSource?: { status?: string } }
      | undefined;
    return sourceMeta?.canonicalSource?.status === "SOURCE_VERIFIED";
  }).length;

  bundles.push({
    examId: bundle.profile.id || name.replace(/\.json$/, ""),
    examPath: relative(examPath),
    examSha256: sha256(examPath),
    questionCount: bundle.questions.length,
    canonicalSourceVerified,
    assets: [...assets.entries()]
      .map(([assetPath, assetSha256]) => ({ path: assetPath, sha256: assetSha256 }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  });
}

if (missingAssets.length) {
  console.error(JSON.stringify({ missingAssets }, null, 2));
  process.exit(2);
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  gitSha: gitSha(),
  bundleCount: bundles.length,
  questionCount: bundles.reduce((sum, b) => sum + b.questionCount, 0),
  canonicalSourceVerified: bundles.reduce(
    (sum, b) => sum + b.canonicalSourceVerified,
    0,
  ),
  bundles,
};

process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
