# Kangaroo Practice Simulator

本地优先的数学竞赛训练、仿真考试与学生学习画像系统。当前主线已经从单纯“做卷 + 看分数”升级为：**账号体系 + 服务器考试会话 + 正式考试行为记录 + 口算/巧算诊断 + 个性化学习画像 + 教师管理台**。

## 本地启动

```bash
npm install
npm run dev
```

生产模式：

```bash
npm run build
npm start -- --port 3027
```

默认生产入口：`http://127.0.0.1:3027`。

## 首次创建管理员

正式用户库不会自动生成管理员密码。首次使用教师端前，由服务器拥有者显式创建管理员：

```bash
npm run admin:create -- \
  --username teacher \
  --name "数学老师" \
  --pin "<至少6位的管理员PIN>"
```

管理员登录后可以进入 `/admin/students` 创建学生、编辑姓名/年级/学校、重置 PIN、启用/停用账号，并查看每个学生的详细学习画像；题库审核入口为 `/admin/questions`。

## 自动回归

服务启动后执行：

```bash
npm run test:smoke -- --base http://127.0.0.1:3027
```
当前 smoke 会验证：匿名题目 API 被拒绝、学生端不泄露正确答案、学生不能访问管理员 API、24 题 3/4/5 分分布正确、服务器计时、满分/空白评分、考试记录进入学习画像、登录错误次数限流，以及 PIN 重置后的旧会话立即失效。

## 学生数据模型

正式考试记录不仅保存答案，还记录每题进入/离开、首次作答、修改答案、标记、切出页面与有效停留时间。离开页面的时长会从做题时间中扣除。

学习画像目前综合：

- 正确率、空题率、3/4/5 分题转化
- 典型单题用时、快速失分、卡题与跳题信号
- 改答案净收益（错→对 / 对→错）
- 前 / 中 / 后程稳定性与近期完整卷趋势
- 口算的准确性、流畅度、稳定性、策略效率
- 巧算能力树、策略节点与成对诊断探针
- 数据置信度、下一阶段训练顺序、下一套真题建议

样本不足时系统不会把一次失误直接解释成稳定弱项；综合训练指数只在达到最低数据量后出现，且不作为竞赛成绩预测。

## 本地数据与安全

GitHub 不保存正式题库、账号、PIN、考试记录或学生行为数据。主要本地数据位于：

- `private/question-bank.json`：本地题库
- `private/users/users.json`：用户资料与 PIN 哈希
- `private/users/exam-attempts.jsonl`：正式考试与逐题行为
- `private/users/exam-sessions.json`：服务器考试会话
- `private/arithmetic/sessions.jsonl`：口算/巧算训练行为

安全措施包括 scrypt PIN 哈希、HttpOnly + SameSite=Strict 签名会话 Cookie、登录失败限流、账号停用/PIN 重置后的会话版本撤销，以及学生/管理员 API 权限隔离。

## 主要入口

- `/`：真题与智能混合模考
- `/arithmetic`：口算诊断与自适应训练
- `/student`：学生个人学习报告
- `/review`：错题复盘
- `/admin/students`：教师学生管理中心
- `/admin/students/[id]`：单个学生教师视角画像
- `/admin/questions`：题库审核

## 下一阶段

1. 教师操作审计日志与数据导出/备份
2. 家长只读角色与班级/分组管理
3. SQLite/PostgreSQL 迁移，替代 JSON/JSONL 的单机存储
4. 更细的知识点标签与错因人工反馈闭环
5. 用长期纵向数据驱动自适应组卷，而不是只依赖最近一次成绩
