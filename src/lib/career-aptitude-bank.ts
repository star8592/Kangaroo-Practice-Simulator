/**
 * SOCTHINK 2026-11-02 ORIGINAL Chinese recruitment aptitude TRAINING paper.
 * NOT employer past questions, a licensed normed psychometric instrument,
 * a CAT/adaptive test or a professional credential.
 */
export const APTITUDE_VERSION="career-aptitude-original-20261102-v1" as const;
export const APTITUDE_DURATION_MINUTES=45;
export type AptitudeDomain="verbal"|"quantitative"|"logical"|"data"|"spatial";
export type AptitudeDifficulty="基础"|"进阶";
export type AptitudeItem={
 readonly id:string; readonly domain:AptitudeDomain; readonly stem:string;
 readonly options:readonly [string,string,string,string]; readonly answer:0|1|2|3;
 readonly explanation:string; readonly skill:string; readonly difficulty:AptitudeDifficulty;
};
export const APTITUDE_DOMAINS=[
 {id:"verbal",title:"言语理解",detail:"阅读信息、语义限定与规则解释",advice:"区分陈述、结论与推断，特别留意限定词和例外条件。"},
 {id:"quantitative",title:"数量运算",detail:"比例、效率、概率与实际数量问题",advice:"先列式再代入，核对单位、百分数基数与时间条件。"},
 {id:"logical",title:"逻辑推理",detail:"条件、集合、排序、真假与规则",advice:"先用符号或表格写出条件，再检验必要性与反例。"},
 {id:"data",title:"资料分析",detail:"真实格式的表格数据、增长与比率",advice:"标清分母、时间和指标口径，逐项核对总量与增量。"},
 {id:"spatial",title:"空间推理",detail:"二维方位、坐标、旋转与对称",advice:"在纸面画轴线和方向箭头，按每一步变换核实结果。"},
] as const satisfies readonly {id:AptitudeDomain;title:string;detail:string;advice:string}[];
const items:readonly AptitudeItem[]=[
 // 言语：8
 {id:"va-01",domain:"verbal",skill:"限定词理解",difficulty:"基础",stem:"通知写明：“已提交申请且材料完整的人员，可在周五前预约面谈。”以下哪项符合通知？",options:["只要提交申请就一定可以预约","材料完整但未提交申请也可以预约","提交申请且材料完整的人满足预约条件","所有预约人员都已经参加面谈"],answer:2,explanation:"通知明确把“已提交申请”和“材料完整”作为可预约条件，不能丢掉任意一项；可预约不等于已面谈。"},
 {id:"va-02",domain:"verbal",skill:"结论边界",difficulty:"基础",stem:"某企业报告：“参与试点的3家门店中，2家在一个月内缩短了平均等待时间。”哪项可直接确认？",options:["至少2家试点门店的等待时间缩短","全国所有门店的等待时间都缩短","平均等待时间缩短完全由试点措施造成","全部3家门店均缩短等待时间"],answer:0,explanation:"报告直接支持3家试点中2家的变化，不足以推断全国门店或建立因果关系。"},
 {id:"va-03",domain:"verbal",skill:"信息排序",difficulty:"基础",stem:"项目邮件要求：“先核对合同版本；版本一致后再发出付款申请；若版本不一致，应先退回法务。”目前发现版本不一致，下一步是什么？",options:["立即发付款申请","先联系出纳到账","先整理验收材料再付款","退回法务处理版本差异"],answer:3,explanation:"不一致触发例外分支，应先退回法务；不能跳过核对直接申请付款。"},
 {id:"va-04",domain:"verbal",skill:"必要与充分",difficulty:"进阶",stem:"制度规定：“报告经主管签字才视为正式发布；签字本身不保证报告内容无误。”以下哪项正确？",options:["只要报告内容正确就无需签字","未经主管签字的报告不算正式发布","主管签字的报告一定没有错误","所有签字的报告都已经公开"],answer:1,explanation:"主管签字是正式发布的必要条件；签字不等于准确，也不等于已公开。"},
 {id:"va-05",domain:"verbal",skill:"区分事实与观点",difficulty:"基础",stem:"以下四种表述，哪一项最接近可直接核验的事实陈述？",options:["这次培训是公司历史上最成功的一次","这项流程肯定能让所有员工满意","本周共有126人参加了线上培训","培训体验极其优秀，明显超出预期"],answer:2,explanation:"参与人数可以通过报名或签到记录核对；其他表述依赖主观标准或过度外推。"},
 {id:"va-06",domain:"verbal",skill:"语义精确",difficulty:"进阶",stem:"合同条款：“除非获得书面批准，供应商不得调整交期。”哪项准确转述了这项约束？",options:["只要口头通知就能调整交期","书面批准意味着必须调整交期","没有书面批准也能随意调整交期","未经书面批准，不能调整交期"],answer:3,explanation:"“除非”给出必要的许可条件：没有书面批准则禁止调整；有批准也不意味着必须调整。"},
 {id:"va-07",domain:"verbal",skill:"因果判断",difficulty:"进阶",stem:"一份总结写道：“采用新工具的团队平均交付时间较短，但这些团队原本就更有经验。”最合适的判断是？",options:["不能仅凭比较证明新工具导致提速","可以认定新工具是提速的唯一原因","团队经验肯定不影响交付速度","新工具必然对所有团队有同样效果"],answer:0,explanation:"团队经验是可能的混杂因素；仅观察两组差异不足以识别工具的因果效果。"},
 {id:"va-08",domain:"verbal",skill:"结论强度",difficulty:"进阶",stem:"某报告指出：“如果外部接口延迟，订单同步可能失败。”哪一表述没有增加原文的确定性？",options:["每次接口延迟都会导致同步失败","外部接口延迟时，订单同步存在失败风险","订单同步失败只能由接口延迟导致","接口延迟必定与订单无关"],answer:1,explanation:"原文使用“可能”，表示风险而非必然；其余选项将可能性误读为必然性或唯一原因。"},
 // 数量：8
 {id:"nu-01",domain:"quantitative",skill:"折扣与实际金额",difficulty:"基础",stem:"一套工具原价240元，活动优惠15%，没有其他费用。付款金额是多少？",options:["198元","204元","216元","225元"],answer:1,explanation:"240×(1−15%)=240×0.85=204元。"},
 {id:"nu-02",domain:"quantitative",skill:"工作效率",difficulty:"基础",stem:"两台相同设备各每小时加工18件，连续运转2.5小时，共加工多少件？",options:["72件","81件","108件","90件"],answer:3,explanation:"2台×18件/小时×2.5小时=90件。"},
 {id:"nu-03",domain:"quantitative",skill:"加权平均",difficulty:"进阶",stem:"一批产品A组40件平均成本12元，B组60件平均成本15元。合并后每件平均成本是多少？",options:["13.8元","13.5元","14.2元","14元"],answer:0,explanation:"总成本40×12+60×15=1380元，合计100件，均价13.8元。"},
 {id:"nu-04",domain:"quantitative",skill:"增长率",difficulty:"基础",stem:"某月订单量从800单增至1000单，以原订单量为基数，增长率是多少？",options:["20%","22%","25%","30%"],answer:2,explanation:"增长量为200单，以期初800单为基数，(1000−800)÷800=25%。"},
 {id:"nu-05",domain:"quantitative",skill:"比例分配",difficulty:"基础",stem:"项目预算按技术、运营、客服 5:3:2 分配，总预算为80万元。运营分得多少万元？",options:["20万元","24万元","30万元","40万元"],answer:1,explanation:"比例总份数5+3+2=10；运营占3/10，80×3/10=24万元。"},
 {id:"nu-06",domain:"quantitative",skill:"单次事件概率",difficulty:"进阶",stem:"箱内有5个红色、3个蓝色且大小相同的零件，随机不放回抽取第一个。第一个抽到蓝色的概率是？",options:["1/2","3/5","1/3","3/8"],answer:3,explanation:"总数8个，蓝色3个，首次抽取概率3/8；后续是否放回不影响第一次。"},
 {id:"nu-07",domain:"quantitative",skill:"时间计算",difficulty:"基础",stem:"上午9:20开始检修，计划先检查35分钟，再调试50分钟，中间休息15分钟，预计几点结束？",options:["11:00","10:45","11:15","11:10"],answer:0,explanation:"35+50+15=100分钟，9:20再过1小时40分钟是11:00。"},
 {id:"nu-08",domain:"quantitative",skill:"逆向增长计算",difficulty:"进阶",stem:"某部门今年成本为120万元，比去年增长20%。去年成本为多少万元？",options:["96万元","100万元","108万元","144万元"],answer:1,explanation:"今年=去年×1.2，去年=120÷1.2=100万元。"},
 // 逻辑：8
 {id:"lo-01",domain:"logical",skill:"包含关系",difficulty:"基础",stem:"已知“全部甲类任务都是乙类任务，全部乙类任务都是丙类任务”。哪一项必然成立？",options:["全部丙类任务都是甲类","甲类和丙类互不相交","全部甲类任务都是丙类","全部乙类任务都不属于甲类"],answer:2,explanation:"甲⊆乙⊆丙，因此甲⊆丙。包含关系不能反向推导。"},
 {id:"lo-02",domain:"logical",skill:"条件推理",difficulty:"基础",stem:"“系统通过安全检查后，才允许上线。”已知一个系统已经上线，按规则可推出什么？",options:["一定经过安全检查","系统一定没有任何漏洞","安全检查必然满分","所有通过检查的系统都已上线"],answer:0,explanation:"上线需要先通过安全检查；这是必要条件，不能由此推出完全无漏洞。"},
 {id:"lo-03",domain:"logical",skill:"排序推理",difficulty:"基础",stem:"A的工单比B先完成，C比A晚完成、比B早完成。完成顺序是？",options:["B、C、A","A、B、C","C、A、B","A、C、B"],answer:3,explanation:"题目给定A早于B，且A早于C早于B，因此A、C、B。"},
 {id:"lo-04",domain:"logical",skill:"逆否命题",difficulty:"进阶",stem:"规则：“如果审批完成，则一定生成审批编号。”现在没有编号，按规则能推出哪项？",options:["审批已经完成","审批尚未完成","编号稍后一定补发","审批失败只可能是网络故障"],answer:1,explanation:"完成审批⇒产生编号，逆否等价：无编号⇒未完成审批。"},
 {id:"lo-05",domain:"logical",skill:"真假推理",difficulty:"进阶",stem:"样机在A、B、C中且仅在一处。甲说“在A”，乙说“在B”，丙说“不在A”。已知三人恰有两句为真，样机在哪里？",options:["仓库A","仓库C","仓库B","无法确定"],answer:2,explanation:"在B时甲假、乙真、丙真，共两真；在A时甲真、乙假、丙假，共一真；在C时甲假、乙假、丙真，共一真。故只能在B。"},
 {id:"lo-06",domain:"logical",skill:"排班约束",difficulty:"进阶",stem:"三人甲、乙、丙分别在周一、周二、周三值班，每天一人。甲不在周一，乙在甲之前，丙不在周三。谁在周三？",options:["乙","丙","无法唯一确定","甲"],answer:3,explanation:"若甲在周二，则乙只能周一，丙只能周三，与丙不在周三矛盾；故甲一定在周三。乙和丙的先后不能唯一确定。"},
 {id:"lo-07",domain:"logical",skill:"反例验证",difficulty:"进阶",stem:"有人推断：“某部门去年最优秀的员工都参加过培训，因此参加培训会使人变优秀。”哪项信息最直接削弱这个因果推断？",options:["培训时间在工作日","优秀员工在培训前就有较高绩效","培训课程使用了线上资料","有员工表示喜欢培训"],answer:1,explanation:"优秀员工培训前已绩效较高，说明选择进入培训的人员存在差异，不能将高绩效归因于培训。"},
 {id:"lo-08",domain:"logical",skill:"充要条件辨析",difficulty:"基础",stem:"制度规定：“仅当A和B都完成，系统才标记项目完成。”目前项目被标记为完成，哪项一定成立？",options:["只完成A也可以","只完成B也可以","A和B都已完成","任何项目都会标记完成"],answer:2,explanation:"标记完成⇒A完成且B完成；不能把“仅当”理解为只需任意一个条件。"},
 // 资料：8，数据口径均在题干中给出
 {id:"da-01",domain:"data",skill:"表格总计",difficulty:"基础",stem:"某店一季度月订单数：1月1200、2月1500、3月1800。季度总订单数是多少？",options:["3900","4200","4800","4500"],answer:3,explanation:"1200+1500+1800=4500单。"},
 {id:"da-02",domain:"data",skill:"同比/环比基数",difficulty:"基础",stem:"某店1月订单1200单、3月1800单。3月比1月增长了多少百分比（以1月为基数）？",options:["50%","33.3%","66.7%","25%"],answer:0,explanation:"(1800−1200)÷1200=50%；不要用3月订单量作为分母。"},
 {id:"da-03",domain:"data",skill:"退货率",difficulty:"基础",stem:"某店2月订单1500单，其中退货75单。按“退货单数÷订单数”定义，退货率是多少？",options:["4%","5%","7.5%","8%"],answer:1,explanation:"按题目要求以2月总订单1500单为分母，75÷1500=0.05=5%。"},
 {id:"da-04",domain:"data",skill:"指标汇总",difficulty:"基础",stem:"某店1—3月发货延迟单数依次为30、60、45。季度累计延迟单数是多少？",options:["105单","120单","135单","145单"],answer:2,explanation:"按三个自然月逐项相加，30+60+45=135单，不能只取最大月份。"},
 {id:"da-05",domain:"data",skill:"利润额",difficulty:"基础",stem:"A项目2026年收入300万元，成本210万元。按“收入−成本”计算，项目利润是多少？",options:["510万元","90万元","70万元","30万元"],answer:1,explanation:"300−210=90万元，此题采用明确给定的简化利润口径，不代表净利润。"},
 {id:"da-06",domain:"data",skill:"利润率口径",difficulty:"进阶",stem:"A项目2025年收入240万元，成本180万元。按“(收入−成本)÷收入”计算，利润率是多少？",options:["33.3%","20%","40%","25%"],answer:3,explanation:"利润60万元，利润率60÷240=25%；不要以成本为分母。"},
 {id:"da-07",domain:"data",skill:"增量比较",difficulty:"进阶",stem:"B项目2025年收入150万元、成本120万元；2026年收入180万元、成本138万元。按收入减成本的口径，利润增加多少万元？",options:["12万元","30万元","42万元","18万元"],answer:0,explanation:"2025利润150−120=30万元，2026利润180−138=42万元，增量12万元。"},
 {id:"da-08",domain:"data",skill:"跨项目合并",difficulty:"进阶",stem:"2026年A项目收入300、成本210万元；B项目收入180、成本138万元。合计简化利润（收入−成本）是多少？",options:["120万元","138万元","132万元","128万元"],answer:2,explanation:"A利润90万元，B利润42万元，合计132万元。"},
 // 空间：8，纯原创坐标/方位任务；不声称覆盖复杂立体心理旋转
 {id:"sp-01",domain:"spatial",skill:"方位旋转",difficulty:"基础",stem:"一个指针起初指正北，顺时针旋转135°后指向哪个方向？",options:["东北","东南","西南","西北"],answer:1,explanation:"正北顺时针先90°到正东，再转45°到东南。"},
 {id:"sp-02",domain:"spatial",skill:"坐标迁移",difficulty:"基础",stem:"平面坐标点从(3,2)出发，向左4个单位、向上3个单位，终点是？",options:["(7,5)","(-1,-1)","(-1,5)","(1,5)"],answer:2,explanation:"向左意味着横坐标减少4，向上意味着纵坐标增加3，因此x=3−4=−1，y=2+3=5。"},
 {id:"sp-03",domain:"spatial",skill:"二维旋转",difficulty:"基础",stem:"正方形的左上角有标记，整个正方形顺时针旋转270°，标记会到哪一角？",options:["左下角","右上角","右下角","左上角"],answer:0,explanation:"顺时针90°左上→右上；180°→右下；270°→左下。"},
 {id:"sp-04",domain:"spatial",skill:"直角坐标变换",difficulty:"进阶",stem:"平面点(x,y)绕原点逆时针旋转90°后成为(−y,x)。点(2,−3)旋转后的坐标是什么？",options:["(−3,2)","(3,−2)","(−2,3)","(3,2)"],answer:3,explanation:"套用(−y,x)：y=−3，−y=3，x=2，得到(3,2)。"},
 {id:"sp-05",domain:"spatial",skill:"方格中心对称",difficulty:"进阶",stem:"在5×5方格中，位置以(行,列)编号。将整个方格旋转180°，原位置(1,2)移动到？",options:["(5,4)","(4,5)","(5,2)","(1,4)"],answer:0,explanation:"5×5位置旋转180°时行列编号分别变为6−原编号，(1,2)→(5,4)。"},
 {id:"sp-06",domain:"spatial",skill:"镜像对称",difficulty:"基础",stem:"点(−4,3)以y轴为对称轴镜像后，坐标是什么？",options:["(−4,−3)","(4,−3)","(4,3)","(3,−4)"],answer:2,explanation:"关于y轴对称只改变横坐标符号：(x,y)→(−x,y)，故为(4,3)。"},
 {id:"sp-07",domain:"spatial",skill:"相对位置",difficulty:"进阶",stem:"从原点向正东走4格，再向正北走3格，最后向正西走1格。最终位置在起点的什么方向？",options:["东北方向","西北方向","东南方向","正北方向"],answer:0,explanation:"净位移是向东3格、向北3格，因此终点位于起点东北。"},
 {id:"sp-08",domain:"spatial",skill:"方向序列",difficulty:"进阶",stem:"机器人面向东，按顺序“左转90°、右转180°、左转90°”，最终面向哪里？",options:["南","西","北","东"],answer:3,explanation:"面东左转90°→北；右转180°→南；左转90°→东。"},
];
/**
 * Bank QA is intentionally strict: an item must have a domain, four unique
 * choices, one answer, evidence, and a fixed ID. Do not label this as normed.
 */
export const APTITUDE_ITEMS:readonly AptitudeItem[]=items;
export type AptitudeReport={
 version:typeof APTITUDE_VERSION;correct:number;answered:number;total:number;durationMinutes:number;
 groups:{id:AptitudeDomain;title:string;correct:number;answered:number;total:number;advice:string}[];
 results:{id:string;chosen:number|null;answer:number;correct:boolean;explanation:string;skill:string}[];
};
export function scoreAptitude(answers:Readonly<Record<string,number>>):AptitudeReport{
 const allowed=new Set(APTITUDE_ITEMS.map(q=>q.id));
 for(const [id,value] of Object.entries(answers)){
  if(!allowed.has(id)||!Number.isInteger(value)||value<0||value>3)throw new Error("INVALID_APTITUDE_RESPONSE");
 }
 const results=APTITUDE_ITEMS.map(q=>{
  const chosen=Object.hasOwn(answers,q.id)?answers[q.id]:null;
  return {id:q.id,chosen,answer:q.answer,correct:chosen===q.answer,explanation:q.explanation,skill:q.skill};
 });
 return {version:APTITUDE_VERSION,correct:results.filter(r=>r.correct).length,answered:results.filter(r=>r.chosen!==null).length,
  total:APTITUDE_ITEMS.length,durationMinutes:APTITUDE_DURATION_MINUTES,
  groups:APTITUDE_DOMAINS.map(domain=>{
   const rows=APTITUDE_ITEMS.filter(q=>q.domain===domain.id);
   return {id:domain.id,title:domain.title,total:rows.length,
     correct:rows.filter(q=>answers[q.id]===q.answer).length,
     answered:rows.filter(q=>Object.hasOwn(answers,q.id)).length,advice:domain.advice};
  }),results};
}
export function validateAptitudeBank():string[]{
 const errs:string[]=[];const ids=new Set<string>(),stems=new Set<string>();
 if(APTITUDE_ITEMS.length!==40)errs.push("COUNT_EXPECTED_40");
 for(const d of APTITUDE_DOMAINS){
  if(APTITUDE_ITEMS.filter(q=>q.domain===d.id).length!==8)errs.push("DOMAIN_EXPECTED_8:"+d.id);
 }
 for(const q of APTITUDE_ITEMS){
  if(ids.has(q.id))errs.push("DUPLICATE_ID:"+q.id);ids.add(q.id);
  if(stems.has(q.stem))errs.push("DUPLICATE_STEM:"+q.id);stems.add(q.stem);
  if(!APTITUDE_DOMAINS.some(d=>d.id===q.domain))errs.push("INVALID_DOMAIN:"+q.id);
  if(q.options.length!==4||new Set(q.options).size!==4||q.options.some(c=>!c.trim()))errs.push("INVALID_OPTIONS:"+q.id);
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3||!q.explanation.trim()||!q.skill.trim())errs.push("MISSING_EVIDENCE:"+q.id);
 }
 return errs;
}
