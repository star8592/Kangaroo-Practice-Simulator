import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {
 ADVANCED_REASONING_VERSION,ADVANCED_REASONING_DURATION_MINUTES,
 ADVANCED_REASONING_DOMAINS,ADVANCED_REASONING_ITEMS,
 validateAdvancedReasoningBank,scoreAdvancedReasoning
} from "../src/lib/advanced-reasoning-bank";
import {ASSESSMENT_EVIDENCE,validateEvidenceRegistry} from "../src/lib/assessment-evidence";
assert.deepEqual(validateAdvancedReasoningBank(),[]);
assert.deepEqual(validateEvidenceRegistry(),[]);
assert.equal(ADVANCED_REASONING_VERSION,"advanced-reasoning-original-20261102-v1");
assert.equal(ADVANCED_REASONING_DURATION_MINUTES,45);
assert.equal(ADVANCED_REASONING_ITEMS.length,40);
assert.equal(ADVANCED_REASONING_DOMAINS.length,5);
for(const group of ADVANCED_REASONING_DOMAINS)
 assert.equal(ADVANCED_REASONING_ITEMS.filter(q=>q.domain===group.id).length,8);
for(let answer=0;answer<4;answer++)
 assert.equal(ADVANCED_REASONING_ITEMS.filter(q=>q.answer===answer).length,10,
  "correct answer positions must be balanced across A-D");
const perfect=Object.fromEntries(ADVANCED_REASONING_ITEMS.map(q=>[q.id,q.answer]));
const blank=scoreAdvancedReasoning({});
assert.equal(blank.correct,0);
assert.equal(blank.answered,0);
assert.equal(blank.total,40);
assert(blank.review.every(q=>q.chosen===null&&!q.correct),"blank papers never score");
const full=scoreAdvancedReasoning(perfect);
assert.equal(full.correct,40);
assert.equal(full.answered,40);
assert(full.groups.every(g=>g.correct===8&&g.answered===8&&g.total===8));
const wrong=Object.fromEntries(ADVANCED_REASONING_ITEMS.map(q=>[q.id,(q.answer+1)%4]));
const zero=scoreAdvancedReasoning(wrong);
assert.equal(zero.correct,0);assert.equal(zero.answered,40);
const mixed={...perfect};
delete mixed[ADVANCED_REASONING_ITEMS[0].id];
const partial=scoreAdvancedReasoning(mixed);
assert.equal(partial.correct,39);
assert.equal(partial.answered,39);
assert(partial.review[0].chosen===null);
assert.equal(partial.review.filter(x=>x.chosen===null).length,1);
assert.throws(()=>scoreAdvancedReasoning({...perfect,other:2}),/INVALID_ADVANCED_REASONING_ANSWER/);
assert.throws(()=>scoreAdvancedReasoning({...perfect,[ADVANCED_REASONING_ITEMS[0].id]:4}),/INVALID_ADVANCED_REASONING_ANSWER/);
assert.throws(()=>scoreAdvancedReasoning({...perfect,[ADVANCED_REASONING_ITEMS[0].id]:-1}),/INVALID_ADVANCED_REASONING_ANSWER/);
assert.throws(()=>scoreAdvancedReasoning({...perfect,[ADVANCED_REASONING_ITEMS[0].id]:0.5}),/INVALID_ADVANCED_REASONING_ANSWER/);
const duplicateStems=ADVANCED_REASONING_ITEMS.map(q=>q.stem);
assert.equal(new Set(duplicateStems).size,40);
for(const item of ADVANCED_REASONING_ITEMS){
 assert(item.explanation.length>18);
 assert(item.options.every(x=>x.trim()));
 assert(!/\bSHL\b|Watson.?Glaser|官方真题/.test(item.stem));
}
// Explicit known-answer examples and reasoning checks from independent manual audit.
// These are original, not copied instrument answer keys.
const expected:Record<string,string>={
 "ar-deduction-01":"账单A标注“已复核”",
 "ar-deduction-04":"至少有些项目经理能完成该查询任务",
 "ar-deduction-08":"合同C不可能同时满足“已批准且生效”",
 "ar-constraint-02":"周二",
 "ar-constraint-06":"中位",
 "ar-induction-01":"158",
 "ar-induction-07":"16",
 "ar-induction-08":"I10",
 "ar-assumptions-01":"迁移、维护等额外成本不会抵消单次节约",
 "ar-assumptions-08":"在独立且有代表性的未见数据上能否取得相近表现",
 "ar-evidence-07":"购买次数增加，但转化率从10%降至5%",
 "ar-evidence-08":"应同时看中位数：甲6万元、乙10万元，甲的高值会拉高均值"
};
for(const [id,correct] of Object.entries(expected)){
 const item=ADVANCED_REASONING_ITEMS.find(q=>q.id===id)!;
 assert.equal(item.options[item.answer],correct,id+" answer audit");
}
assert(ASSESSMENT_EVIDENCE.some(r=>r.id==="advanced-reasoning-40"&&r.fullReportOffer==="not-offered"));
assert.equal(ASSESSMENT_EVIDENCE.length,8);
assert(existsSync("src/app/assessment-center/advanced-reasoning-40/page.tsx"));
const runner=readFileSync("src/components/AdvancedReasoningRunner.tsx","utf8");
assert(runner.includes('sessionStorage.getItem(KEY)')&&runner.includes('sessionStorage.setItem(KEY'));
assert(runner.includes('remaining===0')&&runner.includes('setStage("report")'));
assert(!/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage/.test(runner),"no answer upload");
const center=readFileSync("src/app/assessment-center/page.tsx","utf8");
assert(center.includes('href="/assessment-center/advanced-reasoning-40"'));
console.log("ADVANCED_REASONING=PASS original_items=40 five_domains=8_each answer_positions=10_each duration=45m empty=0 perfect=40 partial=39 evidence=EXPLICIT privacy=SESSION_ONLY");
