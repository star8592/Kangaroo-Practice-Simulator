# 智量测评中心 / SOCTHINK Measurement Center

> 版本：工程首版 2026-10-31。状态：研究预览代码与基础评分器；不代表正式心理测量学认证、已部署生产环境或可收费产品。

## 产品边界

- 正式入口：`/assessment-center`；现有 `/assessments` 保留为考试平台总目录。
- 六个业务方向：人格、认知推理、职业兴趣、岗位胜任、学习能力、心理状态与生活发展。
- 当前允许公开试测的产品：`career-interest-exploration-30`、`ipip-big-five-50-cn-preview`。
- 不创建第二套登录、用户档案、订单、支付或题库数据库。未验证量表不可售卖，也不允许冒充 IQ 测验、心理疾病诊断或企业招聘淘汰工具。

## 数据模型与单一路径

```text
src/lib/measurement-center.ts
  -> 量表注册/版本/许可/年龄与验证状态
  -> 题项、维度、反向计分
  -> scoreInstrument: 严格 1..5 单选输入，完整作答后确定性评分
src/app/assessment-center/* + src/components/MeasurementRunner.tsx
  -> 量表说明、18+确认、逐题作答、结果展示与打印
src/lib/assessment-platform.ts
  -> 原考试总目录注册"测评中心研究预览"真实可用路由
```

结果为各维度 `mean = sum((reverse ? 6 - x : x))/itemCount`（1~5 分）。这不是人群百分位、IQ 分数或中国常模标准分。任何收费及“高于多少用户”的展示都需要后续独立数据与审批验证。

### 当前题库来源

1. **职业兴趣探索 30题**：SOCTHINK 原创活动偏好问卷；以 Holland RIASEC 理论为组织框架，每维五题。**不声称为 O*NET® 官方 Interest Profiler，不沿用 O*NET 标准化效度或职业匹配结论。** 参考：https://www.onetcenter.org/IP.html；许可说明：https://www.onetcenter.org/license_tools.html。
2. **大五人格 50题**：按照 IPIP 官方 50-Item Big Five Markers 原始顺序、五个维度及正反计分键制作研究性中文译稿。英文源及计分键：https://ipip.ori.org/new_ipip-50-item-scale.htm。IPIP 原始题项属于 public domain：https://ipip.ori.org/ 。**当前中文译稿未完成双向翻译、认知访谈、信效度与中国样本测量等值性检验，不可用英文或其它语种研究指标冒充中文版效度。**
3. 指南：ITC/ATP Technology-Based Assessment Guidelines（2025年7月更新）https://www.intestcom.org/page/16 。

## 隐私与使用范围

- 本版前端组件在浏览器内存中保存用户临时选项并确定性计算，不向服务端上传答卷；刷新即失效。此说明仅限此测评模块，不替代全站隐私声明。
- 两套试测均暂限定 18+，不需要输入姓名/手机/年龄/其他身份信息。
- 不保存个人回答、临床/敏感心理内容，不做后台排行榜、人格画像营销或雇主评分。
- 进入正式服务前，必须确认个人信息处理告知、年龄与监护机制、数据删除、身份绑定的业务必要性、异常访问防范；不能用用户统一微信账号自动索取不必要的敏感资料。

## 运行与自动化验收

```bash
npm ci
npm run test:measurement-center
npm run test:platform
npx tsc --noEmit
npm run build
```

`scripts/test_measurement_center.ts` 校验独立维度与题数、完整性、输入合法性、反向计分、来源、18+范围、免费状态、浏览器内存交互约束。

## 后续验收计划（正式产品前置条件，不是阻碍研究预览的新增发布门禁）

1. 由心理测量/职业测评专家审查中文版语义等值；盲式复核正反向键，并保存可审计差异。
2. 完成理解性访谈、认知访谈、真实试测样本、缺失模式、信度、结构效度、测量等值与公平性研究；明确年龄和群体的样本边界。
3. 证明报告结论与适用对象一致；禁止用模型补写没有证据的百分位、常模、IQ、诊断与求职成功率。
4. 将用户同意、撤回、隐私处理和有效期写入业务规范，并做移动端 Safari/Android、键盘、读屏与断网可用性验收。
5. 任意正式收费商品必须先达到内容准确、交付可验收、支付回调服务端核验和用户权益发放闭环；研究预览保持免费。
6. 认知/岗位/学习/心理状态栏目先建立各自可验证的任务蓝图和量表授权，不允许复制粘贴同一套“人格题”冒充不同测评。

## 状态约定

- `CODE_CREATED`：源码落地，不能代表测试通过。
- `TEST_PASS`：本地指定测试真实通过，不能代表已部署。
- `DEPLOYED`：公网实际版本 SHA 和页面响应确认。
- `E2E_VERIFIED`：真实用户完整作答、计分、报告、异常流复测通过。
- `NORM_VALIDATED`：已审查本土验证资料及适用范围，不能由代码测试代替。

生产发布必须遵守 `ops/release/SOCTHINK_DEPLOYMENT.md`，只以 GitHub main 为源，验收失败自动回滚，绝不清理私有用户数据。独立开发工作区不得替换原来 Z890 中的脏工作目录。
