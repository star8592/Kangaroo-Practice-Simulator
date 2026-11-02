# SOCTHINK 职业价值观、工作方式、职场情境练习 v1

研发日期：2026-11-02。首批新增原创题78道。所有发布声称以正式版 SHA 与公网浏览器验证为准。

| 产品 | 题数、维度 | 正式URL | 计分 |
| --- | --- | --- | --- |
| 职业价值观 | 30题、六维各5题（成果、自主、认可、关系、支持、条件） | /assessment-center/work-values-30 | 个人1-5分均值、行动建议；非O*NET官方题库或中国常模 |
| 工作方式 | 24题、四维各6题（计划、探索、协作、独立推进） | /assessment-center/work-style-24 | 1-5分、含反向题；个人自报不是工作能力认证 |
| 情境判断训练 | 24原创场景、沟通/协调/风险/交付各6题 | /assessment-center/workplace-sjt-24 | 预设0-3参考策略点，逐题解释；未经过专家组盲评，不是标准化SJT |

三者复用同一考试交互界面、独立题库与明确评分器，涵盖18岁以上知情同意、逐题作答、跳题、交卷检查、维度结果与重测、打印。用户选择仅保存在当前网页内存，刷新即失效，不向服务器提交题目答案，不创建付费订单或用户画像。

## 原始方法与版权边界

- O*NET Work Values六维公开描述：https://www.onetcenter.org/dictionary/25.2/excel/work_values.html 。本站仅借鉴六维主题，全部中文题项原创；不是官方Work Importance Locator，不沿用官方测量常模或职业匹配结论。
- 美国OPM情境判断方法：https://www.opm.gov/policy-data-oversight/assessment-and-selection/other-assessment-methods/situational-judgment-tests 。正式SJT应依岗位关键事件与专家评分研究。本站24个场景与参考策略均原创，仅作练习，未进行多专家盲审、效度或公平性研究。
- 本站原有研究性大五、RIASEC与本次两个自我描述工具不互换；原有心理收费报告商品继续禁售，直到真实支付与交付闭环验收。

## 可复算验收

- 代码：src/lib/career-exploration-bank.ts、src/lib/workplace-sjt-bank.ts；交互：src/components/CareerDiscoveryRunner.tsx。
- 单元与平台：npm run test:career-discovery、npm run test:platform、npx tsc --noEmit、npm run build。
- 真实浏览器：tests/e2e/career-discovery.spec.ts，桌面和手机执行全部30/24/24题、评分、逐题解释及首页导航。
- 正反键、全题完整性、越界选项、未知题ID、维度题数、A-D参考最优选项位置分布，均有独立自动化断言；维度均值几乎相同时不伪造前两名。

## 后续边界

非标准化练习不能预测录用、智商、医疗心理状态。若提升为招聘SJT或标准化测量，需专业岗位关键事件、专家独立审核、真实样本、效度与公平性研究。机械、电气、嵌入式、金融等尚未完成的专岗必须独立建题、审校与验收，不能以本批78题冒充全部岗位上线。
