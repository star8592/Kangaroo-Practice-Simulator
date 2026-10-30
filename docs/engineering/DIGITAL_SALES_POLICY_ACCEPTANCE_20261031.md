# 数字商品售出后无理由退款规则：前后台贯通

用户经营规则：在线考试、单张试卷、数字资料与数字服务开通/交付后原则上**不支持无理由退货退款**。法定质量责任、不能交付、严重不符等仍需依法处理，不能写“绝对不退款”规避消费者权利。

实现范围：

1. 结算页 `/membership` 在即使收款尚未开启时显示显著中文政策；所有列出的付费产品在购买按钮之前有默认不勾选的主动确认。
2. 单商品、资料、会员服务统一以 `src/lib/digital-sales-policy.ts` 的固定版 `digital-delivery-no-reason-v1-2026-10-31` 为唯一文字和版本来源。内容版本备份见 `docs/legal/DIGITAL_SALES_POLICY_V1_20261031.md`。
3. Web POST `/api/payments/wechat/checkout` 独立校验 `policyAccepted===true` 且 `policyVersion` 与服务端当前一致；未确认的请求返回 HTTP 409 `PURCHASE_POLICY_CONFIRMATION_REQUIRED`，无法创建 Native 支付订单。
4. `src/lib/billing-ledger.ts` 对所有新 `wechat_native` 订单均要求正式政策确认，且由服务端赋予 `acceptedAt`；不信任客户端时间或产品价格。老 `wechat_pay` 内部调用仅作为历史兼容，不为已有订单补充假证明。
5. `ops/db/008_digital_sales_consent.sql` 仅在同一正式账本订单上增加 `sales_policy_version` 和 `sales_policy_accepted_at`，二者必须同时为空或同时非空；触发器禁止后续修改确认内容。已有订单原封不动。
6. `/account` 对已购订单显示售后确认事实、时间及规则链接；`/digital-purchase-policy` 和 `/terms` 解释完整条款并保留法定售后权利。页脚增加售后入口。
7. 真实法定退款/纠纷仍需提供人工/平台售后处理，不应删除既有 `refundVerifiedOrder` 受控退款与权益冲正能力；**不能**凭一张“售出不退”条款把合规纠纷或微信官方退款处理链彻底移除。

专属 PG 初建迁移顺序 001→002→003→004→005→006→007→008，仍为 10 张表。现有正式库只可经授权、备份和审计后增量迁移；生产初始化和商户密钥加载仍独立审批。本变更不能擅自打开真实结算开关，CI 和沙盒账本不等于收款上线。

验收：条款默认非确认/版本不符/明确确认输入测试；Z890 独立 PG 项级订单确认时间、版本持久化、不可事后抹除、历史 NULL 不伪造、现有支付-资源-关单-退款回归；GitHub 四项 CI 和 Production Receipt 完成后才称代码上线。
