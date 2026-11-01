import {getCareerPractice} from "./career-practice";
import type {CareerFamilyId} from "./career-demand";

type GuideSection=Readonly<{
  heading:string;
  paragraphs:readonly string[];
  checklist?:readonly string[];
}>;
export type CareerOriginalGuide=Readonly<{
  id:string;family:CareerFamilyId;caseId:string;title:string;
  summary:string;audience:string;revision:number;updatedAt:string;
  deliveryState:"free-original-material";
  fileName:string;sections:readonly GuideSection[];
}>;

/**
 * Three REAL first-party original learning materials, free in full for now.
 * These are not paid SKUs, not employer-official instructions, and not
 * third-party questions. Payment is never offered until catalogued and tested.
 */
export const CAREER_ORIGINAL_GUIDES:readonly CareerOriginalGuide[]=[
  {
    id:"supplier-decision-handbook",family:"procurement",caseId:"procurement-paper-2026q4-v1",
    title:"供应商选择：从需求到总到货成本",
    summary:"原创采购复习教程，包含需求拆解、合格件数、报价比较、交期约束和一套完整核算范例。",
    audience:"采购助理、应届供应链求职者、需要理解采购分析的非专业学习者",
    revision:1,updatedAt:"2026-11-01",deliveryState:"free-original-material",
    fileName:"SOCTHINK-采购供应商决策原创教程-v1.md",
    sections:[
      {heading:"一、先明确问题：采购的不是最低报价，而是可交付的结果",
        paragraphs:[
          "一张采购报价单至少要区分四个层次：商品价格、运费等到货费用、交期以及交付质量。只有在需求数量、质量、预算和时间都满足时，才进入比价。不能因为乙厂单价最低就跳过九天交期，也不能用标价直接代替总到货成本。",
          "练习情境：需要在七天内获得预计650件合格商品，预算上限35000元。甲厂单价48元，运费4元，不良率3%，交期5天，最多供800件；乙厂45+6元，不良率5%，交期9天；丙厂51+2元，不良率1%，交期4天，最多供750件。这些报价全部为SOCTHINK虚构数据。",
        ],
        checklist:["核对需求：目标是订货件数还是预计合格件数？","交期是否满足硬期限？","供货上限、预算和质量假设是否同口径？"]},
      {heading:"二、订货数量与总到货成本的三步计算",
        paragraphs:[
          "第一步，用预计合格率换算订货量：需要订货量＝向上取整〔目标合格件数÷(1－不良率)〕。此公式求的是按期望比例估算的订货量，不保证真实生产恰好合格650件。第二步，合并采购单价和运费，得到每件到货成本。第三步，乘以最低订货量，再检查预算、交期和产能限制。",
          "甲厂需要向上取整650÷0.97，即671件，总成本为671×52＝34892元；丙厂需要向上取整650÷0.99，即657件，总成本为657×53＝34821元。乙厂即使有低报价，也因交期9天超过7天而被排除。最终丙厂比甲厂节省71元。",
        ],
        checklist:["计算要最后向上取整，不能向下舍去","先筛除交期不达标方案，再比较成本","记录假设及单位，避免件、元、百分比混用"]},
      {heading:"三、做采购方案时，还要给管理者说明风险",
        paragraphs:[
          "建议用一句话结论加三条依据呈现：建议丙厂，原因是满足七天交付、可供至少657件、总到货成本34821元低于甲厂的34892元。结论之外，还应注明这是按不良率期望值测算，正式采购还应考虑质量验收、税费、付款账期、售后赔偿和供应中断。",
          "做一个压力测试：把目标合格商品提高至750件，其他条件不变。丙厂至少需要向上取整750÷0.99＝758件，超过750件供货上限；甲厂至少774件，总成本40248元，超出预算；乙厂仍交期超限。这时候没有单一供应商满足全部约束，应考虑分单、重谈预算或延期，而不是硬选一家。",
        ],
        checklist:["把不可行方案明确标为不可行","不要将模型中的期望合格件数当作质量承诺","提出下一步谈判、验收或供应备选方案"]},
      {heading:"四、自己练：面试或笔试时如何展示推理",
        paragraphs:[
          "练习题：某供方每件总到货价50元，不良率2%，预计需要490件合格产品。最低订货量是多少？预算25000元能否满足？请先自己计算再核答案。",
          "参考答案：订货量＝向上取整490÷0.98＝500件；总到货成本500×50＝25000元，刚好等于预算。注意这个判断只证明数学模型及预算满足，仍需另行检查产能和交期。可以到本站采购在线实操中参加24题45分钟的标准模拟笔试并查看逐题评分。",
        ]},
    ],
  },
  {
    id:"retail-campaign-roi-handbook",family:"operations",caseId:"operations-paper-2026q4-v1",
    title:"商品运营：退款后收入与广告 ROI 算清楚",
    summary:"原创运营分析教程，从GMV、退款率、净贡献到投放决策，附真实可复算的示范表格与练习。",
    audience:"商品运营、增长、市场投放岗位求职者和需要比较广告渠道的学习者",
    revision:1,updatedAt:"2026-11-01",deliveryState:"free-original-material",
    fileName:"SOCTHINK-商品运营ROI原创教程-v1.md",
    sections:[
      {heading:"一、避免最常见的错误：成交额不等于收入，更不等于利润",
        paragraphs:[
          "广告渠道可以带来较高的总成交额，但退款和广告支出会改变真实经营贡献。比较渠道前，必须把GMV、退款后收入、广告净贡献、ROI四个口径拆开，不允许把它们混用。",
          "本教程统一简化口径：退款后收入＝成交额×(1－退款率)；广告净贡献＝退款后收入－广告投入；广告ROI＝广告净贡献÷广告投入×100%。这里的ROI是供练习使用的广告贡献回报，不是会计净利润、毛利ROI，也不能证明广告带来的真实因果增量。",
        ],
        checklist:["所有渠道采用同样的退款率统计窗口","收入、费用和ROI的单位写清楚","真实项目还需计入商品成本、佣金、优惠券及归因窗口"]},
      {heading:"二、三条渠道的完整可复算案例",
        paragraphs:[
          "虚构渠道数据：站内搜索投入12000元、成交36000元、退款8%；短视频投入8000元、成交25200元、退款20%；社群推荐投入5000元、成交18000元、退款5%。以上均为原创合成数据。",
          "站内搜索：退款后收入33120元，净贡献21120元，ROI＝176%。短视频：退款后收入20160元，净贡献12160元，ROI＝152%。社群推荐：退款后收入17100元，净贡献12100元，ROI＝242%。因此净贡献金额最高的是站内搜索，而ROI比例最高的是社群推荐。两种结论并不冲突。",
        ],
        checklist:["用相同口径重算每个渠道","最高绝对贡献和最高百分比ROI要分开报告","金额相差很小时注意四舍五入和样本规模"]},
      {heading:"三、把数字变成实际预算选择",
        paragraphs:[
          "假设增长团队要求下一轮推广退款率低于10%，且广告ROI不低于200%。社群推荐5%退款、242% ROI，因此通过；站内搜索8%退款但176% ROI，不能通过；短视频20%退款不通过。在资源有限时，应按规则约束筛选，再讨论渠道是否具有可扩量能力。",
          "不能从社群ROI高就推断无限追加预算一定最划算：新增用户可能不同、边际流量可能变贵、自然成交会被归因给广告。正式决策至少补充实验分组、CAC、复购、订单毛利、退款滞后和归因质量。",
        ],
        checklist:["先列硬约束再排序","披露所选指标的不足","为下一次投放设计可以被证伪的验证条件"]},
      {heading:"四、自己练：重新计算一个渠道",
        paragraphs:[
          "练习题：一个渠道花费6000元，订单成交额21000元，退款率10%。在本教程简化模型下，退款后收入、净贡献和ROI是多少？",
          "参考答案：退款后收入21000×90%＝18900元；广告净贡献18900－6000＝12900元；ROI＝12900÷6000＝215%。可到本站商品运营实操题参加完整的24题45分钟岗位模拟笔试，学习如何兼顾收入、净贡献与退货约束。",
        ]},
    ],
  },
  {
    id:"manufacturing-fmea-handbook",family:"supply",caseId:"quality-paper-2026q4-v1",
    title:"工业质量：FMEA 风险识别入门与计算",
    summary:"原创工业质量基础教程，讲清S/O/D、RPN的计算和边界，配对照表、改进复算与专业判断清单。",
    audience:"制造业质量助理、工程类应届求职者、需要理解风险分析基础的业务学习者",
    revision:1,updatedAt:"2026-11-01",deliveryState:"free-original-material",
    fileName:"SOCTHINK-工业质量FMEA原创教程-v1.md",
    sections:[
      {heading:"一、失效模式分析到底在解决什么",
        paragraphs:[
          "FMEA（Failure Mode and Effects Analysis）通常用于提前识别产品或过程可能怎样失效、会造成什么后果、为什么发生以及现有控制是否足够。课堂里最容易见到的S（严重度）、O（发生频度）、D（难检出度）只构成部分基础信息，不能把乘积排名直接等同于正式工程行动优先级。",
          "本教程所有失效模式均为虚构教学样例，不是任何工厂真实事故或质量认证资料。对于涉及人员安全、法规、重大失效的情形，必须按正式AIAG-VDA FMEA方法、相应标准和企业审核机制判断，不能只看一个RPN值。",
        ],
        checklist:["用清楚的语句写出失效模式与后果","严重度高的事件必须独立关注","先理解评分定义，再讨论数值排名"]},
      {heading:"二、用四种失效模式训练基础RPN计算",
        paragraphs:[
          "简化课堂评分S×O×D：电源接头松动S9、O3、D8，RPN＝216；外壳表面划痕S3、O7、D2，RPN＝42；温度传感器漂移S8、O5、D6，RPN＝240；包装标签错误S5、O4、D3，RPN＝60。数据全部虚构，评分表仅用于数学演示。",
          "按照本教程规定的演习阈值RPN≥200，接头松动和传感器漂移进入复核名单。但阈值本身不是正式FMEA行动优先级标准。即使两个项目RPN相等，严重度、法规后果和控制措施也可能完全不同。",
        ],
        checklist:["S、O、D分别核实后才计算乘积","记录评分解释和风险后果","RPN用于练习比较，不直接替代AIAG-VDA行动优先级"]},
      {heading:"三、分析改进措施时，不要只报告RPN下降",
        paragraphs:[
          "假设增加检验手段后，传感器漂移的难检出度D从6变为3，S8和O5不变。新的课堂RPN＝8×5×3＝120，比原240下降120。这个变化反映模型中的检测能力改进，不意味着风险已经完全消失。",
          "实际改进报告应包括措施负责人与完成日期、实施证据、检测覆盖率、复测结果以及控制计划更新。对高严重度项目还要说明在设计和过程上能否直接降低失效发生概率，而不只是“更容易发现”。",
        ],
        checklist:["分别说明发生风险与检测风险的变化","保留行动的可验证证据","高严重度后果需要专项审批和复核"]},
      {heading:"四、自己练：只给一个RPN够不够",
        paragraphs:[
          "练习题：某虚构过程失效S7、O4、D5。新增检测方法使D降低到2，其他指标不变。计算改进前后RPN及变化，并说出这是否足以证明通过正式工程审核。",
          "参考答案：原RPN＝7×4×5＝140；新RPN＝7×4×2＝56；下降84。不能仅凭这一计算确认正式FMEA行动优先级或安全合规，应继续核对严重度、失效后果、预防和探测控制。网站工业质量实操有完整24题标准模拟笔试与逐题解析。",
        ]},
    ],
  },
];

export function getCareerGuide(id:string):CareerOriginalGuide|undefined{
  return CAREER_ORIGINAL_GUIDES.find(x=>x.id===id);
}
export function guideForFamily(family:CareerFamilyId):CareerOriginalGuide|undefined{
  return CAREER_ORIGINAL_GUIDES.find(x=>x.family===family);
}
export function careerGuideToMarkdown(guide:CareerOriginalGuide):string{
  const practice=getCareerPractice(guide.caseId);
  if(!practice)throw Error("GUIDE_WITHOUT_LIVE_PRACTICE:"+guide.id);
  const lines=[
    "# "+guide.title,
    "",
    "SOCTHINK 原创职业复习教程 · v"+guide.revision+" · "+guide.updatedAt,
    "授权：供个人学习阅读、保存和打印。禁止冒充任何企业官方试卷或资格标准。",
    "",
    "简介："+guide.summary,"适用人群："+guide.audience,
    "关联本站标准模拟笔试：https://socthink.cn/career/exams/"+practice.id,
    "",
    "说明：所有示例为虚构数据，仅用于训练基础分析和计算；不是企业内部资料、财务或工程专业意见。",
    "",
  ];
  for(const section of guide.sections){
    lines.push("## "+section.heading,"");
    for(const p of section.paragraphs)lines.push(p,"");
    if(section.checklist?.length){
      lines.push("### 自检清单","");
      for(const item of section.checklist)lines.push("- "+item);
      lines.push("");
    }
  }
  lines.push("---","","原创教学内容 © SOCTHINK。完整测评请访问官网；本文件当前为免费公开学习材料。","");
  return lines.join("\n");
}
export function validateCareerGuides():string[]{
  const errors:string[]=[];const ids=new Set<string>();
  for(const guide of CAREER_ORIGINAL_GUIDES){
    if(ids.has(guide.id))errors.push("duplicate:"+guide.id);
    ids.add(guide.id);
    const practice=getCareerPractice(guide.caseId);
    if(!practice||practice.family!==guide.family||practice.deliveryState!=="free-live-preview")
      errors.push("unverified-live-practice:"+guide.id);
    if(guide.sections.length<3||guide.sections.some(x=>x.paragraphs.length<2))
      errors.push("guide-not-complete:"+guide.id);
    if(!guide.fileName.endsWith(".md")||guide.deliveryState!=="free-original-material")
      errors.push("delivery-mismatch:"+guide.id);
    if(guide.title.length<10)errors.push("empty-product-title:"+guide.id);
  }
  return errors;
}
