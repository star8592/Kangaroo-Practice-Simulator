# 职业训练第一条真实交付链路：采购供应商选择原创案例

状态：**开发分支完成 / 本地可运行 / 免费 / 尚未合并或正式上线 / 未收费**。
执行日期：2026-11-01，关联 [PR #217](https://github.com/star8592/Kangaroo-Practice-Simulator/pull/217)。

## 一、为什么先做这条而不是 SQL

正式产品原则是 **企业公开招聘 → 职位要求 → 能力分类 → 原创供给 → 可用/可交付 → 用户训练、评分和复练**。技术专项只在岗位真实需求涉及它时开发。

第一条免费案例选择采购与供应商管理，来自岗位信号 `meituan-procurement`（具体职位级），对应该公开职位中的供应商评估、成本分析能力。不声称美团提供、委托或使用本站试卷；该招聘页面也可能随时间更新/下线。

## 二、真实可玩的内容与判分

页面：`/career/practice/supplier-selection-001`。从 `/assessments` → `/career` → “采购与供应商管理”进入。

业务数据 **完全虚构/原创**：三家候选供应商甲 A、乙 B、丙 C，报价、运费、不良率、交期和可供数量不同。需求为预计 650 件合格品、7 天交期、预算 35,000 元。采用确定性练习假设“预计合格件数 = 订货量 × (1 - 不良率)”，这只是计算模型，不能确保真实数量。

6道题、100分：
1. 合规供应商筛选（多选，15分）。
2. 不良率对应最低订货量（整数，15分）。
3. 含运费完整到货成本（整数，20分）。
4. 多约束最优供应商（单选，20分）。
5. 与备选供应商的差额（整数，15分）。
6. 需求激增后的约束与供应风险（单选，15分）。

**计算校验数据（仅文档，不在客户端题干内嵌判分密钥）**：
- A：ceil(650/0.97)=671件；成本 671×(48+4)=34,892元。
- B：交期 9 天，不符合 7 天限制。
- C：ceil(650/0.99)=657件；成本657×(51+2)=34,821元。
- 合规候选 A/C，成本最低为 C，较 A 节约 71元。
- 需求变为750件：A最低774件但成本超35,000元；C需要758件却仅可供750件；B交期不达标。没有单家符合全部要求。

## 三、技术链路

- 唯一公开案例源：`src/lib/career-practice.ts`（公开题干/虚构数据/题目类型/权重；**不含答案**）。
- 来源驱动商品映射：`src/lib/career-product-mapper.ts`，具体岗位技能 `supplier_selection` 只在已具备可运行案例后从 `proposal` 升级为 `free-practice`，具有真实 `liveHref`。其余商品仍然是规划中，不生成付款按钮。
- 与原有 Assessment Core 对齐：`src/lib/career-practice-grade.ts` 建立原创来源哈希、`AssessmentItemContract` 和 `AssessmentBlueprintContract`，按照确定性业务计算真实计分。
- 服务端接口：`POST /api/career/practice/supplier-selection-001/grade`，8KB请求限额、严格核查题目/选项、只返回计分与解释，不执行用户代码、不读写收费库、不记录隐私。
- 页面：`src/app/career/practice/[id]/page.tsx` + `src/components/CareerPracticeRunner.tsx`。支持PC/手机、答卷本地暂存、前后切题、部分作答交卷、逐题解析、能力建议、重测。
- 原有目录 `/assessments` 通过 `/career` 真实入口访问。未建第二套账号、支付或正式收费题库。
- 用户的作答仅在本地浏览器 `localStorage` 保存临时草稿，**并没有写入微信账号或持久成绩数据库**。所谓“重测”是重新做本案例，不等于跨设备长期能力档案。

## 四、实际测试记录

`npm run test:career-research` 包含 `test:career-practice`：100分正确卷、0分白卷、0分错卷、30分部分答卷、多选顺序、未知题目、畸形输入、超长请求、404路由和415非JSON均测试通过。

`npm run test:platform`：七大考试域、现有数学、资源目录、人格测评中心回归通过；新增职业域从“只有计划”调整为“已有一项免费内容可用”，**并非所有职业课程均已上线**。

`npx tsc --noEmit` 通过。

实际本地浏览器人工脚本：在 1440px 与390px 宽度中，从 `/career` 进入案例、填入6道正确答案、调用真实评分接口、读到100分报告、点击重测、提交白卷取得0分；无页面横向溢出。专用可重复测试 `tests/e2e/career-practice.spec.ts` 加入Playwright正式测试集。

### 真实浏览器 E2E 回执与移动端根因处理

可重复端到端用例为 `tests/e2e/career-practice.spec.ts`，测试经由真实前台接口完成：
`/career` → 采购供应商训练 → 答题 → 刷新恢复本地草稿 → 100 分服务端评分及报告 → 重新挑战 → 白卷 0 分。

首轮 Playwright 的桌面用例通过，Pixel 7 移动端出现按钮触摸被页面其他元素拦截。追查到桌面宽度 640px 的报价表把手机外层 CSS Grid 的最小内容宽度撑大，从而导致触摸坐标错位；**没有使用 force click 绕过**。最终将 `.runner` 改为 `grid-template-columns:minmax(0,1fr)`，并明确其子元素 `min-width:0`，把 `.tableScroll` 限制在父容器内滚动。

修复后执行：

```bash
E2E_BASE_URL=http://127.0.0.1:31287 E2E_EXTERNAL_SERVER=1 \
  npx playwright test tests/e2e/career-practice.spec.ts \
    --project=desktop-chromium --project=mobile-chromium --reporter=line
```

**原始回执：`2 passed (3.3s)`、`CAREER_BROWSER_E2E=PASS`。** Playwright 的手机设备配置使用 Pixel 7 触摸模式，与仅修改桌面浏览器视口宽度的模拟不同。本地 Next 服务器是独立工作区端口，绝非正式公网发布。

## 五、仍未完成

- 尚未合并 PR #217、发布到正式 socthink.cn；当前本地成功不等于所有访问者可用。
- 免费演示未做账号级持久成绩、真实微信付费权益、购买后报告/复测，因此不得标“收费商品已上线”。
- 这是一套采购计算与决策的小型练习，不是完整的采购岗位职业能力测评；尚无企业常模，也不做录用概率推断。
- 后续沿相同“真实JD → 技能 → 原创任务 → 可复核评分 → 复测 → 验收 → 商品”组件生产运营、工业销售、物流合规、AI工程等跨岗位案例，以真实需求及付费结果决定供给顺序。不得对没有具体JD的岗位自动生产题库或虚假考试入口。

## 六、2026-11-01 跨职业复用扩展：3 项免费原创实操

原来的第一条采购演示已扩展为三套共用评分引擎的训练服务，**以下为后续实现更新，前述“仅一项免费”是初始阶段记录**：

| 案例ID | 职业领域及证据锚点 | 任务 | 评分方式 |
|---|---|---|---|
| `supplier-selection-001` | 美团采购 JD `meituan-procurement` | 采购准入、成本与交期 | 根据供应商业务模型运算 |
| `campaign-performance-001` | 美团商品运营 JD `meituan-ops` | 退款后净收入、广告净贡献、ROI、资源配置 | 服务端专用客观答案及逐题解析 |
| `manufacturing-quality-001` | 施耐德电气工业质量 JD `schneider-quality` | 简化 FMEA RPN、风险等级线索、改进影响 | 服务端专用客观答案及逐题解析 |

每套6题100分，虚构数据与原创题干，独立业务背景、表格、计算口径和职位来源。

**工程复用验证**：三套练习使用同一个 `CareerPracticeRunner`、`POST /api/career/practice/[id]/grade`、`gradeCareerPractice`、Assessment Core 题目/蓝图契约、报告与浏览器草稿。前台案例表格容器支持不同字段，能在手机上横向滚动而不撑大页面。岗位技能候选只有对应具体来源和可运行案例同时存在时才显示 `free-practice`；其他产品仍是 `proposal`。

营销案例用退款后净收入 `revenue*(1-returnRate)`，广告净贡献 `netRevenue-spend`，简化 `ROI=netContribution/spend`。这个练习不能代表正式财务利润或营销归因测量。工业质量案例用 `RPN=S*O*D` 练习数值，特别提醒**AIAG-VDA正式FMEA行动优先级不能单纯依据RPN**，必须考虑严重度与控制计划。本案例不是安全认证、工程签字或法定质量合规证明。

**新测试回执**：`npm run test:career-research` 正确卷、错卷、空卷、HTTP接口及原创内容契约均通过，覆盖3套；`npm run test:platform` 与 `npx tsc --noEmit` 通过。Playwright使用桌面Chrome和Pixel 7移动触控模式，对3套案例的实际填写、服务端100分、重测0分及页面宽度执行测试，共 **6 passed (8.2s)**。

**仍须区分**：到此为止是“3个免费训练样本的可运行交付闭环”，不是账号持续学习画像、收费后交付、完整招聘题库，也不代表目标企业参与或认可本站训练。正式发布另按生产链接及回执验收。
