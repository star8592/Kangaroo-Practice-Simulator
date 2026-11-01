import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  INSTRUMENTS,CENTER_SECTIONS,getInstrument,scoreInstrument,validateMeasurementRegistry,
} from "../src/lib/measurement-center";

assert.deepEqual(validateMeasurementRegistry(),[],"instrument provenance, item keys and dimension counts");
assert.equal(INSTRUMENTS.length,2);
assert.equal(CENTER_SECTIONS.length,5);
assert.equal(CENTER_SECTIONS.filter(x=>"instrumentId" in x).length,2);
const career=getInstrument("career-interest-exploration-30")!;
const bigFive=getInstrument("ipip-big-five-50-cn-preview")!;
assert.equal(career.items.length,30);
assert.equal(career.factors.length,6);
assert.equal(bigFive.items.length,50);
assert.equal(bigFive.factors.length,5);
for(const instrument of INSTRUMENTS){
  assert.equal(instrument.status,"research-preview");
  assert.equal(instrument.normStatus,"not-validated-in-chinese");
  assert.equal(instrument.payable,false);
  assert.equal(instrument.ageMin,18);
  assert(instrument.sourceUrl.startsWith("https://"));
  assert.equal(scoreInstrument(instrument,{}),null,"missing responses cannot score");
  const allThree=Object.fromEntries(instrument.items.map(item=>[item.id,3]));
  const result=scoreInstrument(instrument,allThree)!;
  assert.equal(result.version,instrument.version);
  assert.equal(result.dimensions.length,instrument.factors.length);
  for(const d of result.dimensions){
    assert.equal(d.mean,3,"neutral responses must yield 3 even for reverse keyed items");
    assert.equal(d.answered,instrument.id.startsWith("ipip")?10:5);
  }
  assert.throws(()=>scoreInstrument(instrument,{...allThree,[instrument.items[0].id]:6}),/invalid response/);
  assert.throws(()=>scoreInstrument(instrument,{...allThree,[instrument.items[0].id]:2.5}),/invalid response/);
  assert.throws(()=>scoreInstrument(instrument,{...allThree,extra:3}),/invalid response/);
  const incomplete={...allThree};delete incomplete[instrument.items[0].id];
  assert.equal(scoreInstrument(instrument,incomplete),null);
}
const allFive=Object.fromEntries(career.items.map(item=>[item.id,5]));
assert(scoreInstrument(career,allFive)!.dimensions.every(x=>x.mean===5));
const neutralBigFive=Object.fromEntries(bigFive.items.map(item=>[item.id,3]));
const changedReverse={...neutralBigFive,["ipip-50-2"]:1};
const changedDirect={...neutralBigFive,["ipip-50-7"]:5};
const agreementId="BF-A";
const agreement=(answers:Record<string,number>)=>scoreInstrument(bigFive,answers)!.dimensions.find(x=>x.id===agreementId)!.mean;
assert.equal(agreement(neutralBigFive),3);
assert.equal(agreement(changedReverse),3.2,"negative-keyed 1 must become 5");
assert.equal(agreement(changedDirect),3.2,"positive-keyed 5 remains 5");
const allOne=Object.fromEntries(bigFive.items.map(item=>[item.id,1]));
assert.equal(agreement({...allOne,["ipip-50-2"]:5}),agreement(allOne)-0.4,"reverse key must decrease when value increases");
for(const file of [
  "src/app/assessment-center/page.tsx",
  "src/app/assessment-center/[id]/page.tsx",
  "src/components/MeasurementRunner.tsx",
  "src/app/assessment-center/measurement.module.css",
]) assert(fs.existsSync(path.resolve(file)),file+" exists");
const runner=fs.readFileSync("src/components/MeasurementRunner.tsx","utf-8");
assert(!/localStorage|sessionStorage|sendBeacon|fetch\(|XMLHttpRequest/.test(runner),"responses stay in client memory");
assert(runner.includes("未验证中国常模")||runner.includes("中国常模"));
const catalog=fs.readFileSync("src/lib/assessment-platform.ts","utf-8");
assert(catalog.includes('href:"/assessment-center"'));
console.log("MEASUREMENT_CENTER=PASS sections=5 pilots=2 items=80 scoring=PASS reverse_key=PASS privacy=MEMORY_ONLY payment=OFF norms=UNVALIDATED");
