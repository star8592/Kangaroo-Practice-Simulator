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
function helpfulForm(item:ArithmeticItem):string|null{
 const [a,b]=numbers(item.prompt);if(!Number.isFinite(a)||!Number.isFinite(b))return null;
 if(item.strategy==="compensation"){const scale=Math.abs(b)>=50?100:10;const friendly=Math.round(b/scale)*scale;const d=b-friendly;if(item.prompt.includes("×"))return `${a} × (${friendly} ${signed(d)})`;if(item.prompt.includes("−"))return `${a} − (${friendly} ${signed(d)})`;return `${a} + (${friendly} ${signed(d)})`;}
 if(item.strategy==="friendly_25_50_125"&&item.prompt.includes("×")){const pair=Math.abs(a)==125?8:Math.abs(a)==50?2:4;if(Number.isInteger(b/pair))return `(${a} × ${pair}) × ${b/pair}`;if(Number.isInteger(a/pair))return `(${b} × ${pair}) × ${a/pair}`;}
 if((item.strategy==="distributive"||item.strategy==="split")&&item.prompt.includes("×")){const tens=Math.trunc(b/10)*10,ones=b-tens;if(tens&&ones)return `${a} × (${tens} ${signed(ones)})`;}
 if(item.strategy==="near_double"&&item.prompt.includes("+")){const m=Math.min(a,b),M=Math.max(a,b);if(M-m===1)return `${m} + ${m} + 1`;}
 if(item.strategy==="double"&&item.prompt.includes("+")&&a===b)return `2 × ${a}`;
 if(item.strategy==="make10"&&item.prompt.includes("+")){const need=10-a;if(need>0&&b>need)return `10 + ${b-need}`;}
 return null;
}

export function arithmeticItemToEntity(item:ArithmeticItem):MathEntity{
 const form=helpfulForm(item);const kinds=STRATEGY_TO_TRANSFORMS[item.strategy]||[];const transformations=kinds.map((kind,i)=>({id:`${item.id}-t${i+1}`,kind,from:i===0?item.prompt:(form||item.prompt),to:form||item.prompt,reason:item.strategy}));
 const representations=[{id:`${item.id}-r0`,kind:"numeric" as const,form:item.prompt,purpose:"原始表示"}];if(form&&form!==item.prompt)representations.push({id:`${item.id}-r1`,kind:"numeric",form,purpose:"更容易看见结构和低成本路径"});
 return {id:`arith:${item.id}`,domain:"arithmetic",canonical:item.prompt,representations,structures:[item.strategyNode||item.strategy],transformations,goals:["accuracy","fluency","structure","strategy","transfer"],curricula:["GLOBAL"]};
}

export function inferMasteryStage(a:ArithmeticAttempt):MasteryStage{
 const hinted=Number(a.item.meta?.hintLevel||0)>0;if(!a.correct)return hinted?"assisted":"recognized";if(hinted)return"assisted";if(a.firstInputMs<=a.item.expectedMs*.75&&a.edits===0&&a.backspaces===0)return"automatic";if(a.firstInputMs<=a.item.expectedMs*1.1)return"independent";return"recognized";
}
export function arithmeticAttemptToSignal(a:ArithmeticAttempt):LearnerSignal{return {entityId:`arith:${a.item.id}`,grade:a.item.grade,strategyId:a.item.strategy,stage:inferMasteryStage(a),correct:a.correct,efficient:a.correct&&!(["strategy_missed","slow_recall","hesitation"] as string[]).includes(a.reason),latencyMs:a.firstInputMs,hintLevel:Number(a.item.meta?.hintLevel||0),transformations:STRATEGY_TO_TRANSFORMS[a.item.strategy]||[],timestamp:Math.round(a.submittedAt)}}
