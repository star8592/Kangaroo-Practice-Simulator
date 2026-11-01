import raw from "../../data/career/enterprise_universe_seed_20261101.json";

export type CareerEnterpriseKind =
  "china_listed"|"china_related_us_listed"|"foreign_china_operation"|
  "joint_venture_china"|"china_unlisted_key_employer";
export type CareerMarket = "SSE"|"SZSE"|"BSE"|"HKEX"|"NYSE"|"NASDAQ";
export type EnterpriseListing=Readonly<{
  exchange:CareerMarket;
  ticker:string;
  proofUrl:string;
  status:"verified_reference";
}>;
export type EnterpriseRecruitmentSource=Readonly<{
  url:string;
  review:"source_discovered";
  chinaVacancies:"verify_per_job";
}>;
export type CareerEnterprise=Readonly<{
  id:string;
  displayName:string;
  entityKind:CareerEnterpriseKind;
  listings:readonly EnterpriseListing[];
  recruitmentSources:readonly EnterpriseRecruitmentSource[];
  entityProofUrl:string|null;
  parentGroupNames:readonly string[];
  chinaRelevance:"china_business_reference"|"operations_confirmed";
  observedAt:string;
}>;

const ENTERPRISES:readonly CareerEnterprise[]=raw.companies as CareerEnterprise[];
export const CAREER_UNIVERSE_AS_OF:string=raw.asOf;

export const CAREER_ENTERPRISE_GROUPS=[
  {id:"china_listed",title:"境内及香港上市中国企业",caption:"沪深北、港股和多地上市企业；一家集团只有一个身份"},
  {id:"china_related_us_listed",title:"美国上市中国业务相关企业",caption:"纽交所、纳斯达克上市；须核查是否确有中国经营和岗位"},
  {id:"foreign_china_operation",title:"在华外资企业",caption:"外资母集团与中国招聘主体区分记录"},
  {id:"joint_venture_china",title:"中外合资企业",caption:"招聘由具体合资实体负责，不直接并入股东岗位"},
  {id:"china_unlisted_key_employer",title:"重要非上市企业",caption:"华为等重要招聘企业，不因上市身份而漏掉"},
] as const;

function validHttpUrl(value:string):boolean{
  try{const u=new URL(value);return u.protocol==="https:";}catch{return false;}
}

export function getCareerEnterprises():readonly CareerEnterprise[]{return ENTERPRISES;}

export function getCareerEnterprise(id:string):CareerEnterprise|undefined{
  return ENTERPRISES.find(c=>c.id===id);
}

/** Multiple ticker symbols for one company are NOT multiple employers. */
export function summarizeCareerEnterprises(){
  return {
    knownGroups:ENTERPRISES.length,
    listingReferences:ENTERPRISES.reduce((n,c)=>n+c.listings.length,0),
    exchangeMarkets:new Set(ENTERPRISES.flatMap(c=>c.listings.map(l=>l.exchange))).size,
    inChinaForeign:ENTERPRISES.filter(c=>c.entityKind==="foreign_china_operation").length,
    jointVentures:ENTERPRISES.filter(c=>c.entityKind==="joint_venture_china").length,
    actualVacanciesVerified:0, // This universe holds company identity, not JD evidence
  };
}

export function validateCareerEnterpriseUniverse():string[]{
  const errors:string[]=[];
  const ids=new Set<string>();
  const tickers=new Map<string,string>();
  const validKinds=new Set<string>(CAREER_ENTERPRISE_GROUPS.map(x=>x.id));
  for(const c of ENTERPRISES){
    if(!/^[a-z][a-z0-9-]{2,100}$/.test(c.id))errors.push("invalid-id:"+c.id);
    if(ids.has(c.id))errors.push("duplicate-enterprise:"+c.id);
    ids.add(c.id);
    if(!c.displayName.trim()||!validKinds.has(c.entityKind))errors.push("invalid-kind-or-name:"+c.id);
    if(c.entityKind==="joint_venture_china"&&c.parentGroupNames.length<2)
      errors.push("missing-jv-parents:"+c.id);
    if(!c.listings.length&&!c.recruitmentSources.length)
      errors.push("no-references:"+c.id);
    if(c.entityProofUrl&&!validHttpUrl(c.entityProofUrl))errors.push("invalid-company-proof:"+c.id);
    for(const l of c.listings){
      const key=l.exchange+":"+l.ticker.toUpperCase();
      if(tickers.has(key)&&tickers.get(key)!==c.id)
        errors.push("listing-clashes:"+key);
      tickers.set(key,c.id);
      if(!validHttpUrl(l.proofUrl)||!l.ticker.trim())
        errors.push("bad-listing:"+c.id);
    }
    for(const r of c.recruitmentSources){
      if(!validHttpUrl(r.url)||r.chinaVacancies!=="verify_per_job")
        errors.push("invalid-recruit-source:"+c.id);
    }
  }
  return errors;
}

export function searchCareerEnterprises(query:string,kind=""):CareerEnterprise[]{
  const term=query.trim().toLocaleLowerCase("zh-CN").slice(0,120);
  return ENTERPRISES.filter(c=>{
    if(kind&&c.entityKind!==kind)return false;
    if(!term)return true;
    const hay=[c.displayName,c.id,...c.listings.map(x=>x.ticker),
      ...c.parentGroupNames].join(" ").toLocaleLowerCase("zh-CN");
    return hay.includes(term);
  });
}

/** Stable business group join: a company may have A+H or H+US securities. */
export function enterpriseIdForMarketTicker(market:string,ticker:string):string|null{
  const symbol=ticker.trim().toUpperCase();
  return ENTERPRISES.find(c=>c.listings.some(l=>l.exchange===market&&l.ticker.toUpperCase()===symbol))?.id??null;
}
