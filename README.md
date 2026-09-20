# Math Competition Lab · 国际数学竞赛训练中心

本地优先的数学竞赛训练、仿真考试与学生学习画像系统。目前正式支持 **袋鼠数学（Math Kangaroo）**、**澳洲 AMC（Australian Mathematics Competition / AMT）** 与 **美国 AMC（MAA American Mathematics Competitions）**。不同竞赛、赛区、年级和样题使用独立赛制模板，题量、时间、计分、答题方式和智能组卷不会跨模板混用。

当前主线包括：**账号体系 + 服务器考试会话 + 竞赛赛制模板 + 真题/官方样题 + 模板内智能组卷 + 正式考试行为记录 + 口算/巧算诊断 + 个性化学习画像 + 教师管理台**。

## 本地启动

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

正式服务由用户级 systemd 单元 `math-competition-lab.service` 守护，网关容器名为 `math-competition-gateway`。应用监听 `3027`，局域网统一入口为 `http://10.10.10.42`。

规范工程入口为 `/mnt/disk1/Code/Math-Competition-Lab`；它兼容指向原有物理目录，因此旧脚本仍可继续使用历史路径而不会中断。运行时工程名、包名、服务名与网关名均统一为 Math Competition Lab。

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
当前 smoke 会同时验证账号/权限与竞赛模板：AMC Pre-A 官方样题为 25 题 / 100 分、1–20 选择题 + 21–25 整数填答、官方未注明限时因此以不限时样题模式运行；AMC Middle Primary 为 30 题 / 135 分 / 60 分钟正式赛制。测试还覆盖答案不泄露、满分/空白评分、考试记录进入学习画像、登录限流和会话撤销。

## 竞赛与赛制模板

系统不再用“国家/地区”字段猜测考试规则。每套学生可用试卷都会归入明确的 `competitionId`、`formatId` 和 `paperType`。

- **袋鼠数学**：按赛区 + 具体年级保留原卷规则。例如奥地利 3–4 年级为 24 题 / 60 分钟，而德国 3–4 年级为 24 题 / 75 分钟；智能组卷只在相同赛区、年级、题量、时长与计分规则中进行。
- **澳洲 AMC 正式赛制**：Middle Primary / Upper Primary 为 60 分钟；Junior / Intermediate / Senior 为 75 分钟。正式卷均为 30 题、135 分，前 25 题选择，后 5 题为 0–999 整数填答，答错不倒扣。
- **AMC Pre-A 官方样题**：来自本地官方提供的 `AMC-Pre A样题.zip`，共两套。每套 25 题、100 分；1–20 为选择题，21–25 为整数填答。源文件没有声明正式限时，因此网站明确显示为“不限时样题模式”，不会伪造官方时间。
- **智能组卷**：继承对应 `formatId` 的题量、分值分布、时间和扣分规则；不会跨竞赛或跨赛制混题。

- **美国 MAA AMC**：独立使用 `maa-amc`，与澳洲 `australian-amc` 完全隔离。AMC 8 为 25 题 / 40 分钟 / 每题 1 分；AMC 10/12 为 25 题 / 75 分钟 / 答对 6 分、空题 1.5 分、答错 0 分；AIME 使用整数填答赛制。当前已接入 MAA 官方公开的 2023 AMC 8 与 2022 AMC 10A Sample Competition，后续历史卷仅从官方公开、授权或用户自有资料导入。

旧的 `private/question-bank.json` 与 `scripts/import_level_a.py` 仅作为历史兼容数据保留，不再出现在学生端；旧 `/level-a` 入口兼容映射到 AMC Pre-A 官方样题 1。

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

- `private/exams/*.json`：正式竞赛真题、官方样题与赛制化试卷
- `private/question-bank.json`：旧版兼容题库（不再作为学生端正式分类来源）
- `private/users/users.json`：用户资料与 PIN 哈希
- `private/users/exam-attempts.jsonl`：正式考试与逐题行为
- `private/users/exam-sessions.json`：服务器考试会话
- `private/arithmetic/sessions.jsonl`：口算/巧算训练行为

安全措施包括 scrypt PIN 哈希、HttpOnly + SameSite=Strict 签名会话 Cookie、登录失败限流、账号停用/PIN 重置后的会话版本撤销，以及学生/管理员 API 权限隔离。

## 主要入口

- `/`：按竞赛 → 年级 → 赛制浏览真题、官方样题与模板内智能组卷
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

## 生产发布与运维

生产站点为 **https://socthink.cn**。正式发布统一使用 GitHub main 作为唯一代码源，并通过本地测试节点执行验证后，再免密 SSH 发布到生产服务器。

完整 SOP、生产目录、systemd/Nginx 架构、数据保护、版本识别、自动回滚、故障排查及验收标准见：

- **ops/release/SOCTHINK_DEPLOYMENT.md**
- 正式发布脚本：**ops/release/publish_socthink.sh**
- 公网版本身份接口：**https://socthink.cn/api/release**

发布是否完成，以公网接口返回的 deployedSha 与 GitHub origin/main 完全一致为最终标准。
