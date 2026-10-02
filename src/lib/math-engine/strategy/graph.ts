import type { CurriculumTag,LearningGoal,MathEntity,TrainingPolicy,TransformationKind } from "../core/model";
export type StrategyNode={id:string;nameZh:string;nameEn:string;trigger:string;transformations:TransformationKind[];goals:LearningGoal[];curricula:CurriculumTag[];minStage?:"primary"|"middle"|"high";examples:string[]};
export const STRATEGY_GRAPH:StrategyNode[]=[
 {id:"round_compensation",nameZh:"补整与补偿",nameEn:"Round and compensate",trigger:"数字接近整十、整百、整千或其他友好数",transformations:["substitute","compensate"],goals:["fluency","structure","strategy","transfer"],curricula:["GLOBAL"],minStage:"primary",examples:["99×37","398+56"]},
 {id:"friendly_factor",nameZh:"友好因数重组",nameEn:"Friendly-factor regrouping",trigger:"存在25×4、50×2、125×8等可快速整化的因数组合",transformations:["split","regroup","simplify"],goals:["fluency","structure","strategy"],curricula:["GLOBAL"],minStage:"primary",examples:["25×48","125×32"]},
 {id:"common_factor",nameZh:"提取公因式",nameEn:"Extract common factor",trigger:"多个项共享因子",transformations:["factor","simplify"],goals:["structure","representation","strategy","transfer"],curricula:["GLOBAL"],minStage:"middle",examples:["3x+3y","2^(x+1)+2^x"]},
 {id:"difference_squares",nameZh:"平方差结构",nameEn:"Difference of squares",trigger:"两个平方量之差",transformations:["factor","equivalent_form"],goals:["structure","representation","transfer"],curricula:["GLOBAL"],minStage:"middle",examples:["x²-25","a²-b²"]},
];
export const POLICY_WEIGHTS:Record<TrainingPolicy,Partial<Record<LearningGoal,number>>>={exam:{fluency:1,accuracy:1,structure:.7,strategy:.8,transfer:.5},discovery:{structure:1,representation:1,reasoning:1,strategy:.8,transfer:.8},competition:{structure:1,strategy:1,reasoning:.9,transfer:1,fluency:.5}};
export function strategiesFor(entity:MathEntity){return STRATEGY_GRAPH.filter(s=>s.goals.some(g=>entity.goals.includes(g))&&s.transformations.some(t=>entity.transformations.some(x=>x.kind===t)));}
