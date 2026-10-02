import type { ArithmeticItem } from "./arithmetic-generator";

export type CoachingStep={level:1;label:string;text:string};
function nums(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
const hint=(text:string):CoachingStep[]=>text?[{level:1,label:"这样想",text}]:[];
function nearestFriendly(n:number){
 const c=[10,20,50,100,200,500,1000].map(x=>({x,d:Math.abs(n-x)})).sort((a,b)=>a.d-b.d)[0];
 return c&&c.d>0&&c.d<=Math.max(1,Math.abs(n)*.08)?c.x:null;
}
function splitTens(n:number){const t=Math.trunc(n/10)*10;return [t,n-t] as const}

export function coachingSteps(item:ArithmeticItem):CoachingStep[]{
 const p=item.prompt;const [a,b]=nums(p);if(!Number.isFinite(a)||!Number.isFinite(b))return[];
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
