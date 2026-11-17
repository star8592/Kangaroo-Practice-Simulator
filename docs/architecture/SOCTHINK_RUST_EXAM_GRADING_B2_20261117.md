# B2.0｜考试确定性评分迁入 Rust（2026-11-17）

**状态：Rust 评分算法已完成离线一致性验收；HTTP 交卷、考试会话、账户权限和成绩写入尚未切换。**

上位规则见 `SOCTHINK_NEXTJS_RUST_STRICT_BOUNDARY_ADR_20261116.md`。本分支从 `main` 独立切出，不依赖 B1 的资源页部署，避免互相覆盖。

## 1. 实现边界

- 新增 Rust `backend/socthink-core/src/grading.rs`，纯函数 `grade(&Request)`；不持有 Session、用户身份、数据库连接、文件写入或网络监听。
- 新增 **仅用于本地/CI 对照的** `grade-fixture` 命令行工具，从 stdin 接收含正确答案的受控 fixture，从 stdout 输出 GradeResult。**严禁把这个工具部署到公网、在客户端执行或直接开放 HTTP 评分接口。**
- 原 Next.js `/api/grade` 与 `/api/exam-sessions` 暂时保持生产权威，不引入第二套真实成绩写入，因此不会双主、双计费。
- 兼容 TS `gradeExam` 的固定错题扣分、按分值比例扣分、空题奖励上限、0–999 整数前导零、显式空字符串、双语标准原题概念、SEAMO 例外、AMC/AIME 题号区间、英文/中文解析和 JS `Math.round` 的两位小数规则。

## 2. 实测证据

- XPS 之外的 Z890 直接执行 Rust cargo test：当前 crate **7 个单元测试通过**，其中两项是评分专门测试。
- 合成试卷：**120 组考试配置、2,029 道题**，Rust 与原 TypeScript GradeResult 完全逐字段一致。
- 真实题库只在 Z890 私有工作目录只读使用：**419 套真实已通过训练就绪门槛的试卷，每套五种答题模式，共 2,095 次完整评分、54,465 道题评分结果**全部一致。
- 真实题目答案和解析仅经本地 stdin pipe 传递给离线 Rust fixture 子进程；测试日志只输出案例数量，不把私有试卷、答案或用户数据加入仓库和远程 CI。
- Rust 格式化由 XPS 隔离环境处理，随后返回 Z890 重新执行所有目标测试。

## 3. 尚未完成的 B2.1–B2.3

1. Rust 唯一账号/微信会话、正式考生权限和 ItemEntitlement，在服务端判断；不能让浏览器传入 userId 和购买状态。
2. Rust/PostgreSQL（与其他项目共用 PG18 软件服务、模块 schema 隔离）管理考试计时、章节保存/锁定及会话过期。每个 `sessionId` 必须绑定 `userId` 与 `examId`，跨班级和跨组织数据禁止互访。
3. Rust 用同一个数据库事务完成：`session FOR UPDATE` → 合规试题快照 → 锁定答案 → `grade()` → 唯一 session 交卷记录 → 结算使用量 → 置完成。连接中断时按 sessionId 读取已有 attempt，而不是再算出第二份结果。
4. 只在 Rust API 的认证/计费/数据所有权和实际同源端到端检查完成后，原 URI 一次切换并移除 Next 的旧写路由；期间不得双写。
5. 将全站教师作业、学生考试和学校机构报告绑定同一 `Assignment / Attempt` 模型，避免各学科复制评分与计费。

**当前 Rust 核心和 Next 网页的技术边界没有被进一步混淆；这轮做的是可验证的评分核心迁移，不谎称已完成全站 Rust 后端。**
