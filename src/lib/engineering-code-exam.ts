/** Original public mock examination, not real hiring certification.
 * Questions and validation inputs are visible in client assets.
 */
import {ENGINEERING_CODE_CHALLENGES} from "./engineering-code-tracks";
export const ENGINEERING_MOCK_VERSION="socthink-engineering-mock-20261102-v1";
export const ENGINEERING_MOCK_MINUTES=60;
export const ENGINEERING_MOCK_ITEMS=[
 {id:"fe-form",area:"前端开发",points:15},
 {id:"fe-products",area:"前端开发",points:15},
 {id:"be-pages",area:"后端开发",points:20},
 {id:"be-access",area:"后端开发",points:20},
 {id:"qa-errors",area:"测试与SRE",points:15},
 {id:"qa-escalation",area:"测试与SRE",points:15},
] as const;
export const ENGINEERING_MOCK_QUESTIONS=ENGINEERING_MOCK_ITEMS.map(x=>{
 const task=ENGINEERING_CODE_CHALLENGES.find(t=>t.id===x.id);
 if(!task)throw Error("UNKNOWN_EXAM_TASK:"+x.id);
 return {...x,task};
});
export function validateEngineeringMock(){
 const errors:string[]=[];
 if(ENGINEERING_MOCK_ITEMS.length!==6)errors.push("EXPECTED_SIX_TASKS");
 if(ENGINEERING_MOCK_ITEMS.reduce((n,q)=>n+q.points,0)!==100)errors.push("TOTAL_NOT_100");
 if(new Set(ENGINEERING_MOCK_ITEMS.map(q=>q.id)).size!==6)errors.push("DUPLICATE_TASK");
 return errors;
}
export type CodeExamMark={id:string;passed:number;total:number;message:string;};
export function summarizeEngineeringMock(marks:readonly CodeExamMark[]){
 const scoreById=new Map(marks.map(m=>[m.id,m]));
 const areas=["前端开发","后端开发","测试与SRE"] as const;
 const tasks=ENGINEERING_MOCK_QUESTIONS.map(item=>{
  const mark=scoreById.get(item.id);
  const passed=Math.max(0,Math.min(4,Math.floor(mark?.passed??0)));
  const points=item.points*passed/4;
  return {id:item.id,title:item.task.title,area:item.area,maxPoints:item.points,
    passed,total:4,points,message:mark?.message??"未提交有效代码"};
 });
 const total=tasks.reduce((sum,t)=>sum+t.points,0);
 const dimensions=areas.map(area=>{
  const local=tasks.filter(t=>t.area===area);
  return {area,maxPoints:local.reduce((s,t)=>s+t.maxPoints,0),
   points:local.reduce((s,t)=>s+t.points,0)};
 });
 return {total,maxPoints:100,questions:tasks,dimensions};
}
