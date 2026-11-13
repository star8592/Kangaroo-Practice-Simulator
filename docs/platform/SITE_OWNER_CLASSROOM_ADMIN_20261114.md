# SOC THINK 主站后台 · 站点所有者绑定与英语课堂教师管理

日期：2026-11-14。实现位于独立 main 基线开发分支，未声称已部署生产。

## 一个主站后台

沿用现有 /admin 经营驾驶舱与既有用户登录，新增 /admin/classroom「英语课堂与教师」入口。主站验证微信会话后经 /api/auth/parent/me 返回服务端计算的 siteAdmin 布尔值；此布尔值来自专属的所有者绑定记录，普通用户或浏览器自行输入的邮箱、角色、请求头均不授予权限。

## 首位站点所有者

首位认领要求同时持有：
- 原有 SOC THINK 管理员 PIN 会话（一次性确认有权管理该网站）；
- 当前主站已验证的真实微信登录会话（指向唯一 parent ID）；
- 自己填写的联系邮箱。

若生产邮件验证码服务已启用，首次认领还要求给邮箱发送一次性 6 位验证码（10 分钟有效）；若生产邮件验证码服务未启用，则允许原管理员凭据＋已验证微信直接一次性认领，邮箱只能作为未验证的联系信息，不能用于登录或恢复管理员权限。邮箱发信恢复后，站点所有者再使用邮件验证码验证已有联系邮箱。绑定记录使用独占文件创建、0600 权限；已有绑定不会被第二个账号覆盖，且不向匿名接口输出邮箱、微信 ID、管理员凭据。

## 教师与学生

主站后台 /admin/classroom 与口音教练后台 /english/pronunciation/app/teacher/admin 统一指向同一个 Rust 课堂审批服务，教师申请、管理员批准/撤销、建班、布置作业和收成绩沿用已有流程。Rust 仅通过固定 HTTPS 主站 /api/auth/parent/me 验证 HttpOnly 微信会话，并读取 siteAdmin 字段；它不是浏览器传入的任意角色或邮件字符串。首次绑定后不需要每次在 Linux 环境文件中手工增加一个教师 ID。

## 当前生产约束

2026-11-14 只读公网验证：
- /api/auth/parent/status 显示 registrationEnabled=false、emailProviderConfigured=false、wechatLoginConfigured=true。
- /admin 存在旧后台登录。
- /admin/classroom 和 /api/admin/site-owner/readiness 尚未部署，返回 404。
- /english/pronunciation/classroom-api/health 仍返回 404。

下一步需按主站既有发布程序部署并验证所有者绑定，再通过授权的运维渠道启用课堂 Rust 后端及 Nginx。已拒绝的系统级建号操作不得改用其他代理或凭据规避。业务管理员创建与服务器 OS 账号是不同权限边界。新功能不改变 PostgreSQL 版本、微信 OAuth、V50 发音评分服务，也不额外建设另一个独立运营后台。

## 验证

独立工作树的 TypeScript、ESLint、首次邮箱验证码绑定测试、未验证联系邮箱的本地状态测试均须通过。主站生产部署及真实微信管理员录入需要另行验收，不得把本地测试当作公网已开通。
