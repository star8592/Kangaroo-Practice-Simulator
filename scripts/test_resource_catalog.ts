import assert from "node:assert/strict";
import {buildTrainingResourceCatalog, filterTrainingResources} from "../src/lib/resource-catalog";
import type {ExamProfile} from "../src/lib/types";

const base:ExamProfile = {
  id:"au-amc-2024-primary",name:"AMC 2024 primary",
  nameZh:"2024 澳洲 AMC 小学组",
  grades:"Grade 5-6",gradesZh:"五六年级",gradeBand:"5-6",
  durationSeconds:3600,questionCount:30,initialScore:0,maxScore:135,
  wrongPenaltyMode:"fixed",wrongPenaltyValue:0,year:2024,
  paperType:"past",competitionId:"australian-amc",
  rightsPolicy:{rightsClass:"unreviewed",commercialUse:false,publicQuestionDisplay:false},
  sourceLabel:"internal-source-location-not-for-public-metadata",
};
const another:ExamProfile = {
  ...base,id:"maa-2023-amc8",name:"AMC8 2023 sample",nameZh:"美国 AMC8 样题",
  competitionId:"maa-amc",paperType:"sample",year:2023,gradeBand:"7-8",
  grades:"Grade 7-8",gradesZh:"七八年级",questionCount:25,durationSeconds:0,
};
const rows=buildTrainingResourceCatalog([base, another,base,
  {...base,id:"",questionCount:30},
  {...base,id:"incomplete",questionCount:0},
]);
assert.equal(rows.length,2,"deduplicates and excludes missing/invalid metadata");
assert.equal(rows[0].titleZh,"2024 澳洲 AMC 小学组");
assert.equal(rows[0].examUrl,"/exam/au-amc-2024-primary");
assert.equal(rows[0].durationMinutes,60);
assert.equal(rows[1].durationMinutes,null,"untimed is never invented");
assert.equal(rows[1].paperType,"sample","must not mislabel a sample as a real past paper");
assert.ok(!JSON.stringify(rows).includes("internal-source-location"),"source paths are not public");
assert.ok(!JSON.stringify(rows).includes("rightsPolicy"),"internal licensing notes are not leaked");
assert.ok(!JSON.stringify(rows).includes("price"),"training readiness does not imply sellable SKU");
assert.equal(filterTrainingResources(rows,{query:"AMC",gradeBand:"5-6"}).length,1);
assert.equal(filterTrainingResources(rows,{competition:"maa-amc"}).length,1);
assert.equal(filterTrainingResources(rows,{paperType:"past"}).length,1);
assert.equal(filterTrainingResources(rows,{query:"2023"}).length,1);
assert.equal(filterTrainingResources(rows,{query:"中文词不匹配"}).length,0);
assert.equal(filterTrainingResources(rows,{}).length,2);
console.log("RESOURCE_CATALOG_SEARCH=PASS (metadata, rights separation, filters, direct exam URL)");
