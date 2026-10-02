import type { MathEntity } from "../core/model";
import { strategiesFor } from "../strategy/graph";

export type DiscoveryChoice={id:string;label:string;valid:boolean;preferred:boolean;note:string};
export type StructureDiscoveryTask={id:string;prompt:string;questionZh:string;questionEn:string;choices:DiscoveryChoice[];strategyIds:string[]};

export function buildStructureDiscoveryTask(entity:MathEntity):StructureDiscoveryTask{
 const strategies=strategiesFor(entity);
 const transformed=entity.representations.filter(r=>r.form!==entity.canonical).slice(0,3).map((r,i)=>({id:`transform-${i}`,label:r.form,valid:true,preferred:true,note:r.purpose||"等价且更容易看见结构"}));
 const direct:DiscoveryChoice={id:"direct",label:entity.canonical,valid:true,preferred:false,note:"原式当然正确，但还没有主动换到更有利的表示"};
 const choices=transformed.length?[...transformed,direct]:[direct];
 return {id:`discovery:${entity.id}`,prompt:entity.canonical,questionZh:"先别算：哪种表示最值得继续？",questionEn:"Do not calculate yet: which representation is most useful next?",choices,strategyIds:strategies.map(s=>s.id)};
}
