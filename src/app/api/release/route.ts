import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import type { ExamBundle } from "@/lib/types";

export const dynamic = "force-dynamic";
const COMPETITIONS = ["kangaroo", "australian-amc", "maa-amc", "cemc"] as const;

function readText(file: string) {
  try { return fs.readFileSync(file, "utf8").trim(); } catch { return ""; }
}

function readGitHead(root: string) {
  const gitDir = path.join(root, ".git");
  const head = readText(path.join(gitDir, "HEAD"));
  if (!head) return null;
  if (!head.startsWith("ref: ")) return head;
  const ref = head.slice(5).trim();
  const loose = readText(path.join(gitDir, ref));
  if (loose) return loose;
  const packed = readText(path.join(gitDir, "packed-refs"));
  for (const line of packed.split("\n")) {
    if (!line || line.startsWith("#") || line.startsWith("^")) continue;
    const [sha, name] = line.split(" ");
    if (name === ref) return sha || null;
  }
  return null;
}

function rawInventory(root: string) {
  const dir = path.join(root, "private", "exams");
  const counts = Object.fromEntries(COMPETITIONS.map((id) => [id, 0])) as Record<string, number>;
  let papers = 0;
  let questions = 0;
  try {
    for (const name of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      try {
        const bundle = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as ExamBundle;
        if (bundle.profile?.country === "Mixed") continue;
        papers += 1;
        questions += Array.isArray(bundle.questions) ? bundle.questions.length : 0;
        const id = bundle.profile?.competitionId;
        if (id && id in counts) counts[id] += 1;
      } catch {}
    }
    return { papers, questions, byCompetition: counts };
  } catch {
    return null;
  }
}

function trainingInventory() {
  try {
    const profiles = listTrainingExamProfiles();
    const papers = profiles.filter((profile) => profile.paperType !== "smart");
    return {
      papers: papers.length,
      smartProfiles: profiles.length - papers.length,
      byCompetition: Object.fromEntries(
        COMPETITIONS.map((competitionId) => [competitionId, papers.filter((profile) => profile.competitionId === competitionId).length]),
      ),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const root = process.cwd();
  const deployedSha = readText(path.join(root, ".release", "deployed_sha")) || null;
  return NextResponse.json({
    ok: true,
    service: "math-competition-lab",
    version: readText(path.join(root, "VERSION")) || "dev",
    deployedSha,
    gitSha: readGitHead(root) || deployedSha,
    rawInventory: rawInventory(root),
    trainingInventory: trainingInventory(),
  });
}
