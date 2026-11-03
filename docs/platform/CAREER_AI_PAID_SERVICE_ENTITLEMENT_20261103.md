# SOC THINK AI 模拟面试：单账本按次收费与消费权益 V1

日期：2026-11-03。**这是关闭状态的增量商业底座，不表示公众已能购买或实际成功收款。**

## 支付商品与交付承诺

- 商品类型是 `service / career_interview`，按岗位建立独立 SKU；当前只认可 `campus-software` 与 `social-procurement` 两条已验收面试路线。
- `billing_products.service_sessions` 是套餐包含的**完整模拟面试场次数**（1–20），不是 Token 数、文字行数或直接赠送的无限模型调用。每场至多五道经过预审的追问，每次新的付费面试会话原子消耗一个场次。
- 付款金额、套餐场次、商品和允许使用的岗位均从服务端正式 SKU 和已核实的微信订单得出；金额和 SKU 用量会在 `billing_orders.service_sessions_snapshot` 下单时冻结，修改商品不影响旧订单。
- 正式可售条件：原 Native 收款官方准入及真实回调验真、商品 `enabled`、原创内容权利审批、交付验收、限制访问、模型服务就绪，以及单独运营开关 `SOCTHINK_CAREER_AI_BILLING_ENABLED=1`。目前该开关默认关闭；此次迁移**不创建或启用任何付费商品**，不改变既有微信首单试付买家或试付 SKU。
- 正常数字交付按商店已有协议。因法律/平台要求发生经过官方核验的真实退款时，撤销未完成的相关权益，且不可继续调用模型。

## 唯一账本与用户授权

- 沿用原 `billing_products`、`billing_orders`、`billing_payment_events` 和微信 Native 的独立官方查单结算程序；无第二套付款系统。
- 迁移：`ops/db/010_career_interview_service_sessions.sql`，新增 service 结构约束、场次数快照、权益余额 `billing_career_session_grants`、真实场次 `billing_career_sessions` 与逐题消费 `billing_career_round_calls`。
- 只有同一微信账号的 `PARENT_SESSION_COOKIE` 服务端验证成功，才能取得按次商品权益；客户端传入的账号、金额、付款成功、model provider 均不能授权。Miniapp Bearer 不被当成网站微信买家。
- `POST /api/career/interviews/session` 在首次明确授权调用 AI 时，原子从已支付未撤销的次数包里消耗一场并创建随机、不跨账号的 2 小时会话；重复 `clientRequestId` 只返回原会话，不重复消费。
- `GET /api/career/interviews/followup?profileId=...` 只有模型及收费开关均启用、该微信账号有未使用次数或有效场次时才展示 AI 开关；未登录与未购买均为关闭。
- `POST /api/career/interviews/followup` 先验证同源、买家身份、已购会话所属岗位及当前主问题，再锁定该轮调用；同一主问题不能并行重复请求模型，模型失败允许一次受控重试。主/备模型均失败时客户端显示已有的规则追问，不会编造模型输出。
- 默认不开启数据库长久保存用户原始答卷；服务器仅记录购买者ID、支付凭据引用、会话ID、题目ID、调用状态，不存完整用户回答和招聘信息。

## 工程风险与发布次序

1. **代码部署可先于迁移**：现有 item/subscription 订单代码及真实支付账本路径不得引用新增 `service_sessions` 字段；仅 service 产品操作会使用该字段。生产默认开关全部关闭，没有人会在未迁移时进入新的收费代码路径。
2. 迁移必须由独立迁移角色执行，先验证旧订单/报告权益未变化，在副本数据库与恢复演练中运行两遍；生产只做备份后正式迁移，不通过 HTTP 或公开 API 操作数据库结构。
3. 新增 CI 的真实 PostgreSQL 测试必须覆盖未付款拒绝、官方金额不一致拒绝、一次真实订单两次结算幂等、套餐冻结、多人/并发抢占、跨用户拒绝、同场重复请求及退款撤权。
4. 生产启用前须有一个**明确授权的自有微信试付买家 + 指定全新服务 SKU** 完整付款回执（不能占用或替换原试付设置）、服务端订单与权益、实测模型五轮、超时降级、支付后本人可恢复服务的端到端证明。
5. 不要把 `enabled:false` 的公网状态、单元测试里的合成收款或本地 Ollama 推理误报为“付费服务正式上线”。语音/评分/长报告还需下一轮交付，不得在用户未获得这些能力前冒用宣传。

## 商品启用状态

当前未创建任何正式 AI 面试产品或销售价格。未来按市场验证定价后，通过已有商品上架与后台审核建立新 SKU，必须 `enabled=false` 首次创建，完成所有实证后再单独开启。**不自动运行生产收费迁移，也不创造真钱订单。**
