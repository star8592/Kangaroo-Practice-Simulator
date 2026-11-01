# 职业实操第二阶段：微信单账号成绩保存与跨设备历史（2026-11-01）

状态：**开发分支已完成，正式生产部署须以合并、CI及公网回执为准。**
目标：在现有已上线的3套免费职业实操基础上，免费作答体验保持不变；真实微信登录用户提交后自动保存评分报告、练习时间及重测历史。沿用既有微信身份与私有用户数据盘，不引入家长/孩子双账号，不另建支付或收费账本。

## 端到端行为

- 匿名、游客：可以完成所有免费案例的全部题目并得到相同的服务端评分、解析及复练；不创建云端成绩、不允许读取他人历史。
- 已验证网站微信买家：沿用现有 `socthink_parent_session`，由 `userFromRequest` 内部解析为稳定的 `guest_family_<HMAC>` 学习身份；不接受前端上送的 `userId`、`parentId` 或 `score`。
- 已通过微信小程序独立鉴权的学习会话：复用现有 `wx_<HMAC>` 身份与 Bearer 验证，不使用客户端传来的原始微信 OpenID。
- 成功提交后：评分在服务器重新计算，写入账号持久记录；返回 `saveStatus=saved`、`attemptId`、`submittedAt` 以及 `attemptPersistence=account`。前台提示保存成功。
- 保存异常：评分保持免费，显示明确保存失败及“重试保存”入口；不得把未存储结果标记为已保存。与既有 `/api/career/practice/[id]/grade` 一条评分主链路完成，无第二套评分服务。
- “我的微信账号练习记录”：仅登录的实际拥有者可查询自己的成绩清单，按日期逆序显示分数，点击再次读取服务端原报告；无单独微信账号注册页。
- 可重复交卷：由浏览器生成每次交卷的UUID；服务端采用基于原答案的SHA256指纹和独立原子文件进行幂等提交，同UUID同答卷返回原记录，不重复计数；同UUID不同答卷返回409，不允许覆盖既有成绩。
- “重新挑战”会形成一次新的提交ID，保留既有历史成绩。每页展示最多50条记录，每个用户独立目录。

## 权限与数据

**唯一身份来源是现有 `src/lib/auth.ts`**。只有服务端已验证 `candidateNo=WECHAT`、`role=student`，且ID符合 `guest_family_[0-9a-f]{32}` 或 `wx_[0-9a-f]{32}` 的账号允许落盘/查询。纯 `guest_`、匿名、管理员、伪造买家ID均不允许持久化或读取。未知记录在其他微信账号查询返回404（非泄露性报错）。

保存根目录为现有 `userDataPath("career-practice-attempts")`，位于生产发布外部持久化存储 `/opt/socthink-math/private/users/career-practice-attempts`。生产发布采用不可变运行版本，`current/private/users` 已确认映射到此同一共享路径。用户目录以SHA256散列，0700权限，文件0600权限，不包含微信OpenID或完整身份信息的可读文件名。文件包含单次原始**服务端成绩、逐题解析和技能得分**，不是客户浏览器自报分数。

一份结果一次文件，先独立 `wx` 创建与 `fsync`，再 `link` 原子创建正式文件，保护并行提交；重复提交核对同一用户、案例、版本与答案指纹。**当前并发模型按现有一台共享文件系统Node服务设计，不声称多机数据库事务或跨区同步。** 自动保存失败不会制造伪造的已保存报告。

## 身份边界：网站与小程序

现有网站微信会话和微信小程序会话分别有稳定的签名伪匿名学习ID。**它们尚未提供经过验证的UnionID/账号绑定合并功能。** 因此本阶段保证相同网站微信账号在不同浏览器/设备重新登录后可恢复历史，小程序自己的同一签名身份能恢复其历史；**不能宣称网站与微信小程序本身已经自动合并成同一跨端档案**。真正跨两端共用同一账户，需要由已有微信身份系统核对可信UnionID与显式绑定流程，不能把两个OpenID硬拼接。

## 关键API

- `POST /api/career/practice/[id]/grade`：现有评分接口，新增可选 `attemptId` UUID；游客原样免费评分；已验证账号服务端自动保存，返回保存状态。
- `GET /api/career/practice/history?caseId=...`：仅当前认证微信账号的列表，默认最多20、可请求1—50。
- `GET /api/career/practice/history?attemptId=UUID`：仅当前认证微信账号的完整逐题报告。没有客户端指定`ownerId`之类参数。
- 所有结果使用 `Cache-Control: private,no-store` 与 `Vary:Cookie,Authorization`。

## 验收与发布边界

自动化:
1. `npm run test:career-account`：匿名/游客免费评分、不存记录、真实签名微信网页与小程序学习会话、A/B账号结果隔离、UUID重试幂等、409冲突、错误路径和列表权限、隔离私有目录的0700/0600权限。
2. `npm run test:career-research` / `npm run test:platform`：老采购/运营/FMEA案例、企业来源、平台SQL/阅读/测评与收费相关公共接口回归。
3. `E2E_ALLOW_SYNTHETIC_FIXTURE=1 SOCTHINK_USER_DATA_DIR=/tmp/socthink-career-history-... E2E_BASE_URL=http://127.0.0.1:31345 E2E_EXTERNAL_SERVER=1 npx playwright test tests/e2e/career-account-history.spec.ts --project=desktop-chromium --project=mobile-chromium`：两套临时微信签名账号、真实Next服务、PC和Pixel7浏览器，完成100分交卷、刷新恢复报告、全新浏览器恢复、异账号404。
4. 现有免费浏览器测试 `tests/e2e/career-practice.spec.ts`：不登录也可答题、3套全部得分与重测共6项。
5. 生产以真实GitHub CI、不可变服务发布、公共`/api/release` SHA、公开访问权限及只读历史401核查为准，绝不能把合并/本地验收伪报成正式部署。

## 尚未实现（明确不得宣传）

- 完整付费职业深度报告、商品目录SKU上架、微信支付订单→权益→完整报告交付。现有 `billing-ledger.ts` 只允许注册的、校验过的商品类别，职业报告不能通过伪造billing_products行绕过正式内容类型与交付验证。
- 用户退出/删除账号后的练习数据生命周期，以及跨官网/小程序的已验证身份绑定。
- 技能连续诊断的纵向能力模型、个性化推送、企业官方职业资格认证。
