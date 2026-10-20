import assert from "node:assert/strict";
import { mathInputKeys, assessArithmeticAnswer } from "../src/lib/arithmetic-input";
import { mathAnswerKeys, editMathAnswer, backspaceMathAnswer } from "../apps/miniapp/src/services/math-answer-keypad";
import { generateArithmeticSet } from "../src/lib/arithmetic-generator";
import type { ArithmeticGrade } from "../src/lib/arithmetic";
import type { ArithmeticAnswerKind } from "../src/lib/arithmetic-answer";

const kinds:ArithmeticAnswerKind[]=["number","fraction","radical","pi","expression"];
for(const kind of kinds){
 const web=mathInputKeys(kind).map(k=>k.insert);
 const mini=mathAnswerKeys(kind).map(k=>k.insert);
 assert.deepEqual(mini,web,"Mini Program keypad must match Web for "+kind);
 assert.ok(web.includes("-"),kind+" missing a minus key");
 assert.ok(web.includes("."),kind+" missing decimal point");
 assert.ok(web.includes("/"),kind+" missing division/fraction key");
}
assert.ok(mathAnswerKeys("expression").some(x=>x.label==="分数 a/b"),"algebra expression keypad must expose a labelled fraction key");
for(const key of ["x","^","^2","+","-","(",")","*","/"]){
 assert.ok(mathAnswerKeys("expression").some(x=>x.insert===key),"algebra key missing: "+key);
}
for(const [kind,required] of [["radical","√"],["pi","π"]] as const){
 assert.ok(mathAnswerKeys(kind).some(x=>x.insert===required));
}
const edited=editMathAnswer("12","-",0);
assert.deepEqual(edited,{value:"-12",cursor:1});
assert.deepEqual(editMathAnswer("1/2","-",2),{value:"1/-2",cursor:3});
assert.deepEqual(editMathAnswer("x+1","^2",1),{value:"x^2+1",cursor:3});
assert.deepEqual(backspaceMathAnswer("-12",1),{value:"12",cursor:0});
assert.deepEqual(backspaceMathAnswer("3/4",3),{value:"3/",cursor:2});

const specimens=[
 {spec:{answer:-4,answerKind:"number" as const},raw:"−4"},
 {spec:{answer:0.5,answerKind:"number" as const},raw:"1/2"},
 {spec:{answer:"3/4",answerKind:"fraction" as const,requireSimplified:true},raw:"3/4"},
 {spec:{answer:"√3/2",answerKind:"radical" as const,requireSimplified:true},raw:"√3/2"},
 {spec:{answer:"π/6",answerKind:"pi" as const,requireSimplified:true},raw:"π/6"},
 {spec:{answer:"x^2+5x+6",answerKind:"expression" as const},raw:"(x+2)(x+3)"},
];
for(const {spec,raw} of specimens){
 assert.deepEqual(assessArithmeticAnswer(spec,raw),{status:"correct"},"incorrect symbolic grading: "+raw);
}
assert.deepEqual(assessArithmeticAnswer({answer:"1/2",answerKind:"fraction",requireSimplified:true},"2/4"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"2√3",answerKind:"radical",requireSimplified:true},"√12"),{status:"needs_simplification"});

let checked=0;
for(let grade=1;grade<=12;grade++){
 for(const seed of [193,220,1013,2026]){
  const generated=generateArithmeticSet(grade as ArithmeticGrade,28,seed);
  for(const item of generated){
   const keys=new Set(mathAnswerKeys(item.answerKind||"number").map(x=>x.insert));
   for(const ch of String(item.answer)){
    assert.ok(keys.has(ch)||ch==="^"&&keys.has("^2"),`g${grade} missing keypad char ${JSON.stringify(ch)} for kind ${item.answerKind} answer ${item.answer}`);
   }
   checked++;
  }
 }
}
console.log(`MATH_ANSWER_INPUT_PARITY_PASS grades=12 kinds=5 generated_answers=${checked} platforms=web+miniapp signed=true`);
