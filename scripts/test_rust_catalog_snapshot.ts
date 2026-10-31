import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildTrainingResourceCatalog } from "../src/lib/resource-catalog";
import type { ExamProfile } from "../src/lib/types";

const fixture = JSON.parse(fs.readFileSync(
  path.join(process.cwd(),"backend/socthink-core/tests/fixtures/catalog.json"),
  "utf8",
));
const original: ExamProfile = {
  id:"au-amc-2024-primary",name:"AMC 2024 primary",
  nameZh:"2024 澳洲 AMC 小学组",nameEn:"AMC 2024 primary",
  grades:"Grade 5-6",gradesZh:"五六年级",gradesEn:"Grade 5-6",gradeBand:"5-6",
  durationSeconds:3600,questionCount:30,initialScore:0,maxScore:135,
  wrongPenaltyMode:"fixed",wrongPenaltyValue:0,year:2024,
  paperType:"past",competitionId:"australian-amc",
  rightsPolicy:{rightsClass:"unreviewed",commercialUse:false,publicQuestionDisplay:false},
  sourceLabel:"PRIVATE_SOURCE_MUST_NEVER_ESCAPE",
};
const sample: ExamProfile = {
  ...original,id:"maa-2023-amc8",name:"AMC8 2023 sample",
  nameZh:"美国 AMC8 样题",nameEn:"AMC8 2023 sample",
  competitionId:"maa-amc",paperType:"sample",year:2023,gradeBand:"7-8",
  grades:"Grade 7-8",gradesZh:"七八年级",gradesEn:"Grade 7-8",
  questionCount:25,durationSeconds:0,
};
const generated=buildTrainingResourceCatalog([original,sample]);
assert.equal(fixture.version,1);
assert.deepEqual(generated,fixture.rows,"Rust snapshot fixture must equal exact TypeScript ResourceListing schema");
assert.ok(!JSON.stringify(generated).includes("PRIVATE_SOURCE_MUST_NEVER_ESCAPE"));
assert.ok(!JSON.stringify(generated).includes("rightsPolicy"));
assert.ok(!JSON.stringify(generated).includes("answer"));
assert.ok(!JSON.stringify(generated).includes("price"));
console.log("RUST_CATALOG_SNAPSHOT_PARITY=PASS rows="+generated.length);
