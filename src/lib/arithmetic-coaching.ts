import type { ArithmeticItem } from "./arithmetic-generator";

export type CoachingStep={level:1;label:string;text:string};
function nums(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
const hint=(text:string):CoachingStep[]=>text?[{level:1,label:"这样想",text}]:[];
function nearestFriendly(n:number){
 const c=[10,20,50,100,200,500,1000].map(x=>({x,d:Math.abs(n-x)})).sort((a,b)=>a.d-b.d)[0];
 return c&&c.d>0&&c.d<=Math.max(1,Math.abs(n)*.08)?c.x:null;
}
function splitTens(n:number){const t=Math.trunc(n/10)*10;return [t,n-t] as const}

function secondaryCoaching(item:ArithmeticItem):CoachingStep[]{
 const p=item.prompt;
 switch(item.skillId){
  case "signed":
   return hint("先统一符号，再算绝对值；遇到减负数时先改写成加正数。");
  case "algebra_value":
   return /化简/.test(p)||item.answerKind==="expression"
    ?hint("先用分配律展开括号，再按 x²、x、常数项合并同类项。")
    :hint("把 x 的值带括号代入，再按乘方 → 乘除 → 加减的顺序计算。");
  case "linear_eq":
   return hint("先把常数项移到等号另一边，再除以 x 的系数；最后代回原式检查。");
  case "ratio_percent":
   return hint("先把百分数化成分数或小数，再与基数相乘；最后检查结果的数量级。");
  case "power":
   return hint("先认清底数和指数，再用重复相乘或指数规则化简后计算。");
  case "root":
   return /最简根式|化简/.test(p)
    ?hint("先找被开方数里的最大平方因数，把平方因数开方后移到根号外。")
    :hint("先找哪个非负数的平方等于被开方数。");
  case "quadratic_value":
  case "function":
   return hint("先把自变量的值带括号代入，再按乘方 → 乘除 → 加减计算。");
  case "trig":
   return hint("先认特殊角对应的精确值，再确认题目要的是 sin、cos 还是 tan。");
  case "log":
   return hint("把对数改写成指数式：logₐb=c ⇔ aᶜ=b，再直接判断指数。");
  case "sequence":
   return /S\d|S[₁₂₃₄₅₆₇₈₉]/.test(p)
    ?hint("先求 aₙ，再用 Sₙ=n(a₁+aₙ)/2；代入前先确认 n 和公差 d。")
    :hint("用 aₙ=a₁+(n−1)d；先算 n−1，再乘公差，最后加首项。");
  case "probability":
   return /^C\(/.test(p)
    ?hint("组合数先写成连续乘积，分子分母先约分再乘，避免把数算大。")
    :hint("概率 = 有利情况数 ÷ 总情况数，最后按题目要求约成最简分数。");
  case "statistics":
   return hint("平均数 = 数据总和 ÷ 数据个数；先求和，再除，最后回看是否落在数据范围内。");
  default:
   return [];
 }
}

export function coachingSteps(item:ArithmeticItem):CoachingStep[]{
 const p=item.prompt;
 // 初中、高中使用学科方法提示，禁止回落到小学“凑整/拆十”话术。
 if(item.grade>=7)return secondaryCoaching(item);
 const [a,b]=nums(p);if(!Number.isFinite(a)||!Number.isFinite(b))return[];
 // 十以内/表内事实：不制造“方法”，熟练提取本身就是目标。
 if(item.strategy==="fact_recall")return[];
 if(item.strategy==="make10")return /□/.test(p)?[]:hint(`先凑 10，再加剩下的`);
 if(item.strategy==="bridge10")return hint(`先减到 10，再减剩下的`);
 if(item.strategy==="double")return hint(`${a}+${a}=2×${a}`);
 if(item.strategy==="near_double"){const m=Math.min(a,b);return hint(`${m}+${m+1}=${m}+${m}+1`)}

 // 分数题优先于普通乘法识别，避免把分子/分母误当第二个乘数。
 const frac=p.match(/×\s*(\d+)\/(\d+)/);
 if(frac){const num=Number(frac[1]),den=Number(frac[2]);if(den&&Number.isInteger(a/den))return hint(`${a}÷${den}×${num}`);return[];}

 if(p.includes("×")){
  // 优先选择最省力的近整因数，不受原策略标签束缚。
  const fa=nearestFriendly(a),fb=nearestFriendly(b);
  const target=fb!==null?b:fa!==null?a:null;const friendly=fb!==null?fb:fa;
  if(target!==null&&friendly!==null){const other=target===a?b:a;const delta=target-friendly;
   return hint(`${target}=${friendly}${delta>0?`+${delta}`:`−${Math.abs(delta)}`} → ${other}×${friendly}${delta>0?`+${other}×${delta}`:`−${other}×${Math.abs(delta)}`}`);
  }
  if(item.strategy==="friendly_25_50_125"){
   const special=[a,b].find(x=>[2.5,5,12.5,25,50,125].includes(Math.abs(x)));if(special===undefined)return[];const other=special===a?b:a;
   const candidates=Math.abs(special)===125||Math.abs(special)===12.5?[8,4,2]:Math.abs(special)===50||Math.abs(special)===5?[2]:[4,2];
   const pair=candidates.find(x=>Number.isInteger(other/x));if(!pair)return[];
   const rest=other/pair;if(rest===1)return hint(`${special}×${pair}=${special*pair}`);
   return hint(`${other}=${pair}×${rest} → ${special}×${pair}×${rest}`);
  }
  if(item.strategy==="distributive"){
   const candidates=[a,b].filter(x=>Math.abs(x)>=10).map(x=>{const [t,o]=splitTens(x);return {x,t,o,cost:Math.abs(o)}}).filter(x=>x.t&&x.o);
   if(!candidates.length)return[];const c=candidates.sort((x,y)=>x.cost-y.cost)[0];const other=c.x===a?b:a;
   if(Math.abs(c.o)>6)return[];return hint(`${c.x}=${c.t}+${c.o} → ${c.t}×${other}+${c.o}×${other}`);
  }
 }

 if(p.includes("÷")&&item.strategy==="split"&&b!==0&&Number.isInteger(a/b)){
  const q=a/b;if(q<=12)return[];const round=Math.round(q/10)*10;const delta=q-round;
  if(round>0&&delta!==0&&Math.abs(delta)<=3){const base=b*round,rest=b*Math.abs(delta);return hint(`${a}=${base}${delta>0?`+${rest}`:`−${rest}`} → ${base}÷${b}${delta>0?`+${Math.abs(delta)}`:`−${Math.abs(delta)}`}`)}
  const q1=Math.trunc(q/10)*10,q2=q-q1;if(q1>0&&q2>0)return hint(`${a}=${b*q1}+${b*q2} → ${b*q1}÷${b}+${b*q2}÷${b}`);return[];
 }
 if(item.strategy==="compensation"&&(p.includes("+")||p.includes("−"))){
  const f=nearestFriendly(b);if(f===null)return[];const d=b-f;
  if(p.includes("+"))return hint(`${b}=${f}${d>0?`+${d}`:`−${Math.abs(d)}`} → ${a}+${f}${d>0?`+${d}`:`−${Math.abs(d)}`}`);
  return hint(`${b}=${f}${d>0?`+${d}`:`−${Math.abs(d)}`} → ${a}−${f}${d>0?`−${d}`:`+${Math.abs(d)}`}`);
 }
 if(item.strategy==="place_value"){
  if(p.includes("+")&&Number.isInteger(b)){if(b>=100&&b%100===0)return hint(`百位加 ${b/100}，其余位不变`);if(b%10===0)return hint(`十位加 ${b/10}，其余位不变`);}
  if(p.includes("÷")&&b===25)return hint(`${a}÷25 = ${a}×4÷100`);
  if(p.includes("÷")&&Number.isInteger(a)&&Number.isInteger(b)&&a%10===0&&b%10===0)return hint(`同时去掉一个 0：${a/10}÷${b/10}`);
  return[];
 }
 return[];
}
