"use strict";
import { loadUsers, createSessionToken, SESSION_COOKIE } from "../src/lib/auth";
import { loadArithmeticSessions } from "../src/lib/arithmetic-session-store";

const base = process.env.BASE_URL || "http://127.0.0.1:3027";

async function main() {
  const user = loadUsers().find((x) => x.active && x.role === "student" && x.grade >= 1 && x.grade <= 6);
  if (!user) throw new Error("no active student available for arithmetic print smoke test");

  const token = createSessionToken(user.id, 60);
  const response = await fetch(`${base}/arithmetic/print?grade=${user.grade}`, {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
    redirect: "manual",
  });
  const html = await response.text();

  if (response.status !== 200) throw new Error(`print route returned ${response.status}`);
  if (!html.includes("智能个性化（默认）")) throw new Error("smart print mode missing");
  if (!html.includes("PERSONALIZED FOR")) throw new Error("personalization panel missing");

  const questionCount = (html.match(/class="print-question"/g) || []).length;
  const sheetCount = (html.match(/class="a4-sheet/g) || []).length;
  if (questionCount !== 200) throw new Error(`expected 200 default questions, got ${questionCount}`);
  if (sheetCount !== 10) throw new Error(`expected 10 default pages including answers, got ${sheetCount}`);

  const sessions = loadArithmeticSessions(user.id, 500);
  console.log("ARITHMETIC_PRINT_LIVE=PASS", JSON.stringify({ status: response.status, grade: user.grade, boundSessions: sessions.length, questionCount, sheetCount }));
}

main().catch((error) => { console.error(error); process.exit(1); });
