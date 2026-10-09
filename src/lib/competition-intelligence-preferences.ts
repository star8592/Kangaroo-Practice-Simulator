import {atomicWriteJson,readJsonArray,userDataPath} from "./user-data-store";
import {PARTICIPATION_REGIONS,type ParticipationRegion} from "./competition-intelligence";

type StudentRegionChoice={userId:string;region:ParticipationRegion|null;updatedAt:number};
const FILE=userDataPath("world-competition-regions.json");

export function getParticipationRegion(userId:string):ParticipationRegion|null {
  const r=readJsonArray<StudentRegionChoice>(FILE).find(x=>x.userId===userId)?.region;
  return r&&PARTICIPATION_REGIONS.includes(r)?r:null;
}
export function setParticipationRegion(userId:string,region:ParticipationRegion|null){
  if(region!==null&&!PARTICIPATION_REGIONS.includes(region))throw new Error("invalid region");
  const rows=readJsonArray<StudentRegionChoice>(FILE);
  const i=rows.findIndex(x=>x.userId===userId);
  const next={userId,region,updatedAt:Date.now()};
  if(i>=0)rows[i]=next;else rows.push(next);
  atomicWriteJson(FILE,rows);
  return region;
}
