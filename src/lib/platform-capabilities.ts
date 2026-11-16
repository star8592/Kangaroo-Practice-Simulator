/** Platform-wide module identifiers. Visible management routes are NOT grants. */
import {ENGLISH_PRODUCTS} from "./english-products";

export type PlatformRole="teacher"|"module-admin";
export type PlatformScopeKind="product"|"organization";

const MANAGEMENT_LINKS={
  pronunciation:"/english/pronunciation/app/teacher/homework",
  vocabulary:"/english/vocabulary/app/teacher/access",
} as const;
export const PLATFORM_CAPABILITIES=[
  ...ENGLISH_PRODUCTS.map(item=>({
    id:item.capability, name:item.name, product:item.product,
    managementUrl:item.id==="pronunciation"?MANAGEMENT_LINKS.pronunciation:
      item.id==="vocabulary"?MANAGEMENT_LINKS.vocabulary:null,
    implemented:item.id==="pronunciation"||item.id==="vocabulary",
  })),
  {id:"math.competition",name:"数学竞赛",product:"SOC THINK · 数学",
    managementUrl:null,implemented:false},
] as const;
export type PlatformCapability=typeof PLATFORM_CAPABILITIES[number]["id"];
export function platformCapability(id:unknown){
  return typeof id==="string"?PLATFORM_CAPABILITIES.find(x=>x.id===id):undefined;
}
export function platformRole(v:unknown):v is PlatformRole{
  return v==="teacher"||v==="module-admin";
}
export function platformScope(kind:unknown,value:unknown):
  {kind:PlatformScopeKind;id:string}|null{
  if(kind==="product"&&(value===""||value===undefined||value===null))
    return {kind:"product",id:""};
  if(kind==="organization"&&typeof value==="string"&&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))
    return {kind:"organization",id:value.toLowerCase()};
  return null;
}
export const PLATFORM_SUBJECT_PATTERN=/^par_[a-f0-9]{18}$/;
