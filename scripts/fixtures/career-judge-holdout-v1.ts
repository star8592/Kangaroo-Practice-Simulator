/**
 * Separate synthetic holdout set. Do not use any of these answers as few-shot
 * prompt examples. Labels are provisional and need independent human review.
 */
import type {JudgeCase} from "./career-judge-v1";
export const HOLDOUT_CASES:readonly JudgeCase[]=[
 {id:"h-cs-collab-brief",profileId:"campus-software",questionId:"cs-collab",expected:"brief",
  answer:"如果和同学有分歧，我会尊重对方，多沟通交流，以团队利益为重。",
  labelReason:"只有应然态度，没有具体冲突事件或方案"},
 {id:"h-cs-collab-owner",profileId:"campus-software",questionId:"cs-collab",expected:"ownership",
  answer:"课程项目里两个人对接口缓存有分歧。我们团队召开评审，最后提交对比文档并如期上线，测试也通过了。",
  labelReason:"有具体争议与团队结果，没有候选人本人采取的措施"},
 {id:"h-cs-collab-outcome",profileId:"campus-software",questionId:"cs-collab",expected:"outcome",
  answer:"我们曾因接口字段设计争执。我主动组织了方案评审，邀请两方各自演示并确定协议，但没有回看双方是否真正执行约定。",
  labelReason:"本人动作明确，后续执行和冲突解决效果没有验证"},
 {id:"h-cs-collab-depth",profileId:"campus-software",questionId:"cs-collab",expected:"depth",
  answer:"同学希望增加接口缓存，我独立组织基准测试，记录P95从420毫秒降到280毫秒，同时验证数据一致性；结果和决议写入团队PR评审并在一周后复查。",
  labelReason:"争议背景、本人决策推动、基准和复盘证据俱全"},
 {id:"h-cs-intro-owner",profileId:"campus-software",questionId:"cs-intro",expected:"ownership",
  answer:"我学计算机科学，目标是后台研发。团队在学校完成了一套管理系统，拿到了竞赛奖项，我的同学也曾经做过开发实习。",
  labelReason:"有岗位与项目背景，但没有说明自己承担了什么"},
 {id:"h-cs-intro-depth",profileId:"campus-software",questionId:"cs-intro",expected:"depth",
  answer:"我学习软件工程，目标岗位是后端开发；实习时我负责订单查询接口，优化索引后P95耗时从310降到190毫秒，并附有数据库执行计划和压测报告。",
  labelReason:"岗位方向、本人项目贡献与可核查技术结果均明确"},
 {id:"h-sp-incident-brief",profileId:"social-procurement",questionId:"sp-incident",expected:"brief",
  answer:"发生延期的时候我会快速采取有效措施，保证公司利益，不让损失扩大。",
  labelReason:"没有库存、缺货、时间或明确行动情景"},
 {id:"h-sp-incident-owner",profileId:"social-procurement",questionId:"sp-incident",expected:"ownership",
  answer:"上新前关键物料延期10天，供应链团队查看库存，把订单按紧急程度分组，并由仓储和门店对齐补货安排。",
  labelReason:"有具体事件与团队动作，但未说明候选人本人做什么"},
 {id:"h-sp-incident-outcome",profileId:"social-procurement",questionId:"sp-incident",expected:"outcome",
  answer:"供应商交期推迟10天，我亲自核查仓库库存和缺货门店，协调邻区调拨并通知销售修改排期，但是没有追踪补货是否按时送达。",
  labelReason:"本人应急行动清楚，没有按时履约和减损验收"},
 {id:"h-sp-incident-depth",profileId:"social-procurement",questionId:"sp-incident",expected:"depth",
  answer:"上新前5天我发现物料延迟，自己协调邻区调拨1200件，同时将高优先级门店排入首批配送；3天内确认98%的关键订单按约交付并留有仓库出库单。",
  labelReason:"情境、本人决策和交付率记录齐全"},
 {id:"h-sp-reflection-brief",profileId:"social-procurement",questionId:"sp-reflection",expected:"brief",
  answer:"工作中有失败正常，我会认真总结经验教训，争取下一次取得更好的成绩。",
  labelReason:"没有具体未达标目标、责任或复盘对象"},
 {id:"h-sp-reflection-outcome",profileId:"social-procurement",questionId:"sp-reflection",expected:"outcome",
  answer:"季度采购降本没达到目标，我亲自分析过几次异常采购订单，随后调整供应商沟通频率，但当时没有核算纠偏后的实际成本。",
  labelReason:"本人纠偏行为明确，没有验证实际改善效果"}
];
export const HOLDOUT_DISTRIBUTION={brief:3,ownership:3,outcome:3,depth:3} as const;
