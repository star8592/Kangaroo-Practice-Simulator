import type { MathEntity } from "../core/model";
import { strategiesFor } from "../strategy/graph";

export type DiscoveryChoice={id:string;label:string;valid:boolean;preferred:boolean;note:string};
export type StructureDiscoveryTask={id:string;prompt:string;questionZh:string;questionEn:string;choices:DiscoveryChoice[];strategyIds:string[]};

function stableOrder<T>(items:T[],seed:string){
 const h=[...seed].reduce((n,c)=>((n*33)^c.charCodeAt(0))>>>0,5381);
 if(items.length<2)return items;const shift=h%items.length;return [...items.slice(shift),...items.slice(0,shift)];
}

export function buildStructureDiscoveryTask(entity:MathEntity):StructureDiscoveryTask{
 const strategies=strategiesFor(entity);
 const transformed=entity.representations.filter(r=>r.form!==entity.canonical).slice(0,3).map((r,i)=>({id:`transform-${i}`,label:r.form,valid:true,preferred:r.utility!=="neutral",note:r.purpose||"等价表示"}));
 const choices=stableOrder(transformed,entity.id);
 return {id:`discovery:${entity.id}`,prompt:entity.canonical,questionZh:"先别算：哪种变形最值得继续？",questionEn:"Do not calculate yet: which transformation is most useful next?",choices,strategyIds:strategies.map(s=>s.id)};
}
