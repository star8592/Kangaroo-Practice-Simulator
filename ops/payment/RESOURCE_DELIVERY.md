# SOCTHINK：单份数字资料购买与安全交付（2026-10-31）

## 一条完整且唯一的交易路径

微信网站已验证买家 → 服务器真实 SKU（单价/内容 ID）→ 同一
`billing_orders` → 微信支付 Native 官方签名查单 → 同一事务
`billing_item_entitlements` → 受保护下载 API。

退款最终由官方核实成功后，在同一账本事务撤销 item grant；
历史订单记录保留。无“再建一个资料订单系统”，没有网盘链接兑换码，
没有由浏览器提供 buyerId、paid、price 或本地文件路径。

## 商品和文件的两层审查

`billing_products` 现有单品字段包括：

- `product_kind='item'`、`content_kind='resource'`、
  `content_id=<resource_id>`，金额以分存储，币种 CNY。
- `enabled`、`rights_approved`、`delivery_verified`、
  `access_restricted` **必须全部为 true** 才可能出售；
  所有新行默认 false，不能根据外部素材“可下载”自动推断商业授权。
- 商品标题、文件格式、文件体积、付款后的交付位置需在购买前展示。

`billing_resource_assets` 是同一账本中的不可公开文件清单。
字段为 `resource_id`、`sha256`、`size_bytes`、`file_name`、
`mime_type`、`rights_approved` 和 `delivery_verified`。最后两个
默认为 false。已有成交记录的资源 ID、摘要、体积、格式与文件名不可被静默更改，
新版本需使用新 ID；即使 SKU 获批准，缺文件、摘要损坏或资产审核未完成
都会拒绝创建订单。

**只有合法原创、获得明确商业分发授权或符合其他实际使用权规则的内容**
才可标为可售。公开免费试卷、培训机构素材、网盘购买的低价文件，
不能因为“已经下载下来”就直接声称拥有再销售权。

## 文件存储和入库

所有待售文件均保存在 `SOCTHINK_DIGITAL_FILES_DIR` 指定的私有目录，
不得位于 Web 的 `public/`、公共下载站、GitHub 或自动发布会删除的目录。
该环境变量必须是绝对路径，服务用户具有最小读取权限。

私有文件路径由哈希确定（不能由浏览器提供）：

```text
SOCTHINK_DIGITAL_FILES_DIR/
  [sha256前两位]/
    [64位sha256].bin
```

单文件最大 100 MiB；交付时校验完整 SHA-256、大小、文件类型、
文件名和用户权益。Node 服务使用 `O_NOFOLLOW` 避免符号链接替换，
通过强制附件下载、禁缓存、`nosniff` 响应，不放公开文件地址。

授权运营人员在受控设备准备原创/合法素材后，可先执行只读检查
（命令中的文件名、ID 和路径是占位示例，必须换成真实文件）：

```bash
SOCTHINK_DIGITAL_FILES_DIR=/srv/socthink/private-resources \
 npx tsx scripts/stage_digital_resource.ts \
  /secure/source/my-original-pack.pdf original_pack_001 原创练习包.pdf application/pdf
```

核对输出的实际 SHA-256 与字节数后，再在**已授权**的资产保管机上执行
相同命令加 `--stage`。它只把文件以不可覆盖的哈希路径保存并重新验真，
同一哈希的重复入库在完整校验后视为幂等成功，
不会连接生产 PostgreSQL、不会批准销售、不会开启收款。
之后经审核的后台流程可把元数据写入 `billing_resource_assets`，
再由管理员分别审批资产内容与商品 SKU。首次审核必须看原文件、
版权来源、实际目录、交付格式、版本和退款说明。

## 本次提供的真实功能

- `GET /api/resources/download/[resourceId]` 使用网站签名微信账号；
  没有登录返回 401，买家没有该单品的已支付未撤销权益返回 403；
  DB 或文件不可用/损坏返回 503，不返回未经验证的半份文件。
- 买家“我的账号”显示已付款数字资料的下载入口；拒绝使用小程序
  未核实跨 AppID 的 Bearer 身份冒领网站订单。
- 资料购买页仅展示 SKU 和资产双重获批、已标记可交付，
  且在私有磁盘上能够核对大小的文件；创建微信支付订单时
  再读取并校验完整哈希，真正下载时再次核验。
- PostgreSQL 专用集成测试覆盖未登录/未购买/异账号、真实字节一致、
  SKU 未授权、文件损坏与符号链接、支付后授权、重复购买及退款撤权。

## 正式发布和商户激活仍是独立动作

这次功能完成并通过 CI 不等于微信实际收款开放。
生产还需要执行 **001→002→003→004→005** 的版本化 schema
初始化（新的专属数据库合计 10 个表）或由获授权运维审查后做
增量迁移；必须先备份、独立恢复验收，不能在自动部署或 npm build
中偷偷初始化数据库。配置安全的私有文件存储和运营账号权限后，
再与微信支付商户平台确认 Native 经营场景、绑定、签名查单、
补偿、真实单据及官方退款结果。没有授权与真实履约回执时
`SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED` 保持关闭。

网站 OAuth 与微信小程序 OpenID 不等价；小程序内虚拟内容购买需
分别遵守该平台的产品和支付规则，不能借用 PC 扫码收款假装
小程序支付已上线。
