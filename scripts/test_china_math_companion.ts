import assert from "node:assert/strict";
import { CHINA_MATH_EVENTS, NATIONAL_LIST_URL } from "../src/lib/china-math-competitions";
import { CHINA_MATH_COMPANIONS } from "../src/lib/china-math-companion";
import { COMPETITION_COMPANIONS, companionTaskState } from "../src/lib/competition-companion";

assert.equal(CHINA_MATH_EVENTS.length, 5, "five domestic programmes expected");
assert.equal(new Set(CHINA_MATH_EVENTS.map(x => x.id)).size, CHINA_MATH_EVENTS.length);
assert.equal(CHINA_MATH_EVENTS.filter(x => x.status === "national-list").map(x => x.id).join(","), "cmo");
assert.ok(NATIONAL_LIST_URL.startsWith("https://www.moe.gov.cn/"));

for (const row of CHINA_MATH_EVENTS) {
  assert.match(row.nameZh, /[\u4e00-\u9fff]/);
  assert.equal(row.verifiedOn, "2026-10-09");
  assert.ok(row.sourceUrl.startsWith("https://"));
  const plan = CHINA_MATH_COMPANIONS.find(x => x.id === row.companionId);
  assert.ok(plan, "companion must be present: " + row.id);
  assert.equal(plan.registrationVerified, false, "unverified registration must never be treated as active");
  assert.equal(plan.mode, "varies", "mode remains TBD until verified");
  assert.equal(plan.tasks.length, 5);
  assert.equal(new Set(plan.tasks.map(x => x.id)).size, 5);
  for (const step of plan.tasks) {
    assert.equal(step.kind, "site", "unverified dates cannot be called official arrangements");
    assert.equal(step.date, undefined, "never invent an event date");
    assert.equal(companionTaskState(step, "2026-10-09"), "upcoming");
  }
  assert.ok(COMPETITION_COMPANIONS.some(x => x.id === plan.id), "progress endpoint must resolve companion");
}
const amc = COMPETITION_COMPANIONS.find(x => x.competitionId === "australian-amc");
assert.ok(amc, "existing Australian AMC companion must be preserved");
assert.equal(amc.tasks.some(x => x.kind === "official" && !!x.date), true);
console.log("china competition companion: 5 entries, 25 advisory steps, no fabricated dates; existing AMC retained");
