# SOCTHINK 2026-10-31：生产收款 503 与前台页面不一致根因核查

> 本报告区分**真实公网/服务器观察**、**代码改动**和**尚未完成的资金验收**；
> 未获得真实生产商户交易回执时不得称付款已上线。绝不输出、复制或覆盖旧商户私钥。

## P0：生产微信付款为何是 503

### 两套真实存在、但互不等同的部署

| 项目 | 旧 ThinkAI | 当前综合考试站 |
| --- | --- | --- |
| 域名 | `www.socthink.cn` | `socthink.cn` |
| 域名解析（本次观测） | `8.148.186.49` | `8.166.137.232` |
| 运行模式 | 历史 Python ThinkAI | Next.js 16 + 专用 PG 交易账本 |
| 微信 Native 状态 | 公开只读 `/api/subscription/provider-status`：`configured=true`、`mock_mode=false`、`callback_ready=true` | `/api/access/me`：`ledgerConfigured=false`；`/api/access/catalog`：`checkoutAvailable=false`；下单返回 HTTP 503 |
| 实付记录 | 2026-06-16 曾有真实验收，非本日真单证明 | 未有本新账本真单资金核验 |

**结论**：这不是“支付服务 503 是微信官方坏了”，而是旧支付**没有完成向新网站的账号、交易、商户配置和交付迁接**。
旧站仍报告配置就绪，不代表可将其旧订单号/买家授权直接写入新站。
当前代码 `src/app/api/payments/wechat/checkout/route.ts` 首先要求 `nativeCheckoutAllowed()` 与 `billingConfigured()` 为真，否则故意以 503 拒绝用户付款，属于资金安全 fail-closed。

### 新站生产主机只读核验

通过已批准的 Z890 → `root@8.166.137.232` SSH，
于 2026-10-31（北京时间）进行以下**不涉及任何密码或密钥原值**的只读核查：

- `socthink-math.service` 活跃；自动部署 timer 活跃，运行最新不可变发布目录；
- PostgreSQL 16.15 正常监听，可由本机 `pg_isready` 验证；
- **`socthink_billing_prod` 不存在**、正式计费登录角色不存在；
- `/etc/socthink-math-billing.env` 不存在；
- `40-billing.conf` systemd 环境挂载配置不存在；
- 当前仅有微信**身份登录**环境，并无新站微信 Native 正式收款密钥配置；
- `ops/payment/provision_billing_postgres.py --check` 若在**旧代码树**
  `/opt/socthink-math` 执行显示 `TARGET_REPO=NO`，这是防旧目录写账本的有效保护；
  改从**运行中的不可变版本**
  `/opt/socthink-releases/current` 执行，所有前置检查均为 YES。
- 这证明脚本具备前置条件，但**不等于**已执行初始化。

**实际阻碍**：试图经远程执行通道运行正式 `--apply` 初始化时，
该工具的安全检查阻止了操作，**没有创建数据库、没有写密钥文件、
没有修改服务，也没有开启收款**。不得用更隐蔽的 shell、SSH 别名或
拆分命令绕过安全检查。

### 必须按顺序完成

1. 由具备正式生产变更授权的运维入口，在已验证的不可变发布目录
   完成独立 PostgreSQL 账本初始化、版本化 schema 001→008 的核验，
   不覆盖旧站数据库，并完成真实备份和隔离恢复证明。
2. 将旧站已核验的商户能力与新站经营场景、AppID、回调地址、
   当前有效 APIv3/微信支付公钥关联关系**通过受控密钥渠道**核对。
   不重置旧商户密钥、不直接把旧站用户权益移植成新站权益。
3. 先开启有恢复能力的**已验签回调与官方查单**服务，不开放收新订单；
   准备真实有授权、已交付、已定价且经过售后规则主动确认的 SKU。
4. 经真实商户官方受控验收：下单 → 扫码支付 → 微信签名回调 →
   主动官方查单 → 同一 PG 账本权益 → 受保护交付 → 对账、
   法定售后处理及确需退款时的官方最终退款状态。
5. 最后才开启 `SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED`，并在
   `https://socthink.cn` 取得新的公网原始回执。之前 503 是正确的拒绝行为。
6. 每次排障使用 `ops/payment/audit_checkout_readiness.py` 的只读
   readiness 输出（不暴露商户密钥或数据库连接串），替代盲目猜测开关。

## P1：为什么首页新了，其他页面还像旧网站

**源码核查**：首页、考试大全、资料中心主要使用
`--portal-navy/#10284b`、`--portal-blue/#1454a8`；
此前 `/membership` 独立 `#182b20` 深绿色，
`/login` 登录品牌面板为 `#15261e` 绿色，
`/account` 大量内联 CSS 并没有统一门户卡片与页面层级。
因此即使它们都运行同一个最新版 SHA，仍给用户以“不同网站/旧页面”的观感。

**已在本分支实施**：

- 购买与权益：与首页一致的蓝色主视觉、统一宽度/间距、清晰页内路径、
  真实考试/资料/计算/订单四个立即可用入口。未验收商品不造假价。
- 账号：统一蓝色首屏、订单状态和真实购买链接；
  清晰区分「数据库尚未启用」与「账本临时查询失败」。
- 微信登录：保留单微信无感/扫码机制，只替换旧绿色视觉，不再另建学生注册表。
- 顶部导航和页脚：可直达「购买与权益」，与主页的各个核心入口保持一致。
- 竞赛和数学训练：主要 hero/CTA 统一门户蓝色；不修改竞赛规则、评分引擎。
- 页面可访问性：竞赛 page 多个 `h1` 改为一个一级标题和分级标题；
  赛事管家无 `h1` 改为语义清晰的一级标题；
  资源、登录、售后、会员、账号等去掉与 RootLayout 重复的 `main` landmark。

**首次真实公网路由核查**（匿名、未读写账户）：

- 共 17 个路线：其余 16 个返回 200；`/arithmetic` 返回 307
  跳往 `/api/auth/guest/start?next=/arithmetic`，这是预期的一次游客
  身份 Cookie 引导，之后在独立 CookieJar 中实际访问该页得到 200，
  因此**不是死链/无限登录**。
- `/competitions` HTML 有多个一级标题；
  `/events` 缺少一级标题；
  包括 `/membership`、`/account`、`/login`、
  `/resources` 等页面存在嵌套两个 `main` 标记。
  这些问题均有可重复的代码检查和修正，不以手工视觉感觉代替回归。
- 对旧 `/parent`、`/parent/login`、`/parent/register`
  的 GET 实测最终落到 `/login`，符合单微信账号新模式。
- `scripts/audit_portal_live.py` 复用同一组公开 URL，
  检查标题、导航、唯一 H1、唯一主内容 landmark；对于
  游客初始化 307 不创建 Cookie、不会错误标记为线上死链。
  后续部署必须在生产版本 SHA 匹配后复查。

## 范围与验收边界

- 本次页面代码提交、CI、Production Receipt、公网 SHA 应分别验收，
  不把「本地 UI 改好」宣传成「已同步到生产」。
- 此分支不重写支付账本、不触及真实商户密钥、不借旧站 Python
  结算直接给新站用户发放权益。
- 现有数学训练与赛事题库、报告和历史成绩必须继续可用。
- 小程序有独立界面，需继续与统一 Web 产品目录和身份/订单合同对齐；
  本次网站视觉修复不等于小程序版本已经通过微信审核发布。

## P0：发现同机浏览器测试误连其他项目的端口

现场 Z890 有另一个项目 GlobalGameFoundry 的 Vite 开发服务监听
`127.0.0.1:4318`，且对未知路由 `/api/release` 使用 HTML SPA fallback
返回 HTTP 200。原有 `playwright.config.ts` 在本地设置
`reuseExistingServer:!process.env.CI`，仅凭这一 HTTP 200
就会错误复用别的项目进程。结果导致 **浏览器测试实际测试的是
游戏网站而不是 SOCTHINK**，属于测试隔离与服务身份验证缺陷。

本分支修复：
- 所有本地测试均禁止自动复用未验证的已有监听器；
- 自定义 `E2E_BASE_URL` 的端口解析用于启动 Next，绝不把
  开发者已有 4318 端口服务停掉/覆盖；
- Playwright 运行时先请求 `/api/release` 并核验
  `ok===true && service==="math-competition-lab"`，而非只核对 200。
- 用 **SOCTHINK 独立候选服务端口 4329**、真实本地 Chromium
  对桌面和手机重复执行统一导航、所有公开入口、H1/MAIN 唯一性、
  无横向溢出、数字售后、单微信登录旧地址等端到端检查；
  **6/6 测试成功**，且完成后停止测试服务器，不动其他项目。

当没有本地 Playwright 版本要求的浏览器二进制时，使用 Z890
已存在的同版本系独立 Chromium 可执行文件做候选验收；
GitHub Actions 仍由它的固定 `npx playwright install --with-deps chromium`
安装正式测试浏览器。
