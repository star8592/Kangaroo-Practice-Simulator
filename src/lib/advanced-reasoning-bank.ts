/**
 * SOCTHINK original 40-item advanced reasoning practice (November 2026).
 * Independent work, NOT SHL, Watson-Glaser, OPM, IQ, or a standardized
 * occupational selection instrument. Raw correctness only; no percentiles.
 * Classification references the public descriptions of deductive, inductive,
 * assumptions and argument evaluation. Never use licensed third-party items.
 */
export const ADVANCED_REASONING_VERSION="advanced-reasoning-original-20261102-v1" as const;
export const ADVANCED_REASONING_DURATION_MINUTES=45;
export type AdvancedReasoningDomain="deduction"|"constraint"|"induction"|"assumptions"|"evidence";
export type AdvancedReasoningDifficulty="基础"|"提高"|"挑战";
export type AdvancedReasoningItem=Readonly<{
 id:string;domain:AdvancedReasoningDomain;difficulty:AdvancedReasoningDifficulty;
 stem:string;options:readonly [string,string,string,string];answer:0|1|2|3;
 explanation:string;
}>;
export const ADVANCED_REASONING_DOMAINS=[
 {id:"deduction",name:"演绎与量词",practice:"把命题改写成条件与集合，尝试构造反例检查结论。"},
 {id:"constraint",name:"条件与排序",practice:"用约束表列出可能排列，逐一排除冲突。"},
 {id:"induction",name:"规律归纳",practice:"把相邻差值、相隔项和递推关系分别验算，不急于猜下一个数。"},
 {id:"assumptions",name:"隐含假设",practice:"问“结论依赖什么尚未核实的条件”，识别容易忽视的成本、样本和外部因素。"},
 {id:"evidence",name:"证据与论证",practice:"明确样本、时间范围、分母与因果识别，区分观察和结论。"},
] as const satisfies readonly {id:AdvancedReasoningDomain;name:string;practice:string}[];
// Seed layout: question, ONE correct choice, three distinct incorrect choices,
// explanation, and difficulty. We rotate correct-option position deterministically
// to avoid answer-location bias and preserve complete explainability.
type Seed=readonly [string,string,string,string,string,string,AdvancedReasoningDifficulty];
const DEDUCTION:readonly Seed[]=[
 ["所有经过双重核验的账单均会标注“已复核”。账单A已完成双重核验。能确定什么？","账单A标注“已复核”","账单A已经付款","账单A没有错误","账单A已经发货","双重核验⇒标注已复核；付款、无错、发货均无依据。","基础"],
 ["制度规定：只有通过安全审计，才能正式投产。设备B已经投产。哪项必须成立？","设备B已经通过安全审计","设备B从未故障","设备B的成本最低","通过安全审计的设备都已投产","“只有P才Q”表示Q⇒P；投产必先审计，但审计不保证没有故障。","基础"],
 ["如果某申请已经审批完成，则系统会发出编号。现在没有发出编号。哪项必然成立？","申请尚未审批完成","申请一定被驳回","申请的负责人一定缺席","申请已经正式生效","已审批⇒有编号；无编号⇒未审批（逆否），不能推出驳回原因。","提高"],
 ["有些项目经理掌握SQL；凡掌握SQL的人都能完成这道基础查询任务。能够推出什么？","至少有些项目经理能完成该查询任务","所有项目经理都会SQL","所有能查SQL的人都是项目经理","没有项目经理能完成该任务","“有些A是B”与“所有B是C”连用，只能推出“有些A是C”。","提高"],
 ["周日客服甲、乙恰好只有一人值班。已知甲没有值班。下列哪项必然成立？","乙值班","甲乙都没有值班","甲乙都值班","乙可能值班也可能不值班","恰好一人值班排除两人均不值班；甲不值班则只能乙值班。","基础"],
 ["所有出席复核会议的工程师都看过故障日志。小林没看过故障日志。能推出什么？","小林不是出席该复核会议的工程师","小林不是工程师","小林一定没有参加过任何会议","小林不具备日志分析能力","出席的工程师⇒看过日志；没看日志⇒不属于这个已定义的集合，不排除其他身份。","挑战"],
 ["规定：如果供应商甲完成资质审核，则平台会授予认证标记。甲没有获得认证标记，按规定可推出？","甲尚未完成资质审核","甲一定提交了虚假材料","甲不允许再次提交申请","甲已经完成审核但忘记领取证书","完成审核⇒有标记；无标记逆否可得未完成审核，无法推断具体原因。","提高"],
 ["已知所有经过批准且生效的合同均登记于台账。合同C没有登记于台账。最严格的结论是？","合同C不可能同时满足“已批准且生效”","合同C一定不存在","合同C一定被法院撤销","台账肯定出现系统漏洞","(已批准且生效)⇒登记；未登记⇒不可能同时满足前两条件。不能单独断言其中哪一项未满足。","挑战"],
];
const CONSTRAINT:readonly Seed[]=[
 ["工序A早于B，B早于C，C早于D。哪项必然成立？","A最早、D最晚","B最早、D最晚","D最早、A最晚","C最早、B最晚","按照题设连成A→B→C→D，首尾唯一确定。","基础"],
 ["三人甲、乙、丙分别在周一、二、三值班，每天一人。甲不在周一，乙在周三，丙不在周二。甲哪天值班？","周二","周一","周三","无法确定","乙在周三；甲不能周一且周三已有人，只能周二；丙周一。","提高"],
 ["四项任务必须满足：D在A之前，A在B之前，B在C之前。正确排序是？","D-A-B-C","A-D-B-C","B-C-D-A","D-B-C-A","把全部先后约束串联，得到唯一全序D<A<B<C。","基础"],
 ["三个项目X、Y、Z中恰有两个获准。已知Z未获准。哪两个获准？","X和Y","X和Z","Y和Z","无法确定","总共三项且恰好批准两项，Z不被批准，必然批准X与Y。","基础"],
 ["一次包装流程必须遵循：先完成测试T，测试后才进行校准C，完成校准后才包装P。哪一顺序满足？","T-C-P","C-T-P","T-P-C","P-T-C","依赖关系是T<C<P，不能先包装或先校准。","基础"],
 ["三个货架位按西、中、东排列，蓝箱固定在西位，红箱不能在东位，三个箱子位置互不相同。红箱在哪？","中位","东位","西位","无法确定","西位已放蓝箱，红箱又不能放东位，所以红箱只能在中位。","提高"],
 ["前端、后端、测试三岗位由甲、乙、丙一人负责一个。乙负责后端，丙负责前端。甲负责什么？","测试","前端","后端","同时负责前端和测试","前端与后端已由丙、乙占据，岗位一人一个，所以甲只剩测试。","基础"],
 ["W、X、Y、Z四项工作各占一个时段。W在X之前、X在Z之前、Y最后。唯一符合的次序是？","W-X-Z-Y","X-W-Z-Y","W-Z-X-Y","W-X-Y-Z","W<X<Z且Y最后，四项唯一合法次序为W、X、Z、Y。","提高"],
];
const INDUCTION:readonly Seed[]=[
 ["数列3、8、18、38、78，按相同递推规则下一项是？","158","156","152","161","每项=前一项×2+2：78×2+2=158。","基础"],
 ["数列2、6、12、20、30，若第n项为n(n+1)，下一项是？","42","36","40","48","前五项分别为1×2至5×6，下项为6×7=42。","基础"],
 ["数列4、9、19、39、79，依规则下一项是？","159","151","158","160","每项为前项×2+1：79×2+1=159。","基础"],
 ["数列1、2、4、7、11、16，若相邻差依次为1、2、3、4、5，下一个数是？","22","20","21","23","下一相邻差应为6，因此16+6=22。","基础"],
 ["数列5、9、17、33、65，按照每项“上一项×2−1”继续，下一项是？","129","127","130","131","65×2−1=129；代回前四个间隔均符合此递推式。","提高"],
 ["数列2、3、5、8、12、17，相邻差依次为1、2、3、4、5，下一个数是？","23","21","22","24","差值依次是1、2、3、4、5，下一次差值为6，因此17+6=23。","基础"],
 ["交替出现两个数列：1、4、2、8、3、12、4、__。空格处应是什么？","16","5","14","20","奇数位1、2、3、4递增；偶数位4、8、12、16递增。","挑战"],
 ["序列A2、C4、E6、G8，英文字母每次前进2位、数字每次增加2，下一个是？","I10","H9","I9","J10","字母A,C,E,G后是I，数字2,4,6,8后是10，两条规律同时满足。","提高"],
];
const ASSUMPTIONS:readonly Seed[]=[
 ["某公司认为：“新工具单次处理成本更低，因此全面迁移后总成本必然下降。”这一推论最关键的未证实前提是什么？","迁移、维护等额外成本不会抵消单次节约","新工具的界面颜色更现代","新工具的宣传材料更多","新工具一定没有任何故障","总成本既含单次成本，也含迁移和维护成本；仅单次成本低不足以证明总体节省。","提高"],
 ["一项志愿调查仅收到20份回复，却宣称能反映所有1000名员工的意见。最需要检查什么？","回复者能否代表总体及未回复者的意见","回复者使用了什么手机品牌","统计表是否采用彩色字体","调查问卷是否在周二发布","样本数量与自愿回答机制可能造成选择偏差，不能自动代表全员。","提高"],
 ["A方案转化率比B高，但A在节假日投放、B在工作日投放。若推断差异来自方案本身，必须重点考虑什么？","两组流量与投放时间是否具有可比性","A的页面标题是否更长","B的按钮有没有阴影","方案名称是否全部使用英文","投放时间与用户结构不同是可疑混杂因素，需控制后才能归因方案。","提高"],
 ["团队安装新系统后每周完成任务数增加，但同时新增了两名熟练员工。最应该核实什么？","人员增加与经验变化是否也解释产出提升","新系统图标是否更漂亮","新员工是否喜欢咖啡","团队在邮件里怎么称呼新系统","前后对比出现多个同时变化的因素，不能直接把增长归因新系统。","基础"],
 ["产品经理依据一条五星评价断言“所有购买者都满意”。关键缺陷是什么？","单条评价不足以代表全部购买者","五星符号使用的是黄色","评价来自手机端","评价长度不足一百字","以个别观察外推总体，没有代表性与完整的客户满意度数据。","基础"],
 ["测试环境中接口运行稳定，团队便断言生产环境一定没有问题。最关键的待核实条件是？","测试数据、负载和环境足够代表实际生产情况","测试页面使用同一种字体","测试操作均发生在白天","同事都使用相同的浏览器主题","测试场景与生产环境可能存在负载、数据与依赖差异，不能只凭测试环境的稳定性推出生产零故障。","提高"],
 ["某产品每件材料成本下降，但公司宣布“总体成本一定下降”。缺少什么比较？","产品数量及其他成本变化是否抵消材料节约","产品包装上的品牌是否醒目","采购员是否更换了头像","竞争对手是否发布了广告","总体成本=数量×单位材料等成本+其他开销，单件材料下降不保证合计下降。","提高"],
 ["模型在用于训练的数据上正确率为99%，于是宣称“面对新客户也能保持99%”。哪个条件必须得到额外检验？","在独立且有代表性的未见数据上能否取得相近表现","模型文件名称是否足够短","训练阶段是否使用了GPU","模型作者是否在社交媒体公布截图","训练集表现可能过拟合；必须独立验证未见样本和数据分布。","挑战"],
];
const EVIDENCE:readonly Seed[]=[
 ["A/B实验中，A组20人转化2人，B组20000人转化1600人。哪项评价更严谨？","不能只比10%和8%，还需要检验样本量、不确定性和分组可比性","A组转化率高2个百分点就证明A必然更优","B组转化人数多就证明B必然更优","两组都有人付款就说明没有差异","A样本很小导致结果波动大；仅两个点估计不能得出显著且因果的差异。","挑战"],
 ["某图表把纵轴从98开始，展示“评分从98升至99”。哪项解释最稳妥？","应该核实纵轴范围与实际增幅，避免视觉夸大","评分已经增长了约100%","纵轴起点不影响视觉判断","图表越陡峭代表样本越多","实际增幅是1/98约1.02%；截断纵轴可能放大视觉差异。","提高"],
 ["企业营收由300万元增至400万元，同期净利润由40万元降至20万元。哪一结论直接有证据？","营收增加，但净利润下降","营收增长意味着净利润率上升","企业成本必然完全不变","企业现金流必然增加","两个指标变化方向不同；仅营收增长不足以推断利润率和现金流改善。","基础"],
 ["一名自媒体作者声称月收入10万元，出示的只有后台“估算收益”截图。最重要的缺失证据是什么？","实际结算入账、相关成本和收入所属期间的记录","作者视频时长","截图使用深色还是浅色主题","作者粉丝是否主要是男性","估算收益不等于到账净利润；必须对账并核实期间与成本。","基础"],
 ["参加培训的员工平均绩效更高，但参加培训完全自愿。哪项对因果结论构成主要挑战？","原本积极或高绩效员工可能更愿意报名","培训教材采用了PDF格式","培训时间安排在周三","参加者有不同的工位","自愿参加会形成选择偏差；两组原有差异可能解释绩效。","提高"],
 ["一个城市的试点投诉率下降30%，企业宣称全国推广也必然下降30%。最直接的证据缺口是？","不同地区人群、流程和经营条件是否可比","宣传海报是否统一设计","城市名称是否在首页展示","试点结束时是否举办庆祝活动","外推需要判断试点与全国的可迁移性；地区差异可改变效果。","提高"],
 ["某商城本月有100次购买、1000次访问，次月150次购买、3000次访问。以购买次数/访问次数为口径，哪项正确？","购买次数增加，但转化率从10%降至5%","购买次数增多证明转化率升至15%","第二个月转化率仍为10%","访问量越大就一定越赚钱","首月100/1000=10%，次月150/3000=5%。不能混淆次数增长与转化率变化。","基础"],
 ["甲团队薪酬数据为4、5、6、7、28万元，乙团队为8、9、10、11、12万元。比较“典型成员”薪酬，哪项最合理？","应同时看中位数：甲6万元、乙10万元，甲的高值会拉高均值","甲最高工资28万元，故甲团队每个人都更高薪","只看两组最大值就能判断普通成员收入","两组人数相同，所以均值一定相同","甲有单个28万元高值，甲均值10万元、乙均值10万元，但中位数分别为6与10万元，均值会掩盖典型差异。","挑战"],
];
const BANK:readonly [AdvancedReasoningDomain,readonly Seed[]][]=[
 ["deduction",DEDUCTION],["constraint",CONSTRAINT],["induction",INDUCTION],
 ["assumptions",ASSUMPTIONS],["evidence",EVIDENCE],
];
function makeQuestion(domain:AdvancedReasoningDomain,row:Seed,i:number):AdvancedReasoningItem{
 const [stem,correct,wrong1,wrong2,wrong3,explanation,difficulty]=row;
 const choices=[correct,wrong1,wrong2,wrong3];
 // Alternating offsets lead to 10 instances of each correct answer A-D in 40q.
 const shift=i%4;
 const options=[...choices.slice(shift),...choices.slice(0,shift)] as [string,string,string,string];
 const answer=options.indexOf(correct) as 0|1|2|3;
 return {id:"ar-"+domain+"-"+String(i+1).padStart(2,"0"),domain,difficulty,stem,options,answer,explanation};
}
export const ADVANCED_REASONING_ITEMS:readonly AdvancedReasoningItem[]=
 BANK.flatMap(([domain,rows])=>rows.map((r,i)=>makeQuestion(domain,r,i)));
export type AdvancedReasoningReport=Readonly<{
 version:typeof ADVANCED_REASONING_VERSION;answered:number;correct:number;total:number;
 groups:readonly {id:AdvancedReasoningDomain;name:string;answered:number;correct:number;total:number;practice:string}[];
 review:readonly {id:string;chosen:number|null;answer:number;correct:boolean;explanation:string}[];
}>;
export function scoreAdvancedReasoning(answers:Readonly<Record<string,number>>):AdvancedReasoningReport{
 const known=new Set(ADVANCED_REASONING_ITEMS.map(x=>x.id));
 for(const [id,value] of Object.entries(answers)){
  if(!known.has(id)||!Number.isInteger(value)||value<0||value>3)throw new Error("INVALID_ADVANCED_REASONING_ANSWER");
 }
 const review=ADVANCED_REASONING_ITEMS.map(item=>{
  const chosen=Object.hasOwn(answers,item.id)?answers[item.id]:null;
  return {id:item.id,chosen,answer:item.answer,correct:chosen===item.answer,explanation:item.explanation};
 });
 return {
  version:ADVANCED_REASONING_VERSION,answered:review.filter(x=>x.chosen!==null).length,
  correct:review.filter(x=>x.correct).length,total:ADVANCED_REASONING_ITEMS.length,
  groups:ADVANCED_REASONING_DOMAINS.map(group=>{
   const items=ADVANCED_REASONING_ITEMS.filter(x=>x.domain===group.id);
   return {id:group.id,name:group.name,answered:items.filter(x=>Object.hasOwn(answers,x.id)).length,
    correct:items.filter(x=>answers[x.id]===x.answer).length,total:items.length,practice:group.practice};
  }),review,
 };
}
export function validateAdvancedReasoningBank():string[]{
 const errors:string[]=[];const ids=new Set<string>();
 if(ADVANCED_REASONING_ITEMS.length!==40)errors.push("EXPECTED_40_ITEMS");
 for(const group of ADVANCED_REASONING_DOMAINS){
  if(ADVANCED_REASONING_ITEMS.filter(x=>x.domain===group.id).length!==8)errors.push("EXPECTED_EIGHT:"+group.id);
 }
 for(const item of ADVANCED_REASONING_ITEMS){
  if(ids.has(item.id))errors.push("DUPLICATE:"+item.id);ids.add(item.id);
  if(!item.stem||!item.explanation||item.explanation.length<18)errors.push("INSUFFICIENT_EVIDENCE:"+item.id);
  if(item.options.length!==4||new Set(item.options).size!==4||item.options.some(x=>!x.trim()))
   errors.push("OPTIONS:"+item.id);
  if(!Number.isInteger(item.answer)||item.answer<0||item.answer>3)errors.push("ANSWER:"+item.id);
 }
 for(let i=0;i<4;i++)
  if(ADVANCED_REASONING_ITEMS.filter(x=>x.answer===i).length!==10)errors.push("ANSWER_POSITION:"+i);
 return errors;
}
