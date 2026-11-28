// Strict server-side browser submission parser. No client scores or owner IDs.
import {prepareScoringSubmission,type ScoringSubmission} from "./wuhan-scoring-job";
const record=(x:unknown):Record<string,unknown>=>{if(!x||typeof x!=="object"||Array.isArray(x))throw Error("invalid submission");return x as Record<string,unknown>};
const only=(o:Record<string,unknown>,keys:string[])=>{if(Object.keys(o).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(o,k)))throw Error("invalid fields")};
export function parseScoringSubmission(id:string,value:unknown):ScoringSubmission{
 const o=record(value);only(o,["paper","choices","recordings","noticeVersion","guardianConfirmed"]);
 if(o.noticeVersion!=="wuhan-recording-v1"||o.guardianConfirmed!==true||typeof o.paper!=="string"||!Array.isArray(o.choices)||o.choices.length>8||!Array.isArray(o.recordings)||o.recordings.length>10)throw Error("confirmation or submission invalid");
 const choices=o.choices.map(v=>{const r=record(v);only(r,["task","selected"]);if(typeof r.task!=="string"||typeof r.selected!=="number")throw Error("choice invalid");return {task:r.task,selected:r.selected}});
 const recordings=o.recordings.map(v=>{const r=record(v);only(r,["task","mime","audioBase64"]);if(typeof r.task!=="string"||typeof r.mime!=="string"||typeof r.audioBase64!=="string"||r.audioBase64.length>2796204||r.audioBase64.length%4!==0)throw Error("recording invalid");const audio=Buffer.from(r.audioBase64,"base64");if(audio.toString("base64")!==r.audioBase64)throw Error("invalid base64");return {task:r.task,mime:r.mime,audio}});
 const s={attemptId:id,paper:o.paper,choices,recordings};
 prepareScoringSubmission(s);
 return s;
}
