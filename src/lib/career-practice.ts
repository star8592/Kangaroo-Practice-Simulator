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
}>;
export type CareerPracticeCase = Readonly<{
  id:string;
  revision:number;
  title:string;
  domain:"career";
  family:"procurement";
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
];

export function getCareerPractice(id:string):CareerPracticeCase|undefined{
  return CAREER_PRACTICE_CASES.find(x=>x.id===id);
}
export type CareerPracticeAnswers=Readonly<Record<string,string|readonly string[]>>;
