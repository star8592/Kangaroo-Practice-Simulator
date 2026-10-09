import assert from "node:assert/strict";
import { WORLD_COMPETITIONS, WORLD_REGION_OPTIONS } from "../src/lib/world-competitions";
import { COMPETITION_COMPANIONS, getWorldCompanion } from "../src/lib/competition-companion";

assert.equal(WORLD_COMPETITIONS.length, 10);
assert.equal(new Set(WORLD_COMPETITIONS.map(x => x.id)).size, 10);
assert.equal(WORLD_COMPETITIONS.filter(x=>x.region==="CN").length, 5);
assert.equal(WORLD_COMPETITIONS.filter(x=>x.region!=="CN").length, 5);
assert.deepEqual(WORLD_COMPETITIONS.slice(0,4).map(x=>x.region), ["global","CN","AU","CN"]);
assert.ok(WORLD_REGION_OPTIONS.some(x=>x.value==="all"));
for (const event of WORLD_COMPETITIONS) {
  assert.ok(event.nameZh.length>2);
  assert.ok(event.nameEn.length>2);
  assert.ok(event.sourceUrl.startsWith("https://"));
  const companion = getWorldCompanion(event.id,"2026-10-09");
  assert.ok(companion,"missing companion: "+event.id);
  assert.ok(COMPETITION_COMPANIONS.includes(companion),"progress endpoint would reject companion "+event.id);
  assert.ok(companion.tasks.length>=4);
  if(companion.registrationVerified===false) {
    assert.ok(companion.tasks.every(task=>task.kind==="site"&&!task.date),
      "unverified event has false official task/deadline: "+event.id);
  }
}
assert.equal(getWorldCompanion("not-a-real-competition","2026-10-09"),null);
assert.equal(getWorldCompanion("australian-amc","2026-10-09")?.id,"australian-amc-china-2026-online-pab");
assert.equal(getWorldCompanion("australian-amc","2026-10-12")?.id,"world-australian-amc-readiness");
console.log("WORLD_COMPANION_PASS events=10 china=5 other=5 unified_progress=10");
