# AMC 8 闲鱼单次考试：隔离接入和实际回归（2026-11-18）

状态：独立开发分支；NOT DEPLOYED / NOT LIVE。主站生产运行进程和数据库均未修改，正在开发的代码仅置于孤立的 Git worktree。

## 最小改造

- 原 SOC THINK Next.js 题库 / ExamClient / exam-sessions / grade / DiagnosticReportView / PDF 代码全部复用，不重建考试产品、评分引擎或付费账本。
- marketplace-entitlement.ts：仅在 SOCTHINK_MARKETPLACE_EXAM_MODE=1 的第二实例启用，验证 License HMAC-SHA256 短效任务票据；用独立数据目录的原子文件创建将一次权益绑定至首个浏览器的 HttpOnly Cookie；拒绝异浏览器重复领取。
- /marketplace/claim 手机页：受控领取、续考或报告入口。/api/marketplace/claim POST 必须验证源站，领取成功后 303 跳转至原考试页面，不要求新账号或再次支付。
- /api/exam-sessions 已交卷后拒绝为同一权益再次建立考试；已有 report/PDF 只给本人下载，重复下载不扣次数。
- 普通主站运行不设置上述模式，保留原导航、用户登录、微信结算与原报告访问逻辑。第二实例必须独立端口、运行账户、数据目录与 PDF 内部地址。

## 上线前必须配置的隔离环境

| 名称 | 说明 |
| --- | --- |
| SOCTHINK_MARKETPLACE_EXAM_MODE | 第二实例设置 1，主站不设置 |
| SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN | 第二实例明确 HTTPS Origin |
| SOCTHINK_MARKETPLACE_HANDOFF_SECRET | 与 License 对端共享的独立高熵随机密钥（不入库） |
| SOCTHINK_MARKETPLACE_AMC8_EXAM_ID | 本次使用就绪的 maa-amc8-2024-user-owned |
| SOCTHINK_MARKETPLACE_DATA_DIR | 第二实例私有 grant 数据目录 |
| SOCTHINK_USER_DATA_DIR | 第二实例私有用户密钥目录，不能嵌套或指向主站目录 |
| PDF_INTERNAL_ORIGIN | 第二实例的内部访问地址，不能是主站 |
| PORT | 与主站不同的独立端口 |

现有 exam-bundle-store、exam-session 与 attempt-store 使用 process.cwd() 下的 private/exams 或 private/users，所以第二实例必须有隔离的 cwd/容器卷。AMC8 试卷副本需来源可审计、版本锁定、只读；主站已有用户作答和 PDF 文件不可共享。

## 真实测试记录

- 权益/安全测试 15/15 PASS：伪票据、过期、已兑二次抢占、同身份恢复、跨目录保护、主站不接受市场身份。
- Next 接口测试 5/5 PASS：Origin 校验、303 跳转、HttpOnly Cookie、跨浏览器拒绝和恢复。
- TypeScript 检查 PASS。
- 现有合法资料库中的 2024 AMC8 双语卷（25题，40分钟）复制为单独 QA 临时文件，现有训练就绪判定通过；未纳入公开 Git。
- 独立 Next.js 16.4.3 本地 QA（webpack 模式以绕开当前机器 Turbopack 的 build-manifest 缺失）：9/9 PASS，流程：合成签名的已付订单票据 → 真实 25 题领取页面 → 原考试组件 → 原考试会话 → 原评分 → 原诊断报告 → 实际 PDF 下载；再测已交卷不能二次开考、他人拒绝下载、另一个浏览器不能再次领取、本人可重新下载 PDF。
- 实际 PDF：1,107,695 字节，SHA256 前20位 5f4e611024ba7b214c1e。测试为模拟买家空白作答，证明真实引擎和 PDF 可运行，不代表报告内容质量验收。
- 对端 License 变更见 CommerceFlow PR #379。其许可任务与历史上传任务测试合计 7 项通过、Ruff PASS。对端已实现指定已付款证据格式的任务入口和签名票据，但证据仍由受权上游提交，不能替代真实 DevControl 闲鱼付款独立核验。

## 发版阻断

1. DevControl 实际卖家页面对订单/付款状态/买家/SKU 独立回读并留存证明，不能仅信调用方提供的 seller_paid_state。
2. 真实 License 与第二考试实例配置/部署联调，退款撤销及时同步给已兑权益，平台聊天实际发出和消息气泡回读；未做真实实单前不得发权。
3. 移动端真机 360/390/430px、微信浏览器、Android Chrome、iOS Safari，中文 A4 PDF 题图/分页/字体/数学内容专项核查。
4. 目前一次考试使用单服务进程的文件型作答记录；横向部署多进程前要加跨进程互斥/事务控制。
5. 一笔受控真实闲鱼支付全程验收以及主站原用户/报告/支付/后台回归。任何项缺失，保留 NOT_LIVE，不发布。

## 2026-11-18 R2 故障注入与回归验收（仅隔离环境）

所有付款票据均为合成样本；未触碰 SOC THINK 主站生产用户/支付库，未实际向闲鱼发货。

**代码修复**
- 增加 Rust Core 兑换 POST 接口，通过 Next 同源内网转发；删除新加的 Next.js POST handler，严格保留 Rust/API 职责边界。
- 所有考试会话、成绩和交卷锁使用已存在的 SOCTHINK_USER_DATA_DIR；考试会话原子保存，市场模式对被破坏的数据记录 fail-closed，不允许无声覆盖历史或重开次数。
- 商城领取页面纳入全站 105 页路由台账、禁止 SEO 索引；修复浏览器 Origin 丢失和 React hydrated 前按钮可点击。
- 2024 AMC8 25/25 题目图片从原有私有目录复制到隔离测试环境（共 1,943,107 字节，并核验 hash），新增图片缺失、软链接、非法 PNG、路径穿越的开考阻断。

**测试**
- Rust 完整 HTTP 故障注入：23/23 PASS，12 个同时争抢兑换仅 1 个成功，重启后权益仍绑定原使用者，损坏 JSON / 目录不可写 / 跨站 / 签名伪造 / 过期 / 错 SKU 全部正确拒绝。
- Rust 核心全部目标：12/12 PASS；前后端边界审计 PASS。
- 用户成绩/会话损坏与恢复：9/9 PASS；25 图缺失/损坏/软链接/穿越：6/6 PASS。
- 原 AMC8 真实判分/诊断/PDF：9/9 PASS；PDF 23 页，可提取 8,314 字符，并成功渲染首页 PNG（不能替代全部页面的视觉审查）。
- Playwright Chromium 真实点击 31/31 PASS，宽度 320、360、390、430、768px，领取、答题、切题、离线、刷新、交卷、图片与 PDF；无 JavaScript 页面错误及横向溢出。
- npm run verify:public：QUALITY_GATE=PASS，完整运行原考试、支付/身份/权限回归、全站 ESLint/TypeScript 和独立 npm ci 生产构建。
- CommerceFlow License 任务回归 pytest 21/21 PASS + Ruff PASS，新增提交方付款证据的 HMAC 签名、时间窗和跨商家/订单绑定（仍需真实独立观察者签发）。

**上线阻断**
DevControl 的真实闲鱼卖家订单核验/独立签名观察者、真实平台消息发出与回读、退款与撤销权益同步、试卷商业权利审核、真实 S22/iOS Safari 真机交付、生产卷及 25 题图部署哈希核对、多进程并发事务化尚未完成。所有 PR 保留 draft/NOT_LIVE，未经真实付款回执不得自动发权益。原主站正常运行路径未被改变。
## 2026-11-18 R3：撤销令牌 / 已兑报告失效 / 跨服务联调

- Rust Core 新增内网 `POST /internal/marketplace/revoke`：单独 `SOCTHINK_MARKETPLACE_REVOKE_SECRET`，签名覆盖订单 job、SKU、试卷、撤销原因、时间戳（10分钟时效），拒绝篡改/过期；只接受 `ORDER_REFUNDED`、`CHARGEBACK`、`ADMIN_REVOKED`。不新增 Next.js 业务 API，原 Rust 二进制仍只绑定 loopback。外部前端和 Nginx 不得公开这一内部路径。
- 原隔离 `SOCTHINK_MARKETPLACE_DATA_DIR/revocations/{jobHash}.json` 为不可逆撤销墓碑：Rust 领取前后均检查，买家旧 HMAC 票据立即返回 410；Node `marketplaceUserFromCookie` 检查墓碑，已登录身份/考试/报告/PDF 权限同步失效；领取页在真实 POST 前显示已撤销提示，不误导考生。
- Rust 故障矩阵扩展 **31/31 PASS**：包含无效撤销签名、旧观察、已兑与未兑撤销、重复撤销、服务重启后仍拒绝；原有12并发唯一领取等保留。
- Node 撤销身份 **7/7 PASS**，覆盖本人老Cookie与其他买家隔离。
- CommerceFlow `scripts/test_amc8_license_rust_revoke_e2e.py` 在独立本地 FastAPI→原 Rust HTTP 服务下 **12/12 PASS**：License 真正生成交接票据、Rust领取、退款后令牌和 Cookie失效、License远端不可达时待同步、重试恢复。
- 所有实单证据仍缺：Zoria Chrome CDP 页面语义不可用，S21 App当前仅规则页，无实单付款/退款回读，不具备自动开通真实订单条件。
- 合成的管理员撤销仅用于验证协议和操作，不代表实单退款已核验。生产需接入独立 DevControl 订单/退款观察、可靠重试、官方真实页面发货及消息气泡回读，保证主站原有支付和身份不受干扰。
## R9 · 30天包月资格策略（2026-11-18）

新增 src/lib/marketplace-monthly-readiness.ts 与 scripts/test_marketplace_monthly_readiness.mts，严格区分已经实现的单次考试与计划中的30天包月。包月卖点须至少4套不同的合法AMC8风格题卷，逐一验证每卷25题40分钟、题目齐全、图示真实可加载、权利审批与交付核对均为true，以及整卷内容不是重复复制。30天使用期，重复交卷的同卷不可重考，未购买卷、撤销、过期、延长伪造期限均被拒绝。18项合成模型测试通过。

**这不是正式月卡发放**：目前市场专用HMAC仍只支持 EDU-001 单次，Rust和 Next 实际考试接口没有接入 EDU-002 的30天结算/身份与凭证验证；本地仅1套 AMC8 完整试卷且商用版权待核对，因此月卡资格为不通过、SKU 保持不可售。后续应补足至少3套独立原创/获授权卷及人工质量审查，才可连接真实30天权限和正式收款。

CommerceFlow R9对应改动：严格限制EDU-002不可落入通用任务，SDK真实买家ID加入v2付款证明，原License SQLite同笔事务记入已支付体验的100分优惠资格，使用稳定HMAC买家伪名及唯一首月核销记录；真实月卡计费抵扣接口仍未上线。原单次考试/报告/退款技术链路不受影响。
## R10 2026-11-18：历史卷不得直接收费、双端HMAC许可和安全回归

进一步扫描 /mnt/disk1/Code/Kangaroo-Practice-Simulator/private/exams 共32份AMC8 JSON，其中**24份是25题完整卷，但这24份元数据 rightsPolicy.commercialUse 都为false、license=null**，另外8份是练习碎片。当前市场隔离卷2024也属于这批不可直接商用的历史文件。即使之前技术链路能产生PDF，也不能据此作为可卖许可证。没有对旧历史卷批量改写 rightsPolicy。

现已在Next与Rust双端加入强制技术阻断：付费考试必须25题/40分钟、训练完整及题图就绪，元数据商用许可明确，同时需要独立审核目录的0600逐卷签名收据，包含examId、真实源文件SHA256、许可、审核员和审核时间，以单独HMAC密钥核验。源试卷被改动、收据未签/被篡改/权限不安全、失去审核密钥时，Next领取/Cookie/报告和Rust直接领取均拒绝。Rust在实际创建买家grant之前检查，不会把未授权卷烧掉兑换权。合成QA纸卷仅在 loopback 测试 origin 可使用，正式HTTPS不允许当商品出售。签名审核本身不是第三方版权授权：审核人必须先取得真实合法权利证明。

真实旧历史卷商业就绪检查=false；新建一套测试专用原创简单算术卷（25题）只用于端到端验收，与真正的高质量AMC8包月原创题不同，不提供给买家。其测试签名和试卷仅在临时隔离路径生成，任务结束清除，不上传实际历史真题。

测试：商用审核篡改/缺签/私有权限/源文件替换16/16，单次权益15/15，退款后Cookie7/7，包月20/20，Rust全目标12/12，HTTP故障32/32，Next→Rust原考试/评分/PDF9/9（QA合成试卷、报告PDF15页），手机Chromium 320/360/390/430/768像素交互30/30；License FastAPI→独立Rust在审核缺失时503，再恢复后真实权益13/13。原主站 public quality gate PASS。完整设计/运营要求另见 docs/commerce/AMC8_MARKETPLACE_COMMERCIAL_RIGHTS_R10_20261118.md。

仍然 NOT_LIVE：必须准备原创可收费的完整AMC8模拟卷（入门至少1套、包月至少4套）并逐卷核验、获取真正商用批准；并完成正式HTTPS隔离发布、卖家真实订单登录与双规格、包月支付/抵扣、买家IM发货回读。旧 sales.service 保持 masked。
