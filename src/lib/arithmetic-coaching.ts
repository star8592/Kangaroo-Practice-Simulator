import { STRATEGY_GUIDE, type MentalStrategy } from "./arithmetic";
import type { ArithmeticItem } from "./arithmetic-generator";

export type CoachingLevel=0|1|2|3;
export type CoachingStep={level:CoachingLevel;label:string;text:string};

const OBSERVE:Record<MentalStrategy,string>={
 make10:"先别急着算：哪个数可以先补成 10？",bridge10:"先看 10：能不能先减到 10，再处理剩下的？",double:"先找重复的两个数，把它们看成一个整体。",near_double:"先找最近的“双数”，再想只需要调整多少。",compensation:"先找附近的整十、整百或整千，再想补偿回来。",split:"先别硬算：把哪个数拆开会让计算更简单？",distributive:"先找可以拆开的因数，让乘法变成几段熟悉的计算。",friendly_25_50_125:"先找 25/50/125 的好朋友：4、2、8 或它们的倍数。",fact_recall:"这是基础事实提取题：先尝试直接从记忆中取答案。",place_value:"先看位值和 0，不要把所有数字逐位硬算。"};

export function coachingSteps(item:ArithmeticItem):CoachingStep[]{
 const guide=STRATEGY_GUIDE[item.strategy].zh;
 return[
  {level:1,label:"观察",text:OBSERVE[item.strategy]},
  {level:2,label:"方向",text:guide},
  {level:3,label:"临摹",text:workedHint(item)},
 ];
}

function nums(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
function workedHint(item:ArithmeticItem){const [a,b]=nums(item.prompt);if(!Number.isFinite(a)||!Number.isFinite(b))return STRATEGY_GUIDE[item.strategy].zh;
 if(item.strategy==="compensation"){
  if(item.prompt.includes("×")){const base=Math.pow(10,Math.round(Math.log10(Math.max(1,Math.abs(b)))));const friendly=Math.abs(b-base)<=Math.abs(b-base*10)?base:base*10;return `试着把 ${b} 看成 ${friendly}${b>=friendly?" + ":" − "}${Math.abs(b-friendly)}，先算容易的整数量。`}
  const friendly=Math.round(b/10)*10;return `试着把 ${b} 看成 ${friendly}${b>=friendly?" + ":" − "}${Math.abs(b-friendly)}，算完再补偿。`;
 }
 if(item.strategy==="distributive")return `把 ${b} 拆成容易算的两部分，例如整十与个位，再分别与 ${a} 计算。`;
 if(item.strategy==="split")return `把 ${b} 按位值或因数拆开，先完成最容易的一块，再合起来。`;
 if(item.strategy==="friendly_25_50_125")return `不要直接乘：先把另一因数拆出能与 ${a} 配成整百/整千的因数。`;
 if(item.strategy==="make10")return `从一个加数里拆出“刚好补到 10”的部分，先凑整，再加剩下的。`;
 if(item.strategy==="bridge10")return `先减掉让 ${a} 到最近整十所需的部分，再减剩下的。`;
 if(item.strategy==="near_double")return `先算相邻的双数，再只调整 1。`;
 return STRATEGY_GUIDE[item.strategy].zh;
}
