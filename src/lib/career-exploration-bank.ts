/**
 * SOCTHINK ORIGINAL activity-preference questionnaires, not the O*NET Work
 * Importance Locator or a certified work-style inventory. Do not norm them.
 * The respondent's answers remain exclusively in the browser memory.
 */
export type DiscoveryArea = Readonly<{id:string;name:string;meaning:string;action:string}>;
export type DiscoveryItem = Readonly<{id:string;area:string;text:string;reverse:boolean}>;
export type DiscoverySurvey = Readonly<{
 id:"work-values-30"|"work-style-24";title:string;intro:string;version:string;
 reference:string;referenceUrl:string;areas:readonly DiscoveryArea[];
 items:readonly DiscoveryItem[];
}>;
const valueAreas:readonly DiscoveryArea[]=[
 {id:"achievement",name:"成果与成长",meaning:"偏好能看到实际成果、运用能力并不断提升的工作。",action:"对照两个岗位过去三个月的实际成果与学习机会。"},
 {id:"independence",name:"自主与创意",meaning:"偏好有决定工作方法、创造解决方案与独立负责的空间。",action:"向岗位从业者询问决策权限和审批链。"},
 {id:"recognition",name:"认可与发展",meaning:"偏好得到公正反馈、职级发展和承担更大责任的机会。",action:"查看岗位真实的晋升要求与反馈机制。"},
 {id:"relationships",name:"合作与意义",meaning:"偏好价值观一致、相互尊重并能帮助他人的工作关系。",action:"在岗位访谈中询问日常协作与用户受益方式。"},
 {id:"support",name:"组织与支持",meaning:"偏好清晰公平的组织规则、可获得的指导和可依赖的领导支持。",action:"核实岗位的导师制度、支持响应与管理流程。"},
 {id:"conditions",name:"报酬与环境",meaning:"偏好与个人生活安排相适配的薪酬、安全、稳定性及工作条件。",action:"把薪酬、工时、通勤、出差和稳定性做成实际比较表。"},
];
const valuePhrases:readonly (readonly string[])[]=[
 ["工作能让我不断学会新技能","完成工作能看到明确且有价值的成果","我愿意承担需要动脑解决的挑战","能充分发挥自己的长处比头衔更重要","工作给我持续改进能力的机会"],
 ["我可以自己选择解决问题的方法","团队允许我提出不同于惯例的方案","我拥有对工作结果负责的自主权","我喜欢有空间设计新工具或新流程","我希望不必为每个细节反复申请批准"],
 ["表现出色时会得到具体、公正的认可","组织有清晰而可信的发展路径","我有机会承担更大范围的责任","我能获得与贡献相符的晋升机会","我希望努力的成果在团队中被看见"],
 ["我与同事能相互尊重和信任","工作内容对他人或社会有实际帮助","团队允许理性表达不同意见","遇到困难时同事愿意互相支持","组织做事原则与我的基本价值观一致"],
 ["主管会对关键问题提供有效帮助","工作职责、规则与权责边界清晰","评估绩效的方法透明且一致","遇到困难可以获得可靠的专业指导","团队有公正处理争议的正式渠道"],
 ["工作报酬与风险及投入相匹配","工作时间安排符合我的生活需求","工作环境能保障基本健康和安全","雇佣关系与任务预期相对稳定","通勤、出差与生活成本在我能接受的范围内"],
];
const styleAreas:readonly DiscoveryArea[]=[
 {id:"planning",name:"计划与条理",meaning:"习惯预先设定优先级、检查清单与交付节点。",action:"试着用一周的任务日志核对计划和实际执行。"},
 {id:"experimentation",name:"探索与试验",meaning:"面对不确定问题倾向做小规模试验和证据比较。",action:"在下一件复杂工作中设计可验证的小实验。"},
 {id:"collaboration",name:"沟通与协作",meaning:"在任务推进时主动澄清预期、共享信息并寻求反馈。",action:"记录一次跨角色协作中的信息传递和误会来源。"},
 {id:"ownership",name:"独立推进",meaning:"面对阻碍倾向主动分解任务、承担责任并持续交付。",action:"选择一个两周任务，记录决策、交付与复盘证据。"},
];
const stylePhrases:readonly (readonly [string,boolean][])[]=[
 [["接到新任务时我会先梳理关键步骤",false],["我会把重要截止时间写入计划",false],["我经常直到最后才开始核对关键细节",true],["任务多时我会明确优先级",false],["我习惯为容易出错的步骤准备检查清单",false],["我常常忘记记录已答应的交付节点",true]],
 [["遇到新问题时我会先寻找能够验证的证据",false],["我愿意用小实验检验自己的想法",false],["即使有新信息我也不太愿意修改原方案",true],["面对不确定性我会比较不同假设",false],["我会根据实验结果迭代做法",false],["我通常只凭第一印象决定问题根源",true]],
 [["我会主动确认别人对交付结果的理解",false],["信息不清晰时我会先提出澄清问题",false],["我常假设别人已经知道我掌握的重要变化",true],["团队有分歧时我愿意听完各方理由",false],["我会把关键决策和责任人同步给相关同事",false],["我倾向把反馈看成不值得认真讨论的干扰",true]],
 [["面对阻碍我会先寻找自己能推动的下一步",false],["我可以在有限信息下明确暂定决策并标注风险",false],["问题出现时我习惯先等待别人替我处理",true],["发现自己的判断失误时我会主动修正",false],["我会推动任务到可验收的实际成果",false],["如果没人催促我就很少主动检查进度",true]],
];
function buildItems(id:string,areas:readonly DiscoveryArea[],phrases:readonly (readonly [string,boolean][])[]):readonly DiscoveryItem[]{
 const items:DiscoveryItem[]=[];
 for(let i=0;i<phrases[0].length;i++)
  for(let j=0;j<areas.length;j++){
   const [text,reverse]=phrases[j][i];
   items.push({id:id+"-"+areas[j].id+"-"+(i+1),area:areas[j].id,text,reverse});
  }
 return items;
}
const values:DiscoverySurvey={
 id:"work-values-30",title:"职业价值观探索 · 30题",intro:"关注你希望工作能够提供什么，不判断你的性格好坏，也不提供职业录取预测。",
 version:"work-values-original-20261102-v1",
 reference:"SOCTHINK 原创工作需求题项，六类主题参考 O*NET Work Values（不是官方 Work Importance Locator）",
 referenceUrl:"https://www.onetcenter.org/dictionary/25.2/excel/work_values.html",
 areas:valueAreas,
 items:buildItems("wv",valueAreas,valuePhrases.map(row=>row.map(text=>[text,false] as const))),
};
const style:DiscoverySurvey={
 id:"work-style-24",title:"工作方式探索 · 24题",intro:"观察完成任务时的常见工作习惯，并与真实案例进行对照；一次自评不决定能力高低。",
 version:"work-style-original-20261102-v1",
 reference:"SOCTHINK 原创工作行为描述题项，参考职业行为观察原则；非任何官方工作风格量表",
 referenceUrl:"https://www.onetcenter.org/",
 areas:styleAreas,items:buildItems("ws",styleAreas,stylePhrases),
};
export const DISCOVERY_SURVEYS:readonly DiscoverySurvey[]=[values,style];
export function getDiscoverySurvey(id:string):DiscoverySurvey|undefined{return DISCOVERY_SURVEYS.find(x=>x.id===id);}
export type DiscoveryScore=Readonly<{version:string;areas:readonly (DiscoveryArea & {mean:number;total:number})[];topAreas:readonly string[]}>;
export function scoreDiscovery(survey:DiscoverySurvey,answers:Readonly<Record<string,number>>):DiscoveryScore|null{
 const idSet=new Set(survey.items.map(i=>i.id));
 if(survey.items.some(i=>!Object.hasOwn(answers,i.id)))return null;
 for(const [id,value] of Object.entries(answers))if(!idSet.has(id)||!Number.isInteger(value)||value<1||value>5)throw new Error("INVALID_SURVEY_RESPONSE");
 const areas=survey.areas.map(a=>{
  const items=survey.items.filter(i=>i.area===a.id);
  const total=items.reduce((s,i)=>s+(i.reverse?6-answers[i.id]:answers[i.id]),0);
  return {...a,total,mean:Math.round(total/items.length*100)/100};
 });
 // Ties and near-ties are not evidence for arbitrarily promoting the first
 // dimension. This is a descriptive, non-normed self-report, not a rank test.
 const ranked=areas.toSorted((a,b)=>b.mean-a.mean);
 const spread=ranked[0].mean-ranked[ranked.length-1].mean;
 const topAreas=spread<0.4?[]:ranked.filter(a=>a.mean>=ranked[0].mean-0.01).map(a=>a.name);
 return {version:survey.version,areas,topAreas};
}
export function validateDiscoverySurveys():string[]{
 const errors:string[]=[];
 const surveyIds=new Set<string>();
 for(const s of DISCOVERY_SURVEYS){
  if(surveyIds.has(s.id))errors.push("DUPLICATE_SURVEY");surveyIds.add(s.id);
  if(s.areas.length!==(s.id==="work-values-30"?6:4)||s.items.length!==(s.id==="work-values-30"?30:24))errors.push("COUNTS:"+s.id);
  if(!s.referenceUrl.startsWith("https://"))errors.push("SOURCE:"+s.id);
  const ids=new Set<string>();
  for(const i of s.items){if(ids.has(i.id)||!i.text||!s.areas.some(a=>a.id===i.area))errors.push("ITEM:"+i.id);ids.add(i.id);}
  for(const a of s.areas)if(s.items.filter(i=>i.area===a.id).length!==(s.id==="work-values-30"?5:6))errors.push("AREA:"+a.id);
 }
 return errors;
}
