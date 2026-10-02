import type { ArithmeticAttempt } from "../../arithmetic-analytics";
import type { ArithmeticItem } from "../../arithmetic-generator";
import type { LearnerSignal, MathEntity, MasteryStage, TransformationKind } from "../core/model";

const STRATEGY_TO_TRANSFORMS:Record<string,TransformationKind[]>={
 make10:["combine","regroup"],bridge10:["split","regroup"],double:["combine"],near_double:["substitute","compensate"],
 compensation:["substitute","compensate"],split:["split","regroup"],distributive:["split","expand"],friendly_25_50_125:["split","regroup","simplify"],
 fact_recall:[],place_value:["regroup","simplify"],
};

export function arithmeticItemToEntity(item:ArithmeticItem):MathEntity{
 const transformations=(STRATEGY_TO_TRANSFORMS[item.strategy]||[]).map((kind,i)=>({id:`${item.id}-t${i+1}`,kind,from:item.prompt,to:item.prompt,reason:item.strategy}));
 return {id:`arith:${item.id}`,domain:"arithmetic",canonical:item.prompt,representations:[{id:`${item.id}-r1`,kind:"numeric",form:item.prompt}],structures:[item.strategyNode||item.strategy],transformations,goals:["accuracy","fluency","structure","strategy","transfer"],curricula:["GLOBAL"]};
}

export function inferMasteryStage(a:ArithmeticAttempt):MasteryStage{
 const hinted=Number(a.item.meta?.hintLevel||0)>0;
 if(!a.correct)return hinted?"assisted":"recognized";
 if(hinted)return"assisted";
 if(a.firstInputMs<=a.item.expectedMs*.75&&a.edits===0&&a.backspaces===0)return"automatic";
 if(a.firstInputMs<=a.item.expectedMs*1.1)return"independent";
 return"recognized";
}

export function arithmeticAttemptToSignal(a:ArithmeticAttempt):LearnerSignal{
 return {entityId:`arith:${a.item.id}`,strategyId:a.item.strategy,stage:inferMasteryStage(a),correct:a.correct,latencyMs:a.firstInputMs,hintLevel:Number(a.item.meta?.hintLevel||0),transformations:STRATEGY_TO_TRANSFORMS[a.item.strategy]||[],timestamp:Math.round(a.submittedAt)};
}
