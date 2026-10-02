import assert from "node:assert/strict";
import { coachingSteps } from "../src/lib/arithmetic-coaching";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";

const item=(prompt:string,strategy:ArithmeticItem["strategy"],grade:ArithmeticItem["grade"]=4,skillId="laws",answerKind?:ArithmeticItem["answerKind"]):ArithmeticItem=>({
  id:"coach",grade,skillId,prompt,answer:0,answerKind,strategy,expectedMs:6000,difficulty:3,meta:{}
});
const text=(p:string,s:ArithmeticItem["strategy"],g:ArithmeticItem["grade"]=4,skillId="laws",answerKind?:ArithmeticItem["answerKind"])=>(coachingSteps(item(p,s,g,skillId,answerKind))[0]?.text??"");

// 小学巧算提示保持原有简洁规则。
assert.equal(text("26 × 3 = ?","distributive",3),"26=20+6 → 20×3+6×3");
assert.equal(text("83 × 9 = ?","compensation"),"9=10−1 → 83×10−83×1");
assert.equal(text("40 × 19 = ?","distributive"),"19=20−1 → 40×20−40×1");
assert.equal(text("47 × 99 = ?","compensation"),"99=100−1 → 47×100−47×1");
assert.equal(text("25 × 4 = ?","friendly_25_50_125",3),"25×4=100");
assert.equal(text("125 × 8 = ?","friendly_25_50_125",3),"125×8=1000");
assert.equal(coachingSteps(item("3 + 3 = ?","fact_recall",1)).length,0);
assert.equal(coachingSteps(item("28 − 28 = ?","compensation",2)).length,0);
assert.equal(coachingSteps(item("58 − 5 = ?","compensation",2)).length,0);
assert.equal(coachingSteps(item("45 ÷ 9 = ?","split",3)).length,0);
assert.equal(text("168 ÷ 7 = ?","split",3),"168=140+28 → 140÷7+28÷7");
assert.equal(text("24 × 1/2 = ?","split",6),"24÷2×1");
assert.equal(coachingSteps(item("24 × 2/5 = ?","split",6)).length,0);
assert.equal(text("48 × 1/2 = ?","split",6),"48÷2×1");
assert.equal(text("36 × 2/3 = ?","split",6),"36÷3×2");
assert.equal(text("114 ÷ 6 = ?","split",3),"114=120−6 → 120÷6−1");
assert.equal(text("267 + 100 = ?","place_value",3),"百位加 1，其余位不变");
assert.equal(text("477 + 20 = ?","place_value",3),"十位加 2，其余位不变");
assert.equal(text("575 ÷ 25 = ?","place_value",4),"575÷25 = 575×4÷100");

// 初高中必须使用对应学科方法，不能回落到“凑十/补整”等小学话术。
assert.match(text("3x + 5 = 20，x = ?","split",7,"linear_eq"),/常数项.*x 的系数/);
assert.match(text("化简：3(x + 2) + 4x = ?","distributive",7,"algebra_value","expression"),/展开括号.*合并同类项/);
assert.match(text("化简：√72 = ?（最简根式）","fact_recall",9,"root","radical"),/平方因数.*根号外/);
assert.match(text("sin 30° = ?","fact_recall",10,"trig"),/特殊角.*sin、cos.*tan/);
assert.match(text("等差数列 a₁=3，d=2，S10 = ?","split",11,"sequence"),/Sₙ=.*a₁.*aₙ/);
assert.match(text("C(8,3) = ?","fact_recall",12,"probability"),/组合数.*约分/);
assert.match(text("数据 2，4，6，8，10 的平均数 = ?","place_value",12,"statistics"),/平均数 = 数据总和 ÷ 数据个数/);

for(const grade of [7,8,9,10,11,12] as const){
  const sample=item("99 + 1 = ?","compensation",grade,"unknown_secondary_skill");
  const h=coachingSteps(sample)[0]?.text??"";
  assert.ok(!/凑 10|补整|百位加|十位加/.test(h),`grade ${grade} leaked elementary coaching: ${h}`);
}

console.log("arithmetic coaching quality gate: PASS");
