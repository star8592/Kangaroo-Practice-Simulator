import raw from "../../data/competition-intelligence/verified-editions.json";
import type {WorldRegion} from "./world-competitions";
import {WORLD_COMPETITIONS} from "./world-competitions";

export type ParticipationRegion = Exclude<WorldRegion,"global">;
export const PARTICIPATION_REGIONS: ParticipationRegion[]=["CN","US","AU","CA","GB"];
export type MilestoneType = "registration-deadline"|"exam"|"device-check"|"result-release";
export type EvidenceEdition = {
  id:string; eventId:string; sessionId:string; season:number; region:ParticipationRegion;
  titleZh:string; sourceUrl:string; sourceAuthority:"organizer"|"regional-operator";
  verifiedBy:string; verifiedAt:string; validThrough:string; verification:"verified";
  minGrade?:number; maxGrade?:number;
  milestones:{id:string;kind:MilestoneType;date:string;titleZh:string;audience?:"participant"|"competition-manager"}[];
};
export type Priority = "P0"|"P1"|"P2"|"P3";
export type VerifiedNotice = {
  id:string;eventId:string;sessionId:string;titleZh:string;detailZh:string;
  date:string;daysUntil:number;priority:Priority;sourceUrl:string;verifiedAt:string;
  kind:MilestoneType;
};

function isDay(s:unknown):s is string {
  if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const dt=new Date(s+"T00:00:00Z");
  return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===s;
}
const dayNumber=(s:string)=>Date.parse(s+"T00:00:00Z")/86400000;
const validUrl=(s:unknown):boolean=>{
  if(typeof s!=="string")return false;
  try {const u=new URL(s);return u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}
};
export function validateEvidenceEdition(value:unknown):value is EvidenceEdition {
  if(!value||typeof value!=="object")return false;
  const v=value as Partial<EvidenceEdition>;
  if(v.verification!=="verified"||!v.id||!v.sessionId||!v.titleZh||
    typeof v.id!=="string"||typeof v.sessionId!=="string"||typeof v.titleZh!=="string"||
    !/^[a-z0-9-]{5,100}$/.test(v.id)||!/^[a-z0-9-]{5,100}$/.test(v.sessionId)||
    !WORLD_COMPETITIONS.some(c=>c.id===v.eventId)||
    !PARTICIPATION_REGIONS.includes(v.region as ParticipationRegion)||
    v.sourceAuthority!=="organizer"&&v.sourceAuthority!=="regional-operator"||
    typeof v.verifiedBy!=="string"||v.verifiedBy.trim().length<3||
    !Number.isInteger(v.season)||v.season!<2025||v.season!>2100||
    !isDay(v.verifiedAt)||!isDay(v.validThrough)||
    !validUrl(v.sourceUrl)||!Array.isArray(v.milestones)||v.milestones.length<1||v.milestones.length>12
  )return false;
  if(dayNumber(v.validThrough)-dayNumber(v.verifiedAt)<0||
    dayNumber(v.validThrough)-dayNumber(v.verifiedAt)>180)return false;
  if(v.minGrade!==undefined&&(!Number.isInteger(v.minGrade)||v.minGrade<1||v.minGrade>13))return false;
  if(v.maxGrade!==undefined&&(!Number.isInteger(v.maxGrade)||v.maxGrade<1||v.maxGrade>13))return false;
  if(v.minGrade!==undefined&&v.maxGrade!==undefined&&v.minGrade>v.maxGrade)return false;
  const keys=new Set<string>();
  for(const m of v.milestones){
    if(!m||typeof m!=="object"||typeof m.id!=="string"||!/^[a-z0-9-]{3,100}$/.test(m.id)||
      keys.has(m.id)||!["registration-deadline","exam","device-check","result-release"].includes(m.kind)||
      typeof m.titleZh!=="string"||!m.titleZh.trim()||!isDay(m.date)||
      (m.audience!==undefined&&!["participant","competition-manager"].includes(m.audience))||
      dayNumber(m.date)<dayNumber(v.verifiedAt)-365||
      dayNumber(m.date)>dayNumber(v.verifiedAt)+365)return false;
    keys.add(m.id);
  }
  return true;
}
/** One submitted JSON item is not sufficient evidence: this registry is PR-reviewed, never user-writable. */
export const VERIFIED_EDITIONS:EvidenceEdition[]=(raw as unknown[]).filter(validateEvidenceEdition);
export function invalidEvidenceCount(values:unknown[]):number {
  return values.filter(v=>!validateEvidenceEdition(v)).length;
}
export function deriveVerifiedNotices(args:{
  editions:EvidenceEdition[];followedEventIds:string[];participationRegion:ParticipationRegion|null;
  grade:number|null;registeredSessionIds:string[];today:string;
}):VerifiedNotice[]{
  if(!isDay(args.today)||!args.participationRegion)return [];
  const known=new Set(args.followedEventIds);
  const registered=new Set(args.registeredSessionIds);
  const out:VerifiedNotice[]=[];
  const seen=new Set<string>();
  for(const e of args.editions){
    if(!validateEvidenceEdition(e)||!known.has(e.eventId)||e.region!==args.participationRegion)continue;
    if(!isDay(e.verifiedAt)||!isDay(e.validThrough)||e.verifiedAt>args.today||e.validThrough<args.today)continue;
    if(args.grade!==null&&((e.minGrade!==undefined&&args.grade<e.minGrade)||
      (e.maxGrade!==undefined&&args.grade>e.maxGrade)))continue;
    for(const m of e.milestones){
      const days=dayNumber(m.date)-dayNumber(args.today);
      if(days<0||days>30)continue;
      if(m.kind!=="registration-deadline"&&!registered.has(e.sessionId))continue;
      const id=e.id+":"+m.id;
      if(seen.has(id))continue;
      seen.add(id);
      const isManagerDeadline=m.kind==="registration-deadline"&&m.audience==="competition-manager";
      const priority:Priority=isManagerDeadline?"P3":days<=3?"P0":days<=7?"P1":days<=14?"P2":"P3";
      const qualifier=isManagerDeadline
        ?"此日期适用于美国考点管理人，并非学生个人报名截止。家长须向本地区学校或获授权考点另行确认具体报名安排。"
        :m.kind==="registration-deadline"
          ?"此报名日期须按官方规定核实个人资格与办理渠道；关注本赛事不代表报名完成。"
          :"你已登记该场次，请核对准考证、考点及考试安排。";
      out.push({id,eventId:e.eventId,sessionId:e.sessionId,titleZh:e.titleZh+" · "+m.titleZh,
        detailZh:qualifier,date:m.date,daysUntil:days,priority,sourceUrl:e.sourceUrl,
        verifiedAt:e.verifiedAt,kind:m.kind});
    }
  }
  const weights={P0:0,P1:1,P2:2,P3:3};
  return out.sort((a,b)=>weights[a.priority]-weights[b.priority]||
    a.daysUntil-b.daysUntil||a.id.localeCompare(b.id));
}
