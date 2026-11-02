import {INSTRUMENTS} from "./measurement-center";

export type EvidenceRecord={
 readonly id:string;readonly name:string;readonly path:string;readonly version:string;
 readonly category:"自我探索"|"原创任务练习";readonly source:string;readonly permission:string;
 readonly scoring:string;readonly audience:string;readonly evidenceStatus:string;
 readonly limitations:string;readonly normAvailable:false;
 readonly fullReportOffer:"optional-after-verification"|"not-offered";
};
const exploratory:EvidenceRecord[]=INSTRUMENTS.map(item=>({
 id:item.id,name:item.title,path:"/assessment-center/"+item.id,version:item.version,
 category:"自我探索",source:item.source,permission:item.license,scoring:item.methodology,
 audience:item.audience,evidenceStatus:"原量表或理论来源已标注；中文本土信度、效度和常模证据尚未建立。",
 limitations:"仅为自我探索，不应用于临床诊断、招聘、升学筛选或人群比较。",
 normAvailable:false,fullReportOffer:"optional-after-verification"
}));
export const ASSESSMENT_EVIDENCE:readonly EvidenceRecord[]=[
 ...exploratory,
 {id:"work-values-30",name:"职业价值观探索 · 30题",path:"/assessment-center/work-values-30",version:"work-values-original-20261102-v1",
  category:"自我探索",source:"SOCTHINK原创职业需求题项；六维主题参考O*NET Work Values。",
  permission:"原创题项，不是O*NET Work Importance Locator或官方问卷。",
  scoring:"六维各5题，1–5分自评均值，只呈现本次回答及行动建议。",
  audience:"18岁及以上成年人",evidenceStatus:"题项、维度与计分算法有自动化复核；无本土信效度与常模。",
  limitations:"不可推断最佳职业、人格优劣、招聘录用概率或相对于他人的等级。",
  normAvailable:false,fullReportOffer:"not-offered"},
 {id:"work-style-24",name:"工作方式探索 · 24题",path:"/assessment-center/work-style-24",version:"work-style-original-20261102-v1",
  category:"自我探索",source:"SOCTHINK原创工作计划、试验、沟通及独立推进的行为自评题。",
  permission:"原创中文题项，不复制商业工作风格量表或计分规则。",
  scoring:"四维各6题，含反向题，1–5分自我描述均值。",
  audience:"18岁及以上成年人",evidenceStatus:"自动复核正反向评分、题量与完整性；无中国常模和效度。",
  limitations:"不能推断稳定人格、职业表现、领导能力、晋升资格或招聘结果。",
  normAvailable:false,fullReportOffer:"not-offered"},
 {id:"workplace-sjt-24",name:"职场情境判断 · 24题",path:"/assessment-center/workplace-sjt-24",version:"workplace-sjt-original-20261102-v1",
  category:"原创任务练习",source:"SOCTHINK自编案例与参考策略；形式参考美国OPM公开SJT指南。",
  permission:"全部场景、选项和解析为原创，不复制招聘企业试题。",
  scoring:"沟通、协作、质量、交付各6题，选项预设0–3参考分，交卷逐题解释。",
  audience:"18岁及以上成年人训练",evidenceStatus:"参考策略尚未经过多名独立职业专家盲审，未建立有效性与公平性。",
  limitations:"不能作为经标定的正式SJT、心理测评、企业员工筛选、录用或晋升判断。",
  normAvailable:false,fullReportOffer:"not-offered"},
 {id:"advanced-reasoning-40",name:"高级逻辑与批判性推理 · 40题",path:"/assessment-center/advanced-reasoning-40",version:"advanced-reasoning-original-20261102-v1",
  category:"原创任务练习",source:"SOCTHINK原创40道文字、条件、数列与证据题。分类参考公开SHL、Pearson TalentLens及美国OPM的推理能力描述。",
  permission:"全部题干、选项、答案与解析均自主编写；不是SHL Verify、Watson-Glaser、OPM或其他商业测验的官方题。",
  scoring:"5类各8题，固定45分钟，40题单选；每题1分，未答或答错0分；支持暂停页面恢复、自动到时交卷、逐题解释。",
  audience:"18岁及以上成年人逻辑与求职训练",evidenceStatus:"题库结构、答案均衡、评分、空题及完整模拟流程由自动化核查；尚未经独立心理测量验证和专家联合内容审校。",
  limitations:"不能作为标准化IQ、招聘资格、潜能等级、人群百分位、临床诊断或实际录取预测。",
  normAvailable:false,fullReportOffer:"not-offered"},
 {id:"career-aptitude-40",name:"招聘通用能力完整模拟卷 · 40题",path:"/assessment-center/career-aptitude-40",version:"career-aptitude-original-20261102-v1",
  category:"原创任务练习",source:"SOCTHINK原创言语、数量、逻辑、资料分析、空间推理训练题；分类参考公开招聘通用能力描述。",
  permission:"原创模拟卷，不属于任何招聘企业、北森或牛客的官方真题。",
  scoring:"五类各8题，固定45分钟，40题单选；每题1分，未答或答错0分；可跳题、标记并查看答案解析。",
  audience:"求职及备考成年人",evidenceStatus:"自动化计分及答卷流程测试已建立；暂无专家内容盲审、心理测量学信效度与常模。",
  limitations:"不能代表任何企业正式笔试分数、国家职业资格、录用概率、能力常模百分位或IQ等级。",
  normAvailable:false,fullReportOffer:"not-offered"},
 {id:"reasoning-practice-20",name:"认知推理任务练习 · 20题",path:"/assessment-center/reasoning-practice-20",version:"reasoning-original-v1",
 category:"原创任务练习",source:"SOCTHINK 原创题项：数量、逻辑、方位、信息判断。",
 permission:"平台自主编写题目，不复制标准 IQ 测验。",
 scoring:"20道选择题，每类5题；按预先固定答案逐题计算原始正确数。",
 audience:"18岁及以上成年人研究练习",evidenceStatus:"题目与评分有自动化测试；尚无标准化信度、效度、年龄常模。",
 limitations:"不得声称测得 IQ、智力等级、招生资格或人群排名。",normAvailable:false,fullReportOffer:"not-offered"},
 {id:"reading-practice-16",name:"阅读理解与证据判断 · 16题",path:"/assessment-center/reading-practice-16",version:"reading-original-v1",
 category:"原创任务练习",source:"SOCTHINK原创四篇短文与16道阅读题。",
 permission:"平台原创材料，不使用未授权教材或真实学习档案。",
 scoring:"四类阅读动作各四题；单题正确与否和原文证据段对应，并按真实失分给出练习建议。",
 audience:"建议小学高年级及以上阅读者；未满14岁需监护人同意。",
 evidenceStatus:"原文证据可逐题核对、答案可自动验证；尚无年级常模、信度或效度研究。",
 limitations:"不可推断学年水平、阅读障碍、稳定学习能力或升学表现。",normAvailable:false,fullReportOffer:"not-offered"},
];
export function validateEvidenceRegistry():string[]{
 const errors:string[]=[];
 const seen=new Set<string>();
 for(const e of ASSESSMENT_EVIDENCE){
  if(seen.has(e.id))errors.push("DUPLICATE:"+e.id);seen.add(e.id);
  if(e.normAvailable||!e.evidenceStatus||!e.scoring||!e.version)errors.push("MISSING_OR_UNSAFE:"+e.id);
  if(!e.path.startsWith("/assessment-center/"))errors.push("INVALID_PATH:"+e.id);
 }
 if(ASSESSMENT_EVIDENCE.length!==9)errors.push("EXPECTED_NINE_MEASUREMENT_PRODUCTS");
 if(ASSESSMENT_EVIDENCE.filter(x=>x.fullReportOffer==="optional-after-verification").length!==2)
   errors.push("EXPECTED_TWO_OPTIONAL_REPORT_PRODUCTS");
 return errors;
}
