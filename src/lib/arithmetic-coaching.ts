import type { ArithmeticItem } from "./arithmetic-generator";

export type CoachingStep={level:1;label:string;text:string};
function nums(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
function splitTens(n:number){const tens=Math.trunc(n/10)*10;return [tens,n-tens] as const}
function signedCompact(n:number){return n>=0?`+ ${n}`:`− ${Math.abs(n)}`}

export function coachingSteps(item:ArithmeticItem):CoachingStep[]{
 const [a,b]=nums(item.prompt);if(!Number.isFinite(a)||!Number.isFinite(b))return[];
 const hint=(text:string):CoachingStep[]=>[{level:1,label:"这样想",text}];
 if(item.strategy==="distributive"&&item.prompt.includes("×")){
  const splitTarget=Math.abs(a)>=10&&Math.abs(b)<10?a:Math.abs(b)>=10&&Math.abs(a)<10?b:Math.min(Math.abs(a),Math.abs(b));
  const other=splitTarget===a?b:a;const [tens,ones]=splitTens(splitTarget);
  if(tens&&ones)return hint(`${splitTarget} = ${tens} + ${ones} → ${tens}×${other} + ${ones}×${other}`);
 }
 if(item.strategy==="compensation"){
  const target=item.prompt.includes("×")?(Math.abs(a)>=10&&Math.abs(b)>=10?b:Math.max(Math.abs(a),Math.abs(b))):b;
  const scale=Math.abs(target)>=50?100:10;const friendly=Math.round(target/scale)*scale;const delta=target-friendly;
  if(item.prompt.includes("×"))return hint(`${target} = ${friendly} ${signedCompact(delta)} → ${a}×${friendly} ${delta>=0?"+":"−"} ${a}×${Math.abs(delta)}`);
  if(item.prompt.includes("+"))return hint(`${target} = ${friendly} ${signedCompact(delta)} → ${a} + ${friendly} ${delta>=0?"+":"−"} ${Math.abs(delta)}`);
  if(item.prompt.includes("−"))return hint(`${target} = ${friendly} ${signedCompact(delta)} → ${a} − ${friendly} ${delta>=0?"−":"+"} ${Math.abs(delta)}`);
 }
 if(item.strategy==="friendly_25_50_125"&&item.prompt.includes("×")){
  const special=[a,b].find(x=>[2.5,5,12.5,25,50,125].includes(Math.abs(x)))??a;const other=special===a?b:a;
  const pair=Math.abs(special)===125||Math.abs(special)===12.5?8:Math.abs(special)===50||Math.abs(special)===5?2:4;
  if(Number.isInteger(other/pair))return hint(`${other} = ${pair}×${other/pair} → ${special}×${pair}×${other/pair}`);
 }
 if(item.strategy==="split"&&item.prompt.includes("÷")&&b!==0&&Number.isInteger(a/b)){
  const q=a/b,q1=Math.max(1,Math.trunc(q/10)*10),q2=q-q1;if(q2>0)return hint(`${a} = ${b*q1} + ${b*q2} → ${b*q1}÷${b} + ${b*q2}÷${b}`);
 }
 if(item.strategy==="make10")return hint(`先凑 10，再算剩下的`);
 if(item.strategy==="bridge10")return hint(`先到 10，再处理剩下的差`);
 if(item.strategy==="double")return hint(`${a} + ${a} = 2×${a}`);
 if(item.strategy==="near_double"){const m=Math.min(a,b);return hint(`${m} + ${m+1} = ${m} + ${m} + 1`)}
 if(item.strategy==="place_value")return hint(`只看真正变化的位值`);
 if(item.strategy==="fact_recall")return hint(`直接回忆乘除事实，不绕路`);
 if(item.strategy==="split")return hint(`按位值拆开，再合起来`);
 return[];
}
