import {CODE_CHALLENGES,CODE_LAB_VERSION} from "./code-lab";
import type {CodeChallenge} from "./code-lab";

export type CodeLabSnapshot={
 version:string;
 stage:"practice"|"report";
 index:number;
 drafts:Record<string,string>;
 solved:Record<string,boolean>;
 attempts:Record<string,number>;
};
export const CODE_LAB_SESSION_KEY="socthink:code-lab:"+CODE_LAB_VERSION;
export function parseCodeLabSnapshot(raw:string|null,challenges:readonly CodeChallenge[]=CODE_CHALLENGES,version:string=CODE_LAB_VERSION):CodeLabSnapshot|null{
 const knownIds=new Set(challenges.map(c=>c.id));
 if(!raw||raw.length>36000)return null;
 try{
  const obj=JSON.parse(raw) as Partial<CodeLabSnapshot>;
  if(obj.version!==version||(obj.stage!=="practice"&&obj.stage!=="report")
   ||typeof obj.index!=="number"||!Number.isInteger(obj.index)||obj.index<0||obj.index>=challenges.length
   ||!obj.drafts||!obj.solved||!obj.attempts
   ||Array.isArray(obj.drafts)||Array.isArray(obj.solved)||Array.isArray(obj.attempts)
   ||typeof obj.drafts!=="object"||typeof obj.solved!=="object"||typeof obj.attempts!=="object")return null;
  const valid=(record:Record<string,unknown>,check:(v:unknown)=>boolean)=>
   Object.entries(record).every(([id,val])=>knownIds.has(id)&&check(val));
  if(!valid(obj.drafts,v=>typeof v==="string"&&v.length<=5000)
   ||!valid(obj.solved,v=>typeof v==="boolean")
   ||!valid(obj.attempts,v=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=100000))return null;
  if(obj.stage==="report"&&!challenges.every(c=>obj.solved![c.id]))return null;
  return obj as CodeLabSnapshot;
 }catch{return null;}
}

export type CodeIndentResult={source:string;start:number;end:number};
/** Indent/unindent the selected lines, or insert spaces at the caret. */
export function indentCodeSource(source:string,start:number,end:number,shift:boolean):CodeIndentResult{
 if(start<0||end<start||end>source.length)return {source,start,end};
 const lineStart=source.lastIndexOf("\n",start-1)+1;
 if(!shift&&!source.slice(start,end).includes("\n")){
  return {source:source.slice(0,start)+"  "+source.slice(end),start:start+2,end:start+2};
 }
 // A selection ending at the beginning of a subsequent line should not alter that line.
 const effectiveEnd=end>lineStart&&source[end-1]==="\n"?end-1:end;
 const segment=source.slice(lineStart,effectiveEnd);
 const lines=segment.split("\n");
 const edits=lines.map(line=>shift?line.replace(/^ {1,2}/,""):"  "+line);
 const updated=edits.join("\n");
 const changed=updated.length-segment.length;
 const firstDiff=edits[0].length-lines[0].length;
 return {
  source:source.slice(0,lineStart)+updated+source.slice(effectiveEnd),
  start:Math.max(lineStart,start+firstDiff),
  end:Math.max(lineStart,end+changed),
 };
}
