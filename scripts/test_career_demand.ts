import {getCareerSupplyCandidates,careerSupplyCoverage} from "../src/lib/career-product-mapper";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CAREER_FAMILIES,CAREER_DEMAND_OBSERVED_AT,
  validateCareerDemandSignals,listCareerDemandFamilies,
  searchCareerDemand,countCareerEvidence
} from "../src/lib/career-demand";

assert.deepEqual(validateCareerDemandSignals(),[]);
const counts=countCareerEvidence();
assert(counts.signals>=20,"too few observed signals");
assert(counts.employers>=4,"must cover multiple employers");
assert(counts.families>=12,"must cover broad careers, not only programming");
assert(counts.detailedJobs>=4,"need actual job descriptions, not only categories");
assert(/^20\d{2}-\d{2}-\d{2}$/.test(CAREER_DEMAND_OBSERVED_AT));

const groups=listCareerDemandFamilies();
const byId=new Map(groups.map(x=>[x.id,x]));
assert(byId.has("sales"));
assert(byId.has("finance"));
assert(byId.has("operations"));
assert(byId.has("product"));
assert(byId.has("procurement"));
assert(byId.has("design"));
assert(byId.has("hr"));
assert(byId.has("legal"));
assert(byId.has("ai"));
assert(byId.has("data"));
assert(CAREER_FAMILIES.length>=counts.families);
assert(searchCareerDemand("美团").length>=5);
assert(searchCareerDemand("采购").some(x=>x.id==="procurement"));
assert(searchCareerDemand("供应链").some(x=>x.id==="supply"));
assert(searchCareerDemand("Agent").some(x=>x.id==="ai"));
assert.equal(searchCareerDemand("anything", "nonexisting").length,0);
assert.equal(searchCareerDemand("", "sales").length,1);
assert.equal(searchCareerDemand("not_a_known_job_zzz").length,0);

for (const group of groups) {
  assert(group.signals.length>0);
  assert(group.ideas.length>=2);
  assert(group.employers.length>0);
  assert(group.signals.every(x=>x.roleFamily===group.id));
  assert(group.signals.every(x=>x.evidenceLevel==="job"||x.skills.length===0),
    "do not invent skills from role category pages");
}
const coverage=careerSupplyCoverage();
assert(coverage.groupsWithJobEvidence>=4);
assert(coverage.groupsWithCandidates>=4);
assert(coverage.candidates>=10);
assert.equal(getCareerSupplyCandidates("finance").length,0,"finance category alone does not justify exam SKUs");
assert.equal(getCareerSupplyCandidates("games").length,0,"games category alone does not justify exam SKUs");
assert(getCareerSupplyCandidates("sales").length>0,"industrial sales JDs produce evidence-backed hypotheses");
assert(getCareerSupplyCandidates("software").length>0,"industrial test JDs support specific exercises");
assert(getCareerSupplyCandidates("procurement").some(x=>x.skillCode==="supplier_selection"));
assert(getCareerSupplyCandidates("data").some(x=>x.skillCode==="sql"));
assert(getCareerSupplyCandidates("ai").some(x=>x.skillCode==="rag"));
for(const group of groups){
  for(const candidate of getCareerSupplyCandidates(group.id)){
    assert.equal(candidate.readiness,"proposal");
    assert(candidate.evidenceCount>0);
    assert(candidate.sourceUrls.every(url=>url.startsWith("https://")));
  }
}
const page=fs.readFileSync(path.join(process.cwd(),"src/app/career/page.tsx"),"utf8");
assert(page.includes("searchCareerDemand"));
assert(page.includes("getCareerSupplyCandidates"));
assert(page.includes("规划中 · 非企业官方考题"));
assert(!page.includes('href="/shop"'),"no unverified checkout link");
const portal=fs.readFileSync(path.join(process.cwd(),"src/components/AssessmentPortalClient.tsx"),"utf8");
assert(portal.includes('href="/career"'),"public catalogue must have route");
console.log("CAREER_DEMAND_TEST=PASS",JSON.stringify(counts));
