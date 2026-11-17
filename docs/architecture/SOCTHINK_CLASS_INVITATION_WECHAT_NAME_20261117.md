# SOC THINK｜微信显示名必填、班级专属邀请与师生关系（2026-11-17）

## 问题与边界
生产事实：已验证微信账户为 4 个，其中有 2 个显示名称仍为“微信用户”；平台已生效的 english.pronunciation 授权为 1 名教师，旧课堂批准记录指向同一账号；生产 accent_lab 原有 0 个班级、0 个入班请求。没有代用户填写平台昵称、没有改写真实微信标识。

## 决策
- 同一平台账号（par_...）保持不变；UnionID/OpenID 仅用作登录身份识别，任何昵称都不充当主键。
- 手机微信登录默认申请 snsapi_userinfo；授权未完成可主动选择基础登录后**手动填写**平台名称，不宣称能强取用户私有微信昵称。
- 真实微信信息缺失时，不允许新建教师班级、申请加入班级；/account/profile 保存 2–30 字平台显示名。任何已填名称保留，后续基础微信登录不会清空。
- 一个教师可以建多个班级；每班独立邀请 HMAC 校验码，可轮换、停用；有效码不直接授权读取学生名单/成绩。
- 学生用现有微信身份扫码，确认教师和班级、填写可识别的学生姓名与年级；老师单独审核后建立 class_enrollments 关系。
- 重复扫码幂等，旧码失效，退出班级只移除授权关系、不删除学习记录。全程复用已有 PG18 accent 表和 FORCE RLS / Next.js 统一课堂服务；无额外登录或 HTTP 进程。
- 个人“我的班级”目录通过额外的自我可见 RLS SELECT 策略跨教师空间读取**本人**的班级名、教师显示名；不允许搜索其他学生的班级。

## 新端点及页面
- 微信授权 /api/auth/parent/wechat/start，默认 userinfo + 显式 profile=0 回退；
- /api/auth/parent/profile POST：本人唯一的名称修改接口；
- /account/profile；
- GET/POST /english/pronunciation/classroom-api/tenants/:tenant/classes/:class/invitation[/rotate|/disable]；
- GET/POST /english/pronunciation/classroom-api/class-join/:tenant/:class/:token；
- GET /english/pronunciation/classroom-api/student/classes；
- 教师 /english/pronunciation/classrooms；学生扫码 /english/pronunciation/join/:tenant/:class/:token；学生自助 /english/pronunciation/my-classes。

## 数据库变更
ops/db/20261117_accent_independent_class_invitations.sql：新增 accent.class_invitations；class_join_requests.assignment_id 放宽允许 NULL（兼容原作业邀请）；新增受限 RLS 策略仅允许学生看到自己的班级和班主任名称，任何数据写入仍走既有租户隔离及教师授权。不得在未完成部署前使用新前端入口。

## 测试
- scripts/test_wechat_required_display_name_20261117.mts：微信身份自有名称写入、CSRF、无授权/非法名称拒绝；
- scripts/test_wechat_mobile_oauth_state_identity_20261115.mts：跨端 UnionID、OAuth 返回、昵称优先、基础登录回退；
- scripts/test_class_invite_required_name_e2e.ts：一次性隔离 PG18、受限角色与 FORCE RLS、模拟 1 名老师和 6 名学生；验证班级邀请生命周期、没有名字拒绝、待审核和批准、删除后不可读、个人班级查询、既有五名学生真评分器和录音/反馈保护。
- 仍需实机：Candy 本人微信授权、第二名真实微信学生扫码、微信内分享与回到工作台的 E3。

## 生产回滚
只走既有主站原子发布/自动回退；先备份数据库 schema 和现有部署 SHA，再执行**加法及向后兼容**的 SQL，部署后核对 /api/release SHA 与课堂 health、匿名 /me 401、受保护加入接口 401、真实微信登录。若新前端异常回退旧 SHA，保留兼容的 schema，不能删除已经创建的师生关系与录音。
