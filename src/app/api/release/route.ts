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

export async function GET() {
  const root = process.cwd();
  return NextResponse.json({
    ok: true,
    service: "math-competition-lab",
    version: readText(path.join(root, "VERSION")) || "dev",
    deployedSha: readText(path.join(root, ".release", "deployed_sha")) || null,
  });
}
