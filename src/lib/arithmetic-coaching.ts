import type { ArithmeticItem } from "./arithmetic-generator";

export type CoachingLevel=0|1|2;
export type CoachingStep={level:1|2;label:string;text:string};

function nums(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
function signed(n:number){return n>=0?`+ ${n}`:`− ${Math.abs(n)}`}
function splitTens(n:number){const tens=Math.trunc(n/10)*10;return [tens,n-tens] as const}

export function coachingSteps(item:ArithmeticItem):CoachingStep[]{
 const [a,b]=nums(item.prompt);if(!Number.isFinite(a)||!Number.isFinite(b))return[];
 const one=(text:string):CoachingStep[]=>[{level:1,label:"提示",text}];
 const two=(first:string,second:string):CoachingStep[]=>[{level:1,label:"提示",text:first},{level:2,label:"再给一步",text:second}];

 if(item.strategy==="distributive"&&item.prompt.includes("×")){
  const splitTarget=Math.abs(a)>=10&&Math.abs(b)<10?a:Math.abs(b)>=10&&Math.abs(a)<10?b:Math.min(Math.abs(a),Math.abs(b));
  const other=splitTarget===a?b:a;const [tens,ones]=splitTens(splitTarget);
  if(tens&&ones){const worked=`把 ${splitTarget} 拆成 ${tens} + ${ones}：${tens} × ${other} + ${ones} × ${other}。`;
   if(item.grade<=3||Math.abs(other)<10)return one(worked);
   return two(`先拆较容易的因数 ${splitTarget}，把它看成 ${tens} + ${ones}。`,worked);
  }
 }
 if(item.strategy==="compensation"){
  const target=item.prompt.includes("×")?(Math.abs(a)>=10&&Math.abs(b)>=10?b:Math.max(Math.abs(a),Math.abs(b))):b;
  const scale=Math.abs(target)>=50?100:10;const friendly=Math.round(target/scale)*scale;const delta=target-friendly;
  if(item.prompt.includes("×"))return two(`把 ${target} 看成 ${friendly} ${signed(delta)}。`,`先算与 ${friendly} 有关的整数量，再把 ${Math.abs(delta)} 带来的差补回来。`);
  return one(`把 ${target} 看成 ${friendly} ${signed(delta)}，先凑整，再补回差。`);
 }
 if(item.strategy==="friendly_25_50_125"&&item.prompt.includes("×")){
  const special=[a,b].find(x=>[2.5,5,12.5,25,50,125].includes(Math.abs(x)))??a;const other=special===a?b:a;
  const pair=Math.abs(special)===125||Math.abs(special)===12.5?8:Math.abs(special)===50||Math.abs(special)===5?2:4;
  if(Number.isInteger(other/pair))return one(`先把 ${other} 拆出 ${pair}：(${special} × ${pair}) × ${other/pair}。`);
  return one(`先找能和 ${special} 配成整百或整千的因数，再重组乘法。`);
 }
 if(item.strategy==="split"&&item.prompt.includes("÷")&&b!==0&&Number.isInteger(a/b)){
  const q=a/b,q1=Math.max(1,Math.trunc(q/10)*10),q2=q-q1;if(q2>0)return one(`把 ${a} 拆成 ${b*q1} + ${b*q2}：(${b*q1} + ${b*q2}) ÷ ${b}。`);
 }
 if(item.strategy==="split")return one(`先按位值拆开较大的数，只做两块容易的计算，再合起来。`);
 if(item.strategy==="make10")return one(`先从一个加数里拿出刚好能把另一个补到 10 的部分。`);
 if(item.strategy==="bridge10")return one(`先走到 10，再处理剩下的差。`);
 if(item.strategy==="double")return one(`先把两个相同的数看成“2 倍”。`);
 if(item.strategy==="near_double")return one(`先算最近的双倍，再只调整 1。`);
 if(item.strategy==="place_value")return one(`先看位值和 0 的变化，只计算真正变化的部分。`);
 if(item.strategy==="fact_recall")return one(`这题优先直接回忆已经熟练的乘除事实，不必绕路。`);
 return[];
}
