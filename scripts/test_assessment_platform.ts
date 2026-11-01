import { GET as getAssessmentCatalog } from "../src/app/api/assessments/catalog/route";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ASSESSMENT_DOMAINS, LIVE_ASSESSMENT_DOMAINS,
  PLANNED_ASSESSMENT_DOMAINS, validateAssessmentCatalog, getAssessmentDomain } from "../src/lib/assessment-platform";
import { publishableItemErrors,hasValidBlueprintItems,
  type AssessmentItemContract, type AssessmentBlueprintContract } from "../src/lib/assessment-core-contract";

async function main() {
assert.deepEqual(validateAssessmentCatalog(),[]);
const response = getAssessmentCatalog();
assert.equal(response.status,200);
const payload = await response.json();
assert.equal(payload.liveDomains,4);
assert.equal(payload.domains.length,7);
assert(!JSON.stringify(payload).includes("users.json"));
assert.equal(ASSESSMENT_DOMAINS.length,7);
assert.equal(LIVE_ASSESSMENT_DOMAINS.length,4);
assert.equal(PLANNED_ASSESSMENT_DOMAINS.length,3);
assert.equal(getAssessmentDomain("career")?.readiness,"live");
assert.equal(getAssessmentDomain("interest")?.readiness,"live");
assert.equal(getAssessmentDomain("math-competition")?.readiness,"live");
for(const domain of ASSESSMENT_DOMAINS){
  assert(domain.formats.length>0);
  if(domain.readiness==="planned") assert.equal(domain.liveRoutes.length,0,
    "unlaunched category must not promote a fake product");
  for(const route of domain.liveRoutes){
    const page=path.join(process.cwd(),"src/app",route.href.slice(1),"page.tsx");
    assert(fs.existsSync(page),"real route required: "+route.href);
    assert(!route.href.includes("admin"),"admin must never be linked from public catalogue");
  }
}
const template:AssessmentItemContract={
  id:"original-math-sample-1",revision:1,domain:"school",format:"numeric",
  stem:"What is 1+1?",quality:"publishable",
  answerEvidenceId:"checked-math-answer",scoringRubricVersion:"rubric-v1",
  source:{sourceId:"original-1",rights:"original",retrievedAt:new Date().toISOString(),
    originalHash:"0".repeat(64)},
};
assert.deepEqual(publishableItemErrors(template),[]);
assert(publishableItemErrors({...template,source:{...template.source,rights:"unverified"}})
  .includes("rights-not-public"));
assert(publishableItemErrors({...template,source:{...template.source,rights:"private-only"}})
  .includes("rights-not-public"));
assert(publishableItemErrors({...template,quality:"extracted"}).includes("quality-unverified"));
assert(publishableItemErrors({...template,source:{...template.source,rights:"licensed"}})
  .includes("license-unverified"));
const blueprint:AssessmentBlueprintContract={
  id:"original-school-math",revision:1,domain:"school",title:"Math sample",
  itemRefs:[{id:template.id,revision:1}],gradingMode:"deterministic",totalPoints:1,
};
assert.equal(hasValidBlueprintItems(blueprint,[template]),true);
assert.equal(hasValidBlueprintItems({...blueprint,itemRefs:[{id:template.id,revision:2}]},[template]),false);
assert.equal(hasValidBlueprintItems({...blueprint,domain:"career"},[template]),false);
console.log("SOCTHINK_PLATFORM_FOUNDATION=PASS domains=7 live=4 planned=3 rights_gate=PASS real_links=PASS version_gate=PASS");

}
main().catch(e=>{ console.error(e); process.exitCode=1; });
