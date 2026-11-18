# AMC8 美国版 R20：CommerceFlow 月卡结算台账衔接与禁售回执

日期：2026-11-18。SOC THINK 的 2026 MAA 双语真卷仍是私有内部材料，不对外发售。

## R19 完成回执

SOC THINK PR #369 最新 R19 commit `aa6281f`，GitHub CI、Miniapp CI、Rust Catalog R1 **全部成功**；CommerceFlow PR #379 R19 `445a794` 对应的三套 CI **全部成功**。

原卷私有 25 张图、25页中英审校 PDF、25×5个中文选项继续在 Z890 私有工作区。中文与选项未获最终逐题人工签字，2026原卷商业翻译、网络展示和分发权未核实。

## R20 CommerceFlow 新增可测试能力（原系统，不新增独立账本服务）

`star8592/CommerceFlow` 的 R20 分支在已有 License SQLite 中新增 `marketplace_amc8_monthly_settlements` 内部表，专门记录独立可信的月卡签名收款证据和一笔原子核销，不会触及考试或用户权限：

- SDK v3 只读订单观察要求单笔订单的列表与详情同时核验：买家、商品、月卡规格ID、实付1890/1990分、付款时间、退款状态；
- 新 SDK v3 HMAC 签名强绑定月卡SKU、买家、订单、实付金额，拒绝客户端伪造的已付款；
- SQLite `BEGIN IMMEDIATE` 原子事务同时核销仅有的一张同买家100分体验券，订单重复事件可幂等、不同订单并发不能双抵扣；
- 不完整订单或未能得到SDK真实月卡规格字段时直接拒绝，不会使用“商品标题像月卡”推断。
- 合成专项：79项 Python通过、36项 Node.js卖家观察测试通过；Node测试已接入CommerceFlow原有 CI。
- 代码与报告位于 CommerceFlow PR #379，`docs/AMC8_R20_MONTHLY_SETTLEMENT_V3_20261118.md`。

## 不能误解的进度

此轮**没有**向真实闲鱼买家发出任何¥19.90月卡，尚无真实订单金额和规格回读。当前主进程创建 `EDU-002` 任务依旧返回 `AMC8_MONTH_NOT_READY`。只是在原有系统中完善可信内部结算准备能力，尚未实现真实收款、30天发权、用户自助入口、卖家IM发货回执，也未取得原卷商业版权授权。

## 下一关

先在卖家登录只读观察中取得真实商品规格ID/金额完整证据，再在合规原卷内容可用的前提下，接入服务端实际结算回调、跨服务30天签名权益、取消退款即时撤销和买家IM发货确认。任何未完成不得修改 `commercialUse=false`、`examReady=false` 或 `offer_ready=false`。

本文件不含 MAA 原题、原图及其完整译文。
