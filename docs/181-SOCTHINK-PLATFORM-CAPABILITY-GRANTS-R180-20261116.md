# SOC THINK · R180 平台授权中心（第一阶段）

目标：一个微信平台账号，管理员可授权多个模块，用户仅看到已有有效
授权的管理模块。数学与英语都是平台下的产品，不再创建“英语管理员”
和“数学管理员”两套独立登录系统。

## 实现

主站代码新增:
- /workspace：用户微信登录后的个人管理工作台，仅查询自己的活跃授权
- /admin/platform-authorizations：站点 Owner 授权与撤权界面；普通账号
  不可访问
- GET /api/platform/workspace：服务端按主站会话查询授权模块，拒绝未登录
- GET /api/platform/admin/accounts：Owner 查找已绑定微信的现有用户
- GET/POST /api/platform/admin/grants：Owner 操作角色授权；严格 Origin
  检查，主体必须是活跃、已绑定微信的平台注册用户；授予与撤销可审计，
  幂等，整个操作在单个 PG18 事务中完成
- POST /api/platform/authorization/verify：产品服务器专用能力核验，
  需要产品独有的密钥和当前浏览器主站微信会话，不泄露原用户 ID。
  为词语星球提供可选统一模块授权验证能力。

唯一管理能力列表：src/lib/platform-capabilities.ts，衍生自英语四产品
注册表，并包含未来数学能力。只有发音和单词现有教学后台被标记为
implemented；阅读、AelOS、数学未来适配器就绪前不会出现虚假管理入口。

## PostgreSQL 18

迁移文件 ops/db/013_platform_capability_grants.sql。
一个 PostgreSQL 18 实例中创建独立 socthink_platform 数据库与受限
应用角色。平台主体继续引用原平台注册用户编号（par_...），不复制
既有家长、老师和学生历史数据。只使用 platform.role_grants 和
platform.role_grant_audit 两张新表。

服务端独立连接变量 SOCTHINK_PLATFORM_DATABASE_URL 仅可在系统服务端
配置。不能使用 postgres 超级用户连接、不能将密钥或连接信息传到浏览器。
应用账号只拥有数据库连接权限、两张表的必要 DML 权限及序列 USAGE，
不拥有 CREATE/ALTER/DROP 权限。
数据表缺失、数据库宕机、用户授权缺失：全部拒绝访问，不会返回所有模块。

平台授权仅决定是否允许管理模块入口，不替代 AccentLab 与词语星球已有
任课、组织与班级服务端核验。机构级 scope 已在表结构预留，但尚未在
产品侧绑定机构 ID，API 暂时拒绝组织级授权，不可误报已接通。

## 并行适配路线

1. 主站 R180：用户与管理员工作台、模块授权、审计和服务端验证接口。
2. 词语星球独立适配分支：可通过默认关闭的
   VOCAB_PLATFORM_MODULE_GRANTS_REQUIRED 标志强制平台模块验证；
   有效授权和产品任课资格必须同时满足。迁移完成前不能开启。
3. 发音：已有原教师任课审批，下一步由平台授予模块权限后建立与
   AccentLab 原教师记录的受控映射，不能仅凭显示模块自动发放班级。
4. 数学/阅读：待实际教师模块实现后才允许平台开放对应管理能力。

## 验收与切换

- 本地隔离 PostgreSQL18：授权、重复授权幂等、撤权、完整审计、
  非管理员拒绝、跨站 POST 拒绝、未配置拒绝、后端密钥校验
- Desktop/Mobile Chromium：主站登录、管理后台未授权拒绝、原四英语
  课程入口和原教师微信回跳不受影响
- 实际微信老师/学生首次绑定、退出切换、旧成绩保留仍须真实 E3，
  不能用合成 OAuth 代替
- 生产上线先建立空的授权数据库，再发布只读安全工作台及管理员接口；
  未明确授予任何账号时不会自动出现管理模块
- 后续导入真实已核实的教师资格（逐个有证据地授权），不按昵称批量
  发放、不自作主张把所有旧管理员变为平台管理员
- 回退：停用主站新版本、恢复旧部署；平台数据库可原样保留，不删除
  任何学生、课堂或历史记录

本轮不会改动词语星球 R177 的旧登录方式或已有成绩数据；
新平台授权和真实任课权限是两个独立条件。

## R180 发布前强制只读权限检查（新增）

运行 npx tsx scripts/check_platform_db_preflight.mts。该脚本从
SOCTHINK_PLATFORM_DATABASE_URL 读取已有服务端配置，不生成和打印密码。
验证 PG18、platform 两张表、必要的 SELECT/INSERT/UPDATE 权限，
拒绝 superuser、BYPASSRLS、CREATEDB/CREATEROLE、数据库 CREATE、
schema CREATE 和业务表所有者登录。

只有输出 PLATFORM_PREFLIGHT=PASS 才可以把平台授权服务加入
正式发布候选。缺少连接配置时输出 DATABASE_URL_NOT_CONFIGURED；
使用数据库超级用户时输出 UNSAFE_DATABASE_ROLE_OR_SCHEMA。
在 Z890 隔离 PG18.6 中已验证三种状态：
1. 缺少连接配置：拒绝；
2. 受限授权应用账号：通过（初始授权记录 0）；
3. postgres 管理角色：拒绝。
此步骤是只读校验，不负责创建生产应用角色，也不会绕过现场操作的
管理授权或安全检查。

## 最小权限 SQL（已版本化）

- ops/db/013_platform_capability_grants.sql：仅创建 schema 与两张新表。
- ops/db/014_platform_app_privileges.sql：在生产维护方建立专用登录角色后，
  由数据库所有者执行。只授予两张业务表必要 DML 权限以及 sequence 使用权。
  该文件既不创建密码，也不变更其他系统的账户。
- 两份 SQL 均不改变已有 parent / AccentLab / Vocabulary / billing 表。
- 正式发布必须用 check_platform_db_preflight.mts 验证应用实际身份，
  严禁用 postgres 用户连接生产 Web 进程。

## R180 登录后的真实页面隔离回归

新增 tests/e2e/platform-authorizations.spec.ts 中的可选 PG18 隔离案例。
默认 CI 不准备真实数据库时安全跳过，只有管理员在本地隔离实例明确
设置 PLATFORM_E2E_FIXTURE=1 并提供隔离
SOCTHINK_PLATFORM_DATABASE_URL / SOCTHINK_USER_DATA_DIR 才运行。

同一主站、同一授权数据库、两个不同有效微信模拟会话：
- 账号 A 授予 english.pronunciation，工作台只显示发音管理；
- 账号 B 授予 english.vocabulary，工作台只显示单词管理；
- 撤销 A 后刷新，发音模块立即消失，B 仍只有单词模块；
- 桌面 Chromium 和手机 Chromium 各通过一次，均无真实微信凭据、
  生产数据库、真实儿童账号或课程历史参与。

## R180 平台工作台微信登录上下文

正式管理入口 /workspace 和站点 Owner 的
/admin/platform-authorizations 必须沿用主站统一 OAuth，而不能另外维护
英语、数学或“老师专用”微信账户。前者在登录页明确说明仅显示已授权模块，
后者说明只有网站所有者才能授予或撤销权限；绝不能让管理工作台出现
“购买后使用考试资料”的推广文案。

微信内两条管理路径使用经过授权的 snsapi_userinfo 身份核实流程，
按已有 UnionID 合并控制规则复用主站账号，不自行创建教师角色；
普通学生和普通浏览课程仍保持 snsapi_base 静默登录。
OAuth 状态仍使用原签名和一次性校验，回调路径严格回到发起页面。
本地合成回调与桌面/手机浏览器共 18 个登录相关用例通过；
真实微信 E3 不因合成通过而自动标记完成。


## 同一教师新增第二模块的页面验证（2026-11-16）

已将一个教师从仅发音模块开始，随后增加单词模块、撤销单词模块、
最后撤销发音模块，均在同一签名模拟微信会话中刷新工作台即可即时生效。
另外一个仅获单词授权的教师账户始终未受影响；两个端的 Chromium
页面测试 2/2 通过，数据库为独立 PostgreSQL18 临时实例。

平台授权只控制“管理哪些模块”；产品内部具体班级权限依然在各自
模块核验，不因为管理菜单出现而自动授予真实学生数据读取能力。

## R180 独立数据库运维安装器（待获批准的生产操作）

已新增 ops/release/install_platform_authorization_runtime.py。
它不是应用启动过程的一部分，不会以 Web 请求触发；只允许
授权的服务器运维人员在核对数据库状态之后单独执行。

- --plan：只读报告专用平台数据库、应用角色、服务端配置文件、
  systemd drop-in 是否存在，不输出凭据。
- --apply：要求获得正式 root 操作权限，先验证 PG18 平台库和
  role_grants / role_grant_audit 均为初始空库，再备份并校验归档；
  创建仅有平台授权两张表所需 DML 权限的 socthink_platform_app，
  随机生成一次性 PostgreSQL 密码，经标准输入提交而不出现在进程参数；
  验证真正的非超级用户 DB 连接后，写入 0600 的服务器环境文件，
  加装单独的 systemd drop-in，最后 daemon-reload。
- 安装器不会重新启动主站，不会自动切换生产版本，不会赋予任何教师
  发音或单词模块权限，不会修改学生、成绩、家长或旧课堂数据。
- 如果检测到部分安装或已有环境文件，会拒绝覆盖并要求人工审计。
  已创建的角色也不会在故障处理时被盲目删除。
- 安装器需完整代码审查及无提权的 GitHub 模拟测试通过后才进入
  正式发布候选；当前远程运维通道限制尚未解除，因此本轮不执行
  生产 --apply。
- 运行生产版 R180 前仍必须完成 scripts/check_platform_db_preflight.mts
  的真实受限角色连通性验证，并在既有原子发布系统中有正常回退证据。

## 自动发布器保持最小切换保护

既有主站 auto_deploy_server.sh 仍只需要一次 GitHub CI 成功与原有
原子切换、失败回滚流程；不增加额外用户审批，不影响旧版部署。
对于**包含平台授权中心的新提交**，仅额外要求服务器已有专用
/etc/socthink-math-platform.env 以及独立 systemd 连接配置
72-platform-auth.conf。若文件缺失，输出
AUTO_DEPLOY=SKIP reason=platform_auth_database_not_ready，
不会下载编译、更换生产版本或关闭旧服务。

这是防止未来 PR 意外合并后自动部署了不能使用的工作台的最小保护，
不等于数据库内容、真实微信首次绑定或后端任课授权已经验证。
主站 ops/release/test_auto_deploy_contract.sh 原有部署合同回归通过。

## R180 整合重构：一个产品注册表、一个教师入口

英语产品清单 `src/lib/english-products.ts` 现在是服务导航及内部
教师管理路由的唯一注册来源。`platform-capabilities.ts` 从产品清单
直接衍生模块管理地址和是否具备管理能力，不再单独硬编码发音与
单词管理网址，也不把未开通的数学、阅读、AelOS 伪装成可管理模块。

公共 `/api/english/catalog` 只发布产品状态与公开路径；不发布内部
管理路由，也不把路由信息当成授权。教师班级读取必须在各自业务
服务器经由原有身份、任课、机构和班级鉴权才可成功。

英语首页的「我是老师」统一链接 `/workspace`，不再强制跳到发音
教师工作台。微信进入平台工作台后根据当前已激活模块授权显示
发音、单词等管理卡片；没有获授权的教师不会看到其他业务干扰。
主站正式构建、TypeScript、ESLint 和产品清单契约测试通过。
