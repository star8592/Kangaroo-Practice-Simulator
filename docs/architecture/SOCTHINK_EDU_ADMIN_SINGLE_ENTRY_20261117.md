# SOC THINK 教务入口与权限边界统一说明（2026-11-17）

## 唯一入口

| 目的 | 路径 | 功能 |
|---|---|---|
| 平台经营与用户 | /admin | 平台管理员专属 |
| 全站用户列表 | /admin/users | 真实微信账号、分页、昵称状态、登录时间、账号 ID |
| 模块入口权限 | /admin/platform-authorizations | PostgreSQL platform.role_grants；只控制模块可见性 |
| 英语教务管理 | /admin/classroom | PostgreSQL accent.teacher_access_requests；实际任课资格 |
| 教师自己的班级和作业 | /english/pronunciation/app/teacher/homework | 自己的班级、学生、作业和成绩 |
| 我的模块工作台 | /workspace | 展示平台授权模块，不取代班级授权 |
| 教师与机构公共介绍 | /teach | 介绍页，不是管理后台 |

旧的发音模块 /english/pronunciation/app/teacher/admin 必须只跳转 /admin/classroom，不再有重复的授权写入表单。旧汇总入口 /english/teacher 重定向到 /workspace，不重建第二套权限库。

## 权限规则

1. 站点所有者由统一微信会话 + 私有 owner binding 确认，不需要再填写老师姓名、申请教师资格。
2. 平台模块入口（platform.role_grants）仅决定 /workspace 看得到哪个模块；不能凭此读取任何学生录音和班级数据。
3. 英语实际任课资格（accent.teacher_access_requests）决定是否能建班授课；班级与学生仍由 accent.memberships / classes / enrollments 和 PostgreSQL RLS 隔离。
4. 站点管理员豁免重复教师审批，但不自动获得其他教师班级的数据访问权。
5. 不做不可靠的跨库双写。未来如果两个权限系统联动，必须有可恢复补偿、事务边界和审计回执。

## 开通真实英语任课的操作路径

1. 从 /admin/users 按微信主站账号（而不是按昵称）选择老师。
2. 点击「英语课堂任课」，打开 /admin/classroom?subject=par_...。
3. 后端验证管理员，按完整账号 ID 精确选择真实、活跃、已绑定微信的用户，只回传课堂 UUID、名称及状态，不回传微信 OpenID。
4. 管理员核对账号尾号后，明确确认授予或撤销实际任课资格。
5. 老师进入本人班级工作台；如需从 /workspace 显示模块，再单独配置相应模块入口权限。不要把“可见”误当成“已开通任课”。

## 登录与回退

未登录进入 /admin、/admin/users、/admin/classroom：进入统一微信登录 /login?next=...，完成后返回原页。已登录的非管理员返回自己的 /workspace，不进入旧密码登录循环。原来的 /admin/login 保留供有权限的旧系统救援会话使用，不是正常微信用户的默认入口。

所有用户、教师、班级、录音、成绩与支付业务数据保持原状。旧页面下线只删除重复前端授权操作，不删除数据表或历史审计。

## 验收界限

- 主站账号精确匹配、拒绝非法编号、普通教师无权调用管理员接口；
- 页面登录目标、导流与双授权名称合同测试；
- AccentLab 旧教师管理员地址跳转主站，零后台写入；四种视口响应式测试；
- 线上健康、匿名 401、重定向、发布 SHA 校验；
- 真实用户会话的管理员登录、教师授权与班级操作仍需要有权测试会话验收，不能用 HTTP 200 冒充真实用户全链路通过。
