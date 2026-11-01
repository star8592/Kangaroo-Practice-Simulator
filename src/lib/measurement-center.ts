/**
 * SOCTHINK Measurement Center - isolated, public research-preview instruments.
 *
 * A score is an average of keyed item responses (1..5), NOT an IQ,
 * population percentile, clinical diagnosis, employment selection score,
 * or a Chinese normed/validated interpretation.
 *
 * No respondent data is collected or persisted by this module.
 */
export type FactorId = "R"|"I"|"A"|"S"|"E"|"C"|"BF-E"|"BF-A"|"BF-C"|"BF-ES"|"BF-O";
export type Item = {readonly id:string; readonly factor:FactorId; readonly text:string; readonly reverse:boolean};
export type Factor = {readonly id:FactorId; readonly name:string; readonly description:string; readonly nextStep:string};
export type Instrument = {
  readonly id:string; readonly title:string; readonly subtitle:string;
  readonly audience:string; readonly duration:string; readonly source:string; readonly sourceUrl:string;
  readonly license:string; readonly methodology:string; readonly version:string;
  readonly status:"research-preview"; readonly normStatus:"not-validated-in-chinese";
  readonly ageMin:18; readonly payable:false;
  readonly prompt:string; readonly options:readonly string[];
  readonly factors:readonly Factor[]; readonly items:readonly Item[];
};
const careerFactors:readonly Factor[]=[
  {id:"R",name:"现实型 · R",description:"倾向动手操作、工具设备以及可观察的实物任务。",nextStep:"尝试工程制作、设备调试或现场问题解决任务。"},
  {id:"I",name:"研究型 · I",description:"倾向分析信息、探究规律、验证假设和解决复杂问题。",nextStep:"尝试数据研究、实验设计或技术分析项目。"},
  {id:"A",name:"艺术型 · A",description:"倾向开放表达、创意构思、视觉或文字创作。",nextStep:"尝试设计、写作、影像或产品创意作品。"},
  {id:"S",name:"社会型 · S",description:"倾向支持他人、教学、交流与协作。",nextStep:"尝试辅导讲解、用户访谈或社区服务活动。"},
  {id:"E",name:"企业型 · E",description:"倾向推动项目、说服沟通、组织资源和作出商业决策。",nextStep:"尝试产品推广、项目组织或商业方案演示。"},
  {id:"C",name:"常规型 · C",description:"倾向结构化处理信息、遵守流程、归档核验和细节管理。",nextStep:"尝试财务核对、数据质检或流程优化任务。"},
];
const careerActivities:readonly (readonly string[])[]=[
  ["组装或维修一件实际设备","使用工具制作可以工作的模型","到现场检查设备或设施的状态","按照图纸完成手工或工程制作","亲自调试一套仪器或装置"],
  ["分析一组数据寻找异常规律","通过实验验证一个自己的假设","研究一个复杂问题的原因","阅读技术资料理解新的原理","设计方法比较两种解决方案"],
  ["设计独特的海报或视觉作品","创作一篇故事或一段文案","为产品构思新颖的呈现方式","自由设计一个有审美特点的空间","通过绘画、音乐或视频表达观点"],
  ["耐心帮助别人理解困难概念","倾听并协助他人理清问题","组织一次同伴学习或交流活动","向别人讲解自己掌握的知识","为有需要的人提供实际支持"],
  ["向他人介绍并推广一个创意","带领小组完成具有挑战的任务","为项目争取资源或合作伙伴","策划一次产品或活动的发布","参与讨论并推动团队做出决定"],
  ["整理大量记录并保证数据准确","按照明确流程完成审查和核对","制定详细清晰的时间与任务清单","把混乱资料分类建立检索目录","检查报表中是否存在细微差错"],
];
const careerItems:readonly Item[]=Array.from({length:30},(_,i)=>{
  const group=i%6, n=Math.floor(i/6);
  return {id:"career-"+careerFactors[group].id+"-"+(n+1),factor:careerFactors[group].id,text:careerActivities[group][n],reverse:false};
});
const bigFiveFactors:readonly Factor[]=[
  {id:"BF-E",name:"外向性",description:"社会互动、主动表达与群体中的活跃倾向。",nextStep:"观察自己在独处与社交场景的能量和表达习惯。"},
  {id:"BF-A",name:"宜人性",description:"理解他人、关怀合作与人际互动方式。",nextStep:"比较不同协作场景下倾听、协调与表达的习惯。"},
  {id:"BF-C",name:"尽责性",description:"条理性、任务执行、计划性和细节关注。",nextStep:"根据真实任务记录检查计划执行和时间管理习惯。"},
  {id:"BF-ES",name:"情绪稳定性",description:"对日常压力及情绪波动的自我描述，不是心理健康诊断。",nextStep:"关注作息、环境、压力情境以及有效的自我调节方式。"},
  {id:"BF-O",name:"智性与想象倾向",description:"抽象思考、创意、语言表达等相关自我描述。",nextStep:"尝试阅读、创作与探索新概念，观察自己的兴趣变化。"},
];
// Chinese research translation of the IPIP 50 Big-Five Factor Markers.
// Each tuple follows the original Goldberg item order; direction is verified
// against the source key. This draft translation is NOT locally validated.
const ipipStatements:readonly (readonly [string,boolean])[]=[
  ["在聚会或集体活动中，我常常能带动气氛。",false],
  ["我很少关心别人的处境。",true],
  ["我做事情通常事先准备充分。",false],
  ["我很容易感到压力。",true],
  ["我掌握的词汇比较丰富。",false],
  ["我平时话不多。",true],
  ["我对他人及其经历感兴趣。",false],
  ["我经常把个人物品随手乱放。",true],
  ["大多数时候，我都能保持放松。",false],
  ["我理解抽象概念时有困难。",true],
  ["与别人相处时，我通常感到自在。",false],
  ["我会出言侮辱别人。",true],
  ["我做事会注意细节。",false],
  ["我经常为事情担忧。",true],
  ["我的想象力很丰富。",false],
  ["我倾向于待在不显眼的位置。",true],
  ["我能对他人的感受产生共情。",false],
  ["我经常把事情弄得一团糟。",true],
  ["我很少感到忧郁。",false],
  ["我对抽象的想法不感兴趣。",true],
  ["我会主动发起交谈。",false],
  ["我对别人的困难不怎么感兴趣。",true],
  ["我会及时完成日常事务。",false],
  ["我很容易受到干扰而心神不宁。",true],
  ["我经常能想出很好的主意。",false],
  ["我通常没什么话可说。",true],
  ["我有一颗柔软、富有同情心的心。",false],
  ["我经常忘记把东西放回原位。",true],
  ["我很容易心烦意乱。",true],
  ["我的想象力不太好。",true],
  ["在聚会中，我会和很多不同的人交谈。",false],
  ["我并不真正关心其他人。",true],
  ["我喜欢井然有序。",false],
  ["我的心情经常变化。",true],
  ["我理解事情的速度比较快。",false],
  ["我不喜欢成为别人注意的焦点。",true],
  ["我愿意花时间帮助别人。",false],
  ["我会逃避自己应尽的职责。",true],
  ["我的情绪起伏很频繁。",true],
  ["我会使用比较复杂的词语。",false],
  ["我不介意成为关注的中心。",false],
  ["我能体会别人的情绪。",false],
  ["我会按照计划表做事。",false],
  ["我很容易烦躁。",true],
  ["我会花时间反思事情。",false],
  ["面对陌生人时，我通常比较安静。",true],
  ["我能让别人感到轻松自在。",false],
  ["我对工作质量要求细致而严格。",false],
  ["我经常感到情绪低落。",true],
  ["我充满各种想法和点子。",false],
];
const ipipItems:readonly Item[]=ipipStatements.map(([text,reverse],index)=>({
  id:"ipip-50-"+(index+1),factor:bigFiveFactors[index%5].id,text,reverse
}));
export const INSTRUMENTS:readonly Instrument[]=[
  {id:"career-interest-exploration-30",title:"职业兴趣探索 · 30题",subtitle:"基于 RIASEC 六维结构的原创探索问卷",
    audience:"18岁及以上成年人",duration:"约 6–9 分钟",source:"SOCTHINK 原创题项，参考 Holland RIASEC 兴趣结构",
    sourceUrl:"https://www.onetcenter.org/IP.html",license:"原创题项；非 O*NET 官方量表",
    methodology:"六类工作活动偏好的描述性自评；每类5题，1–5分均值，不进行常模比较。",
    version:"career-research-1.0",status:"research-preview",normStatus:"not-validated-in-chinese",ageMin:18,payable:false,
    prompt:"如果可以自由选择，以下活动对你有多大吸引力？",options:["非常不喜欢","不太喜欢","一般","比较喜欢","非常喜欢"],
    factors:careerFactors,items:careerItems},
  {id:"ipip-big-five-50-cn-preview",title:"大五人格探索 · 50题",subtitle:"IPIP-50 公开题项的中文研究译稿",
    audience:"18岁及以上成年人",duration:"约 10–15 分钟",source:"International Personality Item Pool / Goldberg IPIP-50",
    sourceUrl:"https://ipip.ori.org/new_ipip-50-item-scale.htm",license:"IPIP 原始题项公共领域；中文译稿尚未进行本土验证",
    methodology:"每个维度10题，5点自评；按原始正反向计分计算均值，不提供中国常模或百分位。",
    version:"ipip50-zh-draft-1.0",status:"research-preview",normStatus:"not-validated-in-chinese",ageMin:18,payable:false,
    prompt:"请根据真实的日常状态判断下列描述是否符合自己。",options:["非常不符合","比较不符合","不确定","比较符合","非常符合"],
    factors:bigFiveFactors,items:ipipItems}
];
export const CENTER_SECTIONS=[
  {title:"人格与性格",summary:"大五人格、稳定特质与行为倾向",icon:"01",instrumentId:"ipip-big-five-50-cn-preview"},
  {title:"认知与推理能力",summary:"数量、逻辑、空间与信息判断：原创20题任务表现，不是 IQ 测验",icon:"02",route:"/assessment-center/reasoning-practice-20",detail:"20题 · 原始正确率与逐题复盘"},
  {title:"职业兴趣与发展",summary:"RIASEC 职业兴趣、价值观与发展探索",icon:"03",instrumentId:"career-interest-exploration-30"},
  {title:"岗位胜任与技能",summary:"真实 SQLite 执行、订单筛选、分组与客户分析：4项岗位任务",icon:"04",route:"/assessment-center/sql-lab",detail:"4项真实 SQL 执行任务 · 双数据集核对"},
  {title:"学习能力与策略",summary:"阅读信息定位、推断、数量理解和证据判断：16题原创学习练习",icon:"05",route:"/assessment-center/reading-practice-16",detail:"4篇原创短文 · 16题 · 原文证据复盘"},
  {title:"心理状态与生活",summary:"待建立专业筛查规范，不提供在线诊断",icon:"06"}
] as const;
export function getInstrument(id:string):Instrument|undefined {return INSTRUMENTS.find(x=>x.id===id);}
export type DimensionScore={id:FactorId;name:string;mean:number;sum:number;answered:number;description:string;nextStep:string};
export type ScoredReport={instrumentId:string;version:string;dimensions:DimensionScore[]};
export function scoreInstrument(instrument:Instrument,answers:Readonly<Record<string,number>>):ScoredReport|null {
  const ids=new Set(instrument.items.map(x=>x.id));
  if(instrument.items.length===0 || instrument.items.some(x=>!Object.prototype.hasOwnProperty.call(answers,x.id))) return null;
  for(const [id,value] of Object.entries(answers)) {
    if(!ids.has(id)||!Number.isInteger(value)||value<1||value>5) throw new Error("invalid response");
  }
  const dimensions=instrument.factors.map(factor=>{
    const items=instrument.items.filter(x=>x.factor===factor.id);
    if(!items.length)throw new Error("empty dimension");
    const sum=items.reduce((total,item)=>total+(item.reverse?6-answers[item.id]:answers[item.id]),0);
    return {id:factor.id,name:factor.name,mean:Math.round(sum/items.length*100)/100,sum,answered:items.length,description:factor.description,nextStep:factor.nextStep};
  });
  return {instrumentId:instrument.id,version:instrument.version,dimensions};
}
export function validateMeasurementRegistry():string[] {
  const issues:string[]=[]; const ids=new Set<string>();
  for(const instrument of INSTRUMENTS){
    if(ids.has(instrument.id))issues.push("duplicate instrument"); ids.add(instrument.id);
    if(instrument.payable||instrument.status!=="research-preview"||instrument.normStatus!=="not-validated-in-chinese") issues.push("invalid readiness");
    if(!instrument.sourceUrl.startsWith("https://")||!instrument.version)issues.push("missing provenance");
    const itemIds=new Set<string>();
    for(const item of instrument.items){
      if(itemIds.has(item.id))issues.push("duplicate item: "+item.id);itemIds.add(item.id);
      if(!instrument.factors.some(f=>f.id===item.factor)||!item.text.trim())issues.push("invalid item: "+item.id);
    }
    for(const factor of instrument.factors)if(instrument.items.filter(x=>x.factor===factor.id).length!==(instrument.id.startsWith("ipip")?10:5))issues.push("dimension item count: "+factor.id);
  }
  return issues;
}
