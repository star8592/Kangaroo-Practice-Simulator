import fs from "node:fs";
import path from "node:path";
import type { ArithmeticSession } from "./arithmetic-analytics";

const FILE = path.join(process.cwd(), "private", "arithmetic", "sessions.jsonl");

export function loadArithmeticSessions(studentId: string, limit = 500): ArithmeticSession[] {
  if (!studentId || !fs.existsSync(FILE)) return [];
  return fs
    .readFileSync(FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const session = JSON.parse(line) as ArithmeticSession;
        return session.studentId === studentId ? [session] : [];
      } catch {
        return [];
      }
    })
    .slice(-Math.max(1, limit));
}
