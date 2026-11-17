export type StudentClassAssignment={
 id:string;title:string;lifecycle:"published"|"closed";published_at:string|null;
 sentence_count:number;receipt_status:string;claimed:boolean;submitted:boolean;
 attempt_count:number;best_score:number|null;feedback_count:number;
};
export type StudentTaskHistory={
 receipt_status:string;submitted:boolean;attempt_count:number;
 attempts:Array<{attempt_id:string;score:number|null;time:string;model_version:string}>;
 teacher_feedback:Array<{comment:string;at:string}>;
};
export type StudentTaskItems={
 assignment_id:string;title:string;lifecycle:"published"|"closed";
 items:Array<{ordinal:number;sentence:string}>;
};
export function validAssignment(value:unknown):value is StudentClassAssignment{
 if(!value||typeof value!=="object")return false;
 const a=value as Record<string,unknown>;
 return typeof a.id==="string"&&/^[a-f0-9-]{36}$/i.test(a.id) &&
  typeof a.title==="string"&&a.title.length>0&&a.title.length<=160 &&
  (a.lifecycle==="published"||a.lifecycle==="closed") &&
  typeof a.sentence_count==="number"&&a.sentence_count>=0 &&
  typeof a.attempt_count==="number"&&a.attempt_count>=0 &&
  typeof a.feedback_count==="number"&&a.feedback_count>=0 &&
  typeof a.submitted==="boolean"&&typeof a.claimed==="boolean" &&
  (a.best_score===null||(typeof a.best_score==="number"&&
   Number.isFinite(a.best_score)&&a.best_score>=0&&a.best_score<=100));
}
export function assignmentStatus(a:StudentClassAssignment):string{
 if(a.submitted)return "已提交";
 if(a.lifecycle==="closed")return "已结束";
 if(a.claimed||a.attempt_count>0)return "练习中";
 return "待开始";
}
export function scoreLabel(score:number|null):string{
 return typeof score==="number"&&Number.isFinite(score)&&score>=0&&score<=100?
  (Math.round(score*10)/10).toString()+" 分":"暂无评分";
}
