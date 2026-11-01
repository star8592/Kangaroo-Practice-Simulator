import {CAREER_FORMAL_PAPERS} from "./career-formal-bank";
/**
 * Public, versioned SOCTHINK ORIGINAL career practice materials.
 *
 * JOB REQUIREMENTS and our independent training CASE are separate:
 * a recruitment source supports the skill selection, not these questions.
 * The hidden answer key lives only in career-practice-grade.ts (server route).
 */
export type CareerPracticeKind = "single" | "multiple" | "integer";
export type CareerPracticeQuestion = Readonly<{
  id:string;
  kind:CareerPracticeKind;
  skill:string;
  weight:number;
  prompt:string;
  hint?:string;
  options?:readonly Readonly<{id:string;label:string}>[];
  placeholder?:string;
  provenance?:Readonly<{sourceKind:"original";authoredAt:string;sourceObservedAt:string;
    topicSourceId:string;topicSourcePlatform:string;topicSourceTitle:string;topicSourceUrl?:string}>;
}>;
export type CareerPracticeCase = Readonly<{
  id:string;
  revision:number;
  title:string;
  domain:"career";
  family:"procurement"|"operations"|"supply";
  evidenceSignalId:string;
  evidenceSkillCodes:readonly string[];
  sourceRights:"original";
  deliveryState:"free-live-preview";
  maxPoints:number;
  durationMinutes:number;
  context:string;
  assumptions:readonly string[];
  suppliers:readonly Readonly<{
    id:string;name:string;unitPrice:number;freightPerUnit:number;defectPercent:number;
    leadDays:number;maxUnits:number;
  }>[];
  dataTable?:Readonly<{headers:readonly string[];rows:readonly (readonly string[])[]}>;
  questions:readonly CareerPracticeQuestion[];
}>;

export const CAREER_PRACTICE_CASES:readonly CareerPracticeCase[]=[
  {
    id:"supplier-selection-001",revision:1,domain:"career",family:"procurement",
    title:"采购岗位实操｜供应商选择与到货成本",
    evidenceSignalId:"meituan-procurement",
    evidenceSkillCodes:["supplier_selection"],
    sourceRights:"original",deliveryState:"free-live-preview",
    durationMinutes:15,maxPoints:100,
    context:"一家虚构零售企业要在 7 天内采购到预计 650 件合格商品，含商品单价与单件运费的采购总预算不超过 35,000 元。三家供应商报价如下，请以数据作出采购决策。",
    assumptions:[
      "本练习使用虚构、合成的数据，不涉及任何企业商业秘密或真实报价。",
      "为便于确定性评分，预计合格件数＝采购件数×（1－不良率）；所需订货件数向上取整。这只是期望值模型，不保证真实交付。",
      "每个供应商的最大可订量及交货天数按表内数值计算；忽略税额及额外损失。只有交货期、供货上限、35,000 元预算均满足，才算可行方案。",
    ],
    suppliers:[
      {id:"A",name:"甲厂",unitPrice:48,freightPerUnit:4,defectPercent:3,leadDays:5,maxUnits:800},
      {id:"B",name:"乙厂",unitPrice:45,freightPerUnit:6,defectPercent:5,leadDays:9,maxUnits:1000},
      {id:"C",name:"丙厂",unitPrice:51,freightPerUnit:2,defectPercent:1,leadDays:4,maxUnits:750},
    ],
    questions:[
      {
        id:"eligibility",kind:"multiple",skill:"供应商准入与交期",weight:15,
        prompt:"按预计 650 件合格品、7 天交付和 35,000 元预算，哪些供应商存在可行的独立供货方案？（多选）",
        hint:"需同时考虑交货期、最大订货量和不良率；不能只看单价。",
        options:[{id:"A",label:"甲厂 A"},{id:"B",label:"乙厂 B"},{id:"C",label:"丙厂 C"}],
      },
      {
        id:"quantity",kind:"integer",skill:"不良率与订货测算",weight:15,
        prompt:"如果选择丙厂 C，至少应订购多少件，才能使模型中的预计合格件数达到 650 件？",
        placeholder:"请输入整数，例如 650",
      },
      {
        id:"landed-cost",kind:"integer",skill:"到货总成本",weight:20,
        prompt:"按上一题丙厂 C 的最低订货量计算，商品价款加运费的总成本是多少元？",
        placeholder:"请输入金额（元），无需货币符号",
      },
      {
        id:"supplier-choice",kind:"single",skill:"多约束经营决策",weight:20,
        prompt:"以预计 650 件合格商品为目标，在所有满足交期、容量与预算条件的方案中，哪家供应商的总到货成本最低？",
        options:[{id:"A",label:"甲厂 A"},{id:"B",label:"乙厂 B"},{id:"C",label:"丙厂 C"},{id:"none",label:"三家都无法满足"}],
      },
      {
        id:"savings",kind:"integer",skill:"供应商成本比较",weight:15,
        prompt:"在最低可行采购量下，选择丙厂 C 相比甲厂 A，预计能节省多少元总到货成本？",
        placeholder:"请输入节约金额（元）",
      },
      {
        id:"contingency",kind:"single",skill:"采购风险与需求变化",weight:15,
        prompt:"假设需求突然增加到预计 750 件合格商品，但仍要求 7 天内交货、总预算不超过 35,000 元。哪一家单独供货能满足全部条件？",
        options:[{id:"A",label:"甲厂 A"},{id:"B",label:"乙厂 B"},{id:"C",label:"丙厂 C"},{id:"none",label:"没有一家满足，需要重新谈判或调整约束"}],
      },
    ],
  },

  {
    id:"campaign-performance-001",revision:1,domain:"career",family:"operations",
    title:"商品运营实操｜营销渠道的净收入与回报",
    evidenceSignalId:"meituan-ops",evidenceSkillCodes:["roi"],
    sourceRights:"original",deliveryState:"free-live-preview",durationMinutes:15,maxPoints:100,
    context:"某虚构零售企业投放了三组推广活动。为了判断真实经营效果，本题统一按退款后净收入计算回报，并且仅将广告投放费作为可变成本。请不要把总成交额直接等同于实际收入。",
    assumptions:[
      "以下营销数据全部为虚构教学数据，并非企业真实投放结果。",
      "退款后净收入 = 总成交额 ×（1－退款率）；本练习忽略其他成本及税费。",
      "广告净贡献 = 退款后净收入－广告投入；本练习ROI = 广告净贡献÷广告投入×100%。",
      "这套练习简化了商业ROI概念，实际业务应进一步核对毛利、佣金、留存和归因窗口。",
    ],
    suppliers:[],
    dataTable:{
      headers:["推广渠道","广告投入","总成交额","退款率","订单数"],
      rows:[
        ["站内搜索","12,000元","36,000元","8%","240"],
        ["短视频","8,000元","25,200元","20%","140"],
        ["社群推荐","5,000元","18,000元","5%","100"],
      ],
    },
    questions:[
      {id:"eligible",kind:"multiple",skill:"退款约束筛选",weight:15,
        prompt:"如果活动要求退款率低于10%，哪些渠道满足要求？（多选）",
        options:[{id:"search",label:"站内搜索"},{id:"video",label:"短视频"},{id:"community",label:"社群推荐"}]},
      {id:"net-revenue",kind:"integer",skill:"退款后净收入",weight:15,
        prompt:"站内搜索渠道的退款后净收入是多少元？",placeholder:"请输入整数金额"},
      {id:"contribution",kind:"integer",skill:"广告净贡献",weight:20,
        prompt:"社群推荐渠道的广告净贡献是多少元？",placeholder:"请输入整数金额"},
      {id:"best-roi",kind:"single",skill:"营销ROI比较",weight:20,
        prompt:"按案例给出的ROI计算方法，哪个渠道的广告ROI最高？",
        options:[{id:"search",label:"站内搜索"},{id:"video",label:"短视频"},{id:"community",label:"社群推荐"}]},
      {id:"largest-contribution",kind:"integer",skill:"净贡献与ROI区别",weight:15,
        prompt:"三个渠道中，广告净贡献最高的渠道，其净贡献是多少元？",placeholder:"请输入整数金额"},
      {id:"roi-threshold",kind:"single",skill:"营销预算选择",weight:15,
        prompt:"如果新增预算只能投给退款率低于10%且广告ROI至少200%的渠道，应选哪个？",
        options:[{id:"search",label:"站内搜索"},{id:"video",label:"短视频"},{id:"community",label:"社群推荐"},{id:"none",label:"没有符合条件的渠道"}]},
    ],
  },
  {
    id:"manufacturing-quality-001",revision:1,domain:"career",family:"supply",
    title:"工业质量实操｜简化FMEA风险识别",
    evidenceSignalId:"schneider-quality",evidenceSkillCodes:["quality_risk"],
    sourceRights:"original",deliveryState:"free-live-preview",durationMinutes:15,maxPoints:100,
    context:"某虚构制造工厂正在梳理四种装配失效模式。为练习基础计算，本案例使用简化的S(严重度)、O(发生频度)、D(不易检测程度)数值，RPN = S×O×D。注意：正式FMEA行动优先级不能仅按RPN排。",
    assumptions:[
      "所有失效模式及评分均为虚构教学数据，不能作为工程合规、设备安全或正式FMEA报告。",
      "S、O、D均为练习设置的1至10分指标，D越高代表越难发现。",
      "本练习以RPN = S×O×D复习基础计算；真正的AIAG-VDA FMEA需结合严重度、行动优先级和具体风险控制方法。",
    ],
    suppliers:[],
    dataTable:{
      headers:["虚构失效模式","严重度 S","发生频度 O","难检出度 D"],
      rows:[
        ["电源接头松动","9","3","8"],
        ["外壳表面划痕","3","7","2"],
        ["温度传感器漂移","8","5","6"],
        ["包装标签错误","5","4","3"],
      ],
    },
    questions:[
      {id:"temperature-rpn",kind:"integer",skill:"RPN风险计算",weight:15,
        prompt:"温度传感器漂移的RPN是多少？",placeholder:"请输入整数"},
      {id:"largest-rpn",kind:"single",skill:"风险线索排序",weight:20,
        prompt:"按本案例简化RPN计算，哪种失效模式的RPN最高？",
        options:[{id:"connector",label:"电源接头松动"},{id:"scratch",label:"外壳表面划痕"},{id:"temperature",label:"温度传感器漂移"},{id:"label",label:"包装标签错误"}]},
      {id:"high-rpn",kind:"multiple",skill:"高风险候选识别",weight:15,
        prompt:"本练习暂以RPN大于或等于200作为复核线索，哪些模式满足？（多选）",
        options:[{id:"connector",label:"电源接头松动"},{id:"scratch",label:"外壳表面划痕"},{id:"temperature",label:"温度传感器漂移"},{id:"label",label:"包装标签错误"}]},
      {id:"improved-rpn",kind:"integer",skill:"改进前后风险比较",weight:20,
        prompt:"温度传感器漂移的严重度与频度不变，如果难检出度D从6降低到3，新RPN是多少？",placeholder:"请输入整数"},
      {id:"rpn-reduction",kind:"integer",skill:"风险数值变化",weight:15,
        prompt:"上题改进使温度传感器漂移的RPN下降了多少？",placeholder:"请输入整数"},
      {id:"professional-judgement",kind:"single",skill:"专业质量风险判断",weight:15,
        prompt:"如果两种失效模式RPN相同，但严重度差异显著，专业的下一步判断是什么？",
        options:[{id:"rpn-only",label:"只看RPN，相同就完全等价"},{id:"ignore-high-s",label:"优先忽略高严重度的失效模式"},{id:"review-severity",label:"同时考察严重度、后果、探测控制与行动优先级"},{id:"stop",label:"不需要进一步风险评审"}]},
    ],
  },
];

export function getCareerPractice(id:string):CareerPracticeCase|undefined{
  return CAREER_PRACTICE_CASES.find(x=>x.id===id)||CAREER_FORMAL_PAPERS.find(x=>x.id===id);
}
export type CareerPracticeAnswers=Readonly<Record<string,string|readonly string[]>>;
