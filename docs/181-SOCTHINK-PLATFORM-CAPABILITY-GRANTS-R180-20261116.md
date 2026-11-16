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
