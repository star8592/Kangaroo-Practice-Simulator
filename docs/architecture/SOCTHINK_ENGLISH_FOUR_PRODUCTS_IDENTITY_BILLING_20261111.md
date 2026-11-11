# SOC THINK 英语馆四独立产品、统一用户与计费实施纲要

日期：2026-11-11。唯一主域名：`https://socthink.cn/`。此文以代码、真实部署和付款回执核查状态；**目录已接入不代表四个服务已迁移本域，也不代表 SSO / 支付已接通。**

## 一、产品归属（产品独立，导航归一）

| SOC THINK 入口 | 真实 GitHub 仓库 | 已核验运行位置 | 当前状态 |
| --- | --- | --- | --- |
| `/english/pronunciation` | `star8592/AccentLab` | `https://toktik.tech/accent-lab/practice-library` | 已有公开发音训练界面，发音评分和多用户商业授权未闭环 |
| `/english/vocabulary` | `star8592/VocabLearningPlatform` | `https://toktik.tech/vocab/` | 独立 Rust + Vue + PostgreSQL 课堂已部署；真实首班和付费验收仍待完成 |
| `/english/reading` | `star8592/EnglishLeap` | Z890 局域网 / 本机 MVP | 三篇原创双语文章、九步精读可复核，但独立公网应用未验收，不能用 AelOS 或 AccentLab 冒充 |
| `/english/aelos` | `star8592/aelos` | `https://toktik.tech/english/home` | 已有 AelOS 综合学习 UI，读写任务与能力图谱；匿名访问会遇到认证 401，PG 与登录迁移在进行中 |

四个项目各自维护仓库、部署、私有学习数据与训练逻辑。 SOC THINK 只负责发现、统一账户对接、购买入口、中央权益判定以及应用间的经过验证的跳转。禁止复制项目源码到主站另起第二套学习记录。四个项目自己的单词/阅读模块不得被误算作四个独立项目的替代品。

## 二、统一账户：SOC THINK 是身份授权发行方

- 已存在 SOC THINK 微信登录和账户，不再增加“家长+学生多个账号”作为主站购买前提。用户付费持有者为成人的 SOC THINK `account_id`；课堂中的儿童/学员是产品内的受保护身份，**不得自动等同于购买者**。
- 建立中央 `external_account_links` 映射：`account_id`、`product_id`、`external_subject`、`verified_method`、`created_at`、`revoked_at`；唯一键约束及双向验权。微信 openid 通常是应用范围内标识，**不允许按昵称、邮箱或不同公众号 openid 猜测同一身份**。
- 跨站启动不携带永久 token、用户 openid、孩子隐私或订单号到 URL。正式对接使用服务端 OIDC Authorization Code + PKCE / 一次性授权码：短有效期、`aud` 限定产品、`state` 防 CSRF、`nonce`、一次性兑换、撤销和时钟偏差检测，服务端验证真实 SOC THINK 登录与授权后才产生应用会话。
- 每个独立 App 保留产品专用登录/会话和自己的教育记录；当前暂不启用跨站自动登录，也不共享 cookie、私钥或数据库账号。公网在 HTTPS 下正常运行不等于 SSO 已就绪。

## 三、唯一计费与权益判定

- 付款仅由 SOC THINK 现有收费账本和可信支付回调入账。独立英语项目不得复制微信/支付宝支付单；禁止在浏览器前端根据成功返回 URL 或 `paid=true` 判断已付款。
- 稳定权益键（内部命名，不是现成商品 SKU）：
  `english.pronunciation`、`english.vocabulary`、`english.reading`、`english.aelos`。必须将每个具体 SKU 绑定权益、有效期、用量配额、撤权策略和真正可交付功能后才能上架。
- 推荐两种销售形态：单项项目权益和英语组合权益。组合订单应映射为四条独立权益授予，而不是四处写订单。既有 `billing_orders`、`billing_item_entitlements` 能提供中央订单思路；任何 schema 扩展先做幂等、并发、退款/撤销和备份复原测试。
- 产品端以服务端可验证的权益 API 查询 `subject + product_id + capability`。只返回当前权限状态及过期时间，不返回交易凭据、儿童隐私、支付密钥；缓存应受控短时并支持主动撤权。付费失败保持免费体验而不是假称成功。
- 完整闭环验收须包括：游客浏览、SOC THINK 微信登录、独立 App 账户绑定、真实测试订单支付及通知、账本授权、四产品分别准入、到期/撤销、设备退出、幂等回调、失败自动回退；缺一不可不得宣称四应用已经实现统一付费。
- AelOS 中的 LEXILE 区间与学习能力图谱是项目 UI/评估设计，不应对外冒充获得 MetaMetrics 蓝思认证或官方蓝思测评成绩。

## 四、同域托管路线（不要在前台假装完成）

1. **当前已完成：** `/english` 和四个 SOC THINK 原生目录页，正式域名与真实状态说明；已核验的独立产品链接照常启动。EnglishLeap 无独立公网服务时禁用启动按钮。
2. **接下来：** 每个产品独立发布为只读/免费公开体验，主站 `/english/{id}` 做唯一产品简介与入口；用受控的同域反向代理或独立应用路径适配真实文件和 SPA 深链接。要分别验收 JS/CSS 资源 base path、API、WebSocket、CORS、麦克风 HTTPS、文件上传大小、Cookie 和登出，以及服务可回退；不得为了统一域名改写子应用学生资料。
3. **再下一步：** 安全的跨应用账号绑定与中央权益校验；业务支付在完成实单全链路和权限撤销测试之后启用。不接受只有一个“支付成功”截图就标记全部开通。
4. **发布证据：** CI 全绿、服务端真实测试、手机和桌面浏览器（含真正点开四个目录）、生产 SHA/路径验收、自动回退方案。阅读独立服务没有授权发布条件前，宁可显示未开放，也不接一个假页面。

所有进度必须逐服务单独记录，避免“英语馆可访问”被误表述为“四应用统一会员、真实购买、完整学习闭环已完成”。
