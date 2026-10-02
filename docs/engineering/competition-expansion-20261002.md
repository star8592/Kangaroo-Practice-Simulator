# 国外赛事扩充：2026-10-02

## SPEC
CEMC 官方 https://cemc.uwaterloo.ca/online-ordering-terms-and-conditions 明确其拥有的材料采用 CC BY-NC 4.0；练习资源不得收费。官方历年卷入口：https://cemc.uwaterloo.ca/resources/past-contests 。本项目维持免费训练、来源署名和现有版权声明。

## OBSERVED
发布前公网 SHA 5586c190b10067d9674cec826763172bcee405a7，trainingInventory.cemc=0。本地49套/1225题原文校验通过，其中14套/350题已具备GPT审查记录且通过双语完整性检查。Gauss 6套、Pascal 1套、Fermat 7套。

## INTERNAL / ADR
本次优先发布已审核的完整 CEMC 真题，复用现有数据发布脚本，不放宽审核门槛。只有准备完毕的14套进入发布清单。UKMT、MATHCOUNTS、HMMT、Purple Comet 保持官方来源研究阶段，未获转载依据的题目不批量公开。UKMT SMC官方已声明2026年改为22道选择题加3道000–999填答、90分钟，未来不得套用旧版全选择题模板。来源：https://ukmt.org.uk/senior-challenges/senior-mathematical-challenge 。

## 验收
1. GPT审核记录、canonical source、localization、双语bundle校验全部通过。
2. 发布前比较本地/生产清单；仅同步14套及其图片；生产已有文件备份。
3. 发布后逐文件SHA256、生产manifest、公网CEMC数量与代码SHA一致。
4. 在真实生产服务执行现有smoke，并验证学生入口能加载新增试卷；未通过不宣称上线。

## ASSUMPTIONS
无新增外部API或考试规则假设；本次为已有合格数据的生产同步。后续赛事的复制授权和本地化质量仍待逐项确认。

## 发布阻塞与计分修正
官方2023Gauss7及2025Fermat确认空题每题2分、最多10题。已实现旧数据兼容、导入器修正及评分上限，增加边界和AMC回归测试，并接入CI。TypeScript检查通过。自动审批拒绝直接推送main，要求用户明确授权该发布路径，因此本次转为独立分支评审。数据同步主动停止并触发脚本回滚，不将未修正计分的试卷作为已上线成果。用户批准后应先合并修复、通过CI及生产回执，再重新运行COMPETITION_ID=cemc的数据发布与真实学生入口验收。
