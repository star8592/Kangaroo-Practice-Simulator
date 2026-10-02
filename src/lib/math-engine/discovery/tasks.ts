import type { MathEntity } from "../core/model";
import { strategiesFor } from "../strategy/graph";

export type DiscoveryChoice={id:string;label:string;valid:boolean;note:string};
export type StructureDiscoveryTask={id:string;prompt:string;questionZh:string;questionEn:string;choices:DiscoveryChoice[];strategyIds:string[]};

export function buildStructureDiscoveryTask(entity:MathEntity):StructureDiscoveryTask{
 const strategies=strategiesFor(entity);
 const valid=entity.representations.slice(0,2).map((r,i)=>({id:`valid-${i}`,label:r.form,valid:true,note:r.purpose||"等价且有助于看见结构"}));
 const fallback:DiscoveryChoice={id:"direct",label:entity.canonical,valid:true,note:"原表示仍然合法，但未必最省力"};
 return {id:`discovery:${entity.id}`,prompt:entity.canonical,questionZh:"先别算：哪种表示最值得继续？",questionEn:"Do not calculate yet: which representation is most useful next?",choices:[...valid,fallback],strategyIds:strategies.map(s=>s.id)};
}
