import assert from "node:assert/strict";
import fs from "node:fs";
import {NextRequest} from "next/server";
import {CAREER_MARKET_GROWTH,getCareerMarketGrowth,validateCareerMarketGrowth}
  from "../src/lib/career-market-growth";
import {CAREER_FAMILIES,listCareerDemandFamilies}
  from "../src/lib/career-demand";
import {CAREER_ORIGINAL_GUIDES,getCareerGuide,guideForFamily,
  careerGuideToMarkdown,validateCareerGuides} from "../src/lib/career-original-guides";
import {CAREER_PRACTICE_CASES,getCareerPractice} from "../src/lib/career-practice";
import {GET} from "../src/app/career/guides/[id]/download/route";

assert.deepEqual(validateCareerMarketGrowth(),[]);
assert.equal(CAREER_MARKET_GROWTH.length,4);
assert.deepEqual(CAREER_MARKET_GROWTH.map(x=>[x.family,x.growthPercent]),[
  ["data",57.4],["ai",36.9],["product",29.8],["software",8.1],
]);
assert(CAREER_MARKET_GROWTH.every(m=>m.period==="2026-Q3"&&
  m.segment==="graduate-vacancies-yoy"&&m.publishedAt==="2026-10-16"&&
  m.sourceUrl.startsWith("https://")&&m.occupation.length>2));
assert.equal(getCareerMarketGrowth("procurement"),undefined,
  "Missing comparable market data is unknown, never zero or cold");
assert.equal(getCareerMarketGrowth("operations"),undefined);
assert(CAREER_FAMILIES.length>CAREER_MARKET_GROWTH.length,
  "Do not claim one occupation metric for all careers");
const groups=listCareerDemandFamilies();
assert(groups.length>=12);
assert(groups.every(g=>g.signals.every(s=>s.roleFamily===g.id)));
assert.deepEqual(validateCareerGuides(),[]);
assert.equal(CAREER_ORIGINAL_GUIDES.length,3);
assert.equal(CAREER_PRACTICE_CASES.filter(x=>x.deliveryState==="free-live-preview").length,3);
for(const guide of CAREER_ORIGINAL_GUIDES){
  assert(getCareerGuide(guide.id)===guide);
  assert(guideForFamily(guide.family)===guide);
  assert.equal(guide.deliveryState,"free-original-material");
  const practice=getCareerPractice(guide.caseId);
  assert(practice&&practice.family===guide.family);
  assert(guide.sections.length>=4);
  const markdown=careerGuideToMarkdown(guide);
  assert(markdown.length>1400,guide.id+" must contain an actual substantial lesson");
  assert(markdown.includes(guide.title));
  assert(markdown.includes("参考答案："));
  assert(markdown.includes("https://socthink.cn/career/practice/"+guide.caseId));
  assert(!markdown.includes("TODO")&&!markdown.includes("敬请期待"));
}
const home=fs.readFileSync("src/app/career/page.tsx","utf8");
for(const s of ['id="market-heat"','id="digital-materials"','id="digital-services"',
  "CAREER_ORIGINAL_GUIDES.map","CAREER_FORMAL_PAPERS.map","getCareerMarketGrowth",
  "暂无可比数据","className={styles.familyHeat}"]){
  assert(home.includes(s),"homepage missing "+s);
}
assert(!home.includes('href="/shop"'),"Never link fake unverified paid goods");
assert(home.indexOf("commercialHero")<home.indexOf("<CareerRoleExplorer/>"),
  "Primary goods and services controls must appear before the role directory");
assert(home.indexOf('id="digital-materials"')<home.indexOf("researchDetails"),
  "Real product inventory must remain above collapsed employer evidence listings");
const page=fs.readFileSync("src/app/career/guides/[id]/page.tsx","utf8");
assert(page.includes("guide.sections.map"));
assert(page.includes('"/career/practice/"+guide.caseId'));
async function verifyDownload(){
  for(const guide of CAREER_ORIGINAL_GUIDES){
    const response=await GET(
      new NextRequest("http://localhost/career/guides/"+guide.id+"/download"),
      {params:Promise.resolve({id:guide.id})},
    );
    assert.equal(response.status,200);
    assert.equal(response.headers.get("content-type"),"text/markdown; charset=utf-8");
    assert(response.headers.get("content-disposition")?.includes("attachment;"));
    assert.equal(response.headers.get("x-content-type-options"),"nosniff");
    const content=await response.text();
    assert(content.includes(guide.title));
    assert(content.includes("原创教学内容"));
    assert(content.length>1400);
  }
  const missing=await GET(
    new NextRequest("http://localhost/career/guides/not-a-real-item/download"),
    {params:Promise.resolve({id:"not-a-real-item"})},
  );
  assert.equal(missing.status,404);
  console.log("CAREER_MARKET_TWO_PRODUCTS=PASS market_indicators=4 original_guides=3 downloadable=3 graded_services=3 unseen_heat_never_invented=YES");
}
verifyDownload().catch(e=>{console.error(e);process.exitCode=1;});
