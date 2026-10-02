import type { ArithmeticAttempt } from "../../arithmetic-analytics";
import type { ArithmeticItem } from "../../arithmetic-generator";
import type { LearnerSignal, MathEntity, MasteryStage, TransformationKind } from "../core/model";

const STRATEGY_TO_TRANSFORMS:Record<string,TransformationKind[]>={
 make10:["combine","regroup"],bridge10:["split","regroup"],double:["combine"],near_double:["substitute","compensate"],
 compensation:["substitute","compensate"],split:["split","regroup"],distributive:["split","expand"],friendly_25_50_125:["split","regroup","simplify"],
 fact_recall:[],place_value:["regroup","simplify"],
};

function numbers(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
function signed(n:number){return n>=0?`+ ${n}`:`− ${Math.abs(n)}`}
function helpfulRepresentations(item:ArithmeticItem){
 const [a,b]=numbers(item.prompt);if(!Number.isFinite(a)||!Number.isFinite(b))return [] as {form:string;purpose:string;utility:"preferred"|"neutral"}[];
 const out:{form:string;purpose:string;utility:"preferred"|"neutral"}[]=[];
 if(item.prompt.includes("÷")&&b!==0&&Number.isInteger(a/b)){
  const q=a/b,q1=Math.trunc(q/10)*10,q2=q-q1;
  if(q1>0&&q2>0)out.push({form:`(${b*q1} + ${b*q2}) ÷ ${b}`,purpose:`把 ${a} 拆成两个都能被 ${b} 整除的数`,utility:"preferred"});
  const tens=Math.trunc(a/10)*10,ones=a-tens;if(tens>0&&ones>0&&tens%b!==0)out.push({form:`(${tens} + ${ones}) ÷ ${b}`,purpose:"等价，但拆开后不一定更容易整除",utility:"neutral"});
 }
 if(item.strategy==="compensation"){const scale=Math.abs(b)>=50?100:10;const friendly=Math.round(b/scale)*scale;const d=b-friendly;if(item.prompt.includes("×"))out.push({form:`${a} × (${friendly} ${signed(d)})`,purpose:"把接近整十/整百的数改写后再补偿",utility:"preferred"});else if(item.prompt.includes("−"))out.push({form:`${a} − (${friendly} ${signed(d)})`,purpose:"先靠近整十/整百，再补回差值",utility:"preferred"});else if(item.prompt.includes("+"))out.push({form:`${a} + (${friendly} ${signed(d)})`,purpose:"先靠近整十/整百，再补回差值",utility:"preferred"});}
 if(item.strategy==="friendly_25_50_125"&&item.prompt.includes("×")){const pair=Math.abs(a)==125?8:Math.abs(a)==50?2:4;if(Number.isInteger(b/pair))out.push({form:`(${a} × ${pair}) × ${b/pair}`,purpose:"先配成整百或整千",utility:"preferred"});else if(Number.isInteger(a/pair))out.push({form:`(${b} × ${pair}) × ${a/pair}`,purpose:"先配成整百或整千",utility:"preferred"});}
 if((item.strategy==="distributive"||item.strategy==="split")&&item.prompt.includes("×")){const tens=Math.trunc(b/10)*10,ones=b-tens;if(tens&&ones)out.push({form:`${a} × (${tens} ${signed(ones)})`,purpose:"拆成更容易处理的整十部分和个位部分",utility:"preferred"});}
 if(item.strategy==="near_double"&&item.prompt.includes("+")){const m=Math.min(a,b),M=Math.max(a,b);if(M-m===1)out.push({form:`${m} + ${m} + 1`,purpose:"先用熟悉的双倍，再补 1",utility:"preferred"});}
 if(item.strategy==="double"&&item.prompt.includes("+")&&a===b)out.push({form:`2 × ${a}`,purpose:"识别双倍结构",utility:"preferred"});
 if(item.strategy==="make10"&&item.prompt.includes("+")){const need=10-a;if(need>0&&b>need)out.push({form:`10 + ${b-need}`,purpose:"先凑成 10",utility:"preferred"});}
 return out.filter((x,i,arr)=>x.form!==item.prompt&&arr.findIndex(y=>y.form===x.form)===i);
}

export function arithmeticItemToEntity(item:ArithmeticItem):MathEntity{
 const forms=helpfulRepresentations(item);const preferred=forms.find(x=>x.utility==="preferred")?.form;const kinds=STRATEGY_TO_TRANSFORMS[item.strategy]||[];const transformations=kinds.map((kind,i)=>({id:`${item.id}-t${i+1}`,kind,from:i===0?item.prompt:(preferred||item.prompt),to:preferred||item.prompt,reason:item.strategy}));
 const representations=[{id:`${item.id}-r0`,kind:"numeric" as const,form:item.prompt,purpose:"原始表示",utility:"neutral" as const},...forms.map((x,i)=>({id:`${item.id}-r${i+1}`,kind:"numeric" as const,...x}))];
 return {id:`arith:${item.id}`,domain:"arithmetic",canonical:item.prompt,representations,structures:[item.strategyNode||item.strategy],transformations,goals:["accuracy","fluency","structure","strategy","transfer"],curricula:["GLOBAL"]};
}

export function inferMasteryStage(a:ArithmeticAttempt):MasteryStage{
 const hinted=Number(a.item.meta?.hintLevel||0)>0;if(!a.correct)return hinted?"assisted":"recognized";if(hinted)return"assisted";if(a.firstInputMs<=a.item.expectedMs*.75&&a.edits===0&&a.backspaces===0)return"automatic";if(a.firstInputMs<=a.item.expectedMs*1.1)return"independent";return"recognized";
}
export function arithmeticAttemptToSignal(a:ArithmeticAttempt):LearnerSignal{return {entityId:`arith:${a.item.id}`,grade:a.item.grade,strategyId:a.item.strategy,stage:inferMasteryStage(a),correct:a.correct,efficient:a.correct&&!(["strategy_missed","slow_recall","hesitation"] as string[]).includes(a.reason),latencyMs:a.firstInputMs,hintLevel:Number(a.item.meta?.hintLevel||0),transformations:STRATEGY_TO_TRANSFORMS[a.item.strategy]||[],timestamp:Math.round(a.submittedAt)}}
