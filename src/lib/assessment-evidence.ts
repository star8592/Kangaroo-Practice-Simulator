import {INSTRUMENTS} from "./measurement-center";

export type EvidenceRecord={
 readonly id:string;readonly name:string;readonly path:string;readonly version:string;
 readonly category:"自我探索"|"原创任务练习";readonly source:string;readonly permission:string;
 readonly scoring:string;readonly audience:string;readonly evidenceStatus:string;
 readonly limitations:string;readonly normAvailable:false;readonly paid:false;
};
const exploratory:EvidenceRecord[]=INSTRUMENTS.map(item=>({
 id:item.id,name:item.title,path:"/assessment-center/"+item.id,version:item.version,
 category:"自我探索",source:item.source,permission:item.license,scoring:item.methodology,
 audience:item.audience,evidenceStatus:"原量表或理论来源已标注；中文本土信度、效度和常模证据尚未建立。",
 limitations:"仅为自我探索，不应用于临床诊断、招聘、升学筛选或人群比较。",
 normAvailable:false,paid:false
}));
export const ASSESSMENT_EVIDENCE:readonly EvidenceRecord[]=[
 ...exploratory,
 {id:"reasoning-practice-20",name:"认知推理任务练习 · 20题",path:"/assessment-center/reasoning-practice-20",version:"reasoning-original-v1",
 category:"原创任务练习",source:"SOCTHINK 原创题项：数量、逻辑、方位、信息判断。",
 permission:"平台自主编写题目，不复制标准 IQ 测验。",
 scoring:"20道选择题，每类5题；按预先固定答案逐题计算原始正确数。",
 audience:"18岁及以上成年人研究练习",evidenceStatus:"题目与评分有自动化测试；尚无标准化信度、效度、年龄常模。",
 limitations:"不得声称测得 IQ、智力等级、招生资格或人群排名。",normAvailable:false,paid:false},
 {id:"sql-lab",name:"SQL岗位技能实训",path:"/assessment-center/sql-lab",version:"original-sql-v1",
 category:"原创任务练习",source:"SOCTHINK 原创虚构订单数据与四项 SQL 任务；使用 SQL.js/SQLite。",
 permission:"题目和数据为原创；SQL.js 依据 MIT 许可证使用，WASM 和许可证一并发布。",
 scoring:"SQLite浏览器Worker内真实执行；在两组独立虚构数据上比对预期列和有序结果。",
 audience:"18岁及以上成年人岗位技能练习",evidenceStatus:"SQL确定性执行和浏览器验收已建立；没有岗位预测效度或常模。",
 limitations:"只反映具体任务完成情况，不能当作职业资格证书或雇佣淘汰依据。",normAvailable:false,paid:false},
 {id:"reading-practice-16",name:"阅读理解与证据判断 · 16题",path:"/assessment-center/reading-practice-16",version:"reading-original-v1",
 category:"原创任务练习",source:"SOCTHINK原创四篇短文与16道阅读题。",
 permission:"平台原创材料，不使用未授权教材或真实学习档案。",
 scoring:"四类阅读动作各四题；单题正确与否和原文证据段对应，并按真实失分给出练习建议。",
 audience:"建议小学高年级及以上阅读者；未满14岁需监护人同意。",
 evidenceStatus:"原文证据可逐题核对、答案可自动验证；尚无年级常模、信度或效度研究。",
 limitations:"不可推断学年水平、阅读障碍、稳定学习能力或升学表现。",normAvailable:false,paid:false},
];
export function validateEvidenceRegistry():string[]{
 const errors:string[]=[];
 const seen=new Set<string>();
 for(const e of ASSESSMENT_EVIDENCE){
  if(seen.has(e.id))errors.push("DUPLICATE:"+e.id);seen.add(e.id);
  if(e.paid||e.normAvailable||!e.evidenceStatus||!e.scoring||!e.version)errors.push("MISSING_OR_UNSAFE:"+e.id);
  if(!e.path.startsWith("/assessment-center/"))errors.push("INVALID_PATH:"+e.id);
 }
 if(ASSESSMENT_EVIDENCE.length!==5)errors.push("EXPECTED_FIVE_PRODUCTS");
 return errors;
}
