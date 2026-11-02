# 高级逻辑与批判性推理 · 40题独立模拟考试

开发日期：2026-11-02。属于SOC THINK综合测评正式建设任务#238；正式上线状态必须以GitHub合并SHA、生产自动发布和公网真实浏览器E2E为准，不以研究记录代替发布回执。

## 本批产品内容

独立地址：/assessment-center/advanced-reasoning-40。**保留原/assessment-center/reasoning-practice-20的20题免费基础练习**，不要替换、重命名或误认为正式IQ量表。

- 演绎与量词：8题（集合、充分/必要、逆否、存在性）
- 条件与排序：8题（多条件排程、相对顺序、资源排他）
- 规律归纳：8题（递推、差分、交替序列）
- 隐含假设：8题（成本、抽样代表性、混杂、泛化）
- 证据与论证：8题（AB样本、坐标图表、营收利润、收入实际结算、因果、地区外推、分母、中位数）

40道全部原创中文单选题，答案A/B/C/D各10题、固定45分钟，同浏览器标签页支持刷新后恢复（sessionStorage）、跳题/标记/交卷检查、到时自动交卷、留白按0分处理、逐题解析、成绩打印。总成绩和五类分项均只显示**本次原始做题正确数**，不提供年龄常模、智商、STEN、T分、录用率、标准化心理能力等级，也不记录进用户账户。

## 官方公开分类调研（不是题目来源）

- SHL Verify Interactive公开描述：演绎推理考察给定事实推出逻辑结论，归纳推理考察模式与序列，见 https://www.shl.hu/en/tests-tools/ability-tests
- Pearson TalentLens Watson-Glaser公开描述：重要子领域包括隐含假设、评价论证、推导结论，见 https://www.talentlens.com/watson-glaser.html
- 美国联邦OPM USA Hire Occupational Reasoning说明（2026年10月20日更新）：推理强调识别规则/逻辑关系、区分事实与可能性，见 https://support-usahire.opm.gov/hc/en-us/articles/45424556979859-Occupational-Reasoning-Assessment

只借鉴公开领域分类，不复制任何受限量表试题、模拟真实提供商自适应版本或冒充原出版社的常模。

## 核验与边界

核心代码：src/lib/advanced-reasoning-bank.ts；
独立正式考场：src/components/AdvancedReasoningRunner.tsx；
公开证据：src/lib/assessment-evidence.ts；
单元契约：scripts/test_advanced_reasoning_40.ts；
桌面及手机完整点击：tests/e2e/advanced-reasoning-40.spec.ts。

自动化断言：40题、5×8题、A-D答案位置10×4，四个互异有效选项、独立解释、完整卷40/40、交白卷0/40、部分作答39/40、未知题及越界答案拒绝，代表性数学/逻辑题答案独立指定复核。浏览器E2E验证入场同意、45分钟计时器、标记、刷新恢复、整卷作答、报告40道逐题解析、空卷0分、重测、手机横向布局。

这是一套原创教育/求职训练题，不是经测量学验证的标准化心理/智力测试。需要进一步由独立教研专家审查逻辑题唯一性与诱答项质量，进行题项统计、难度和区分度研究后才能发展专业测量报告。对外只标注原创模拟训练，不作招聘决策依据。

收费系统：完全免费，绝不自动创建订单，继续维持正式报告收费关闭。
