import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readText(file: string) {
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
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

export async function GET() {
  const root = process.cwd();
  return NextResponse.json({
    ok: true,
    service: "math-competition-lab",
    version: readText(path.join(root, "VERSION")) || "dev",
    deployedSha: readText(path.join(root, ".release", "deployed_sha")) || null,
    gitSha: readGitHead(root),
  });
}
