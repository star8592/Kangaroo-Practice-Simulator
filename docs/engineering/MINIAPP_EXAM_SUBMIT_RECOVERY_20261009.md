# 微信小程序竞赛交卷可靠性（2026-10-09）

## 问题与用户影响

`POST /api/grade` 在保存成绩后会更新 `exam-sessions.json` 的会话完成状态。手机若恰在这两次持久化之间掉线或服务端进程退出，就可能造成“成绩已写入，但小程序没有收到结果”。再发一次交卷原逻辑返回 409，客户端只弹 Toast，学生难以找回成绩/逐题复盘。若同时请求，则旧逻辑还有重复写入的风险。

## 工程实现

- `ExamAttemptRecord` 新增可选 `sessionId`，与已发布历史记录兼容；记录绑定学生、试卷与签名会话，不以试卷名猜测归属。
- `src/lib/exam-submit-recovery.ts` 对同一 `userId+examId+sessionId` 通过文件系统原子目录锁序列化评分提交。首次成功追加成绩并完成会话；重复请求按身份查回已保存的原成绩，不重复写入，也不根据新的答案重新评分。旧客户端同样受保护。
- 容错处理“尝试记录已写入，但完成会话标记缺失”：读取原始尝试记录并对照会话归属，修复标记后返回原成绩。10 分钟以上遗留锁可恢复，未过期锁阻止并发。
- `GET /api/exam-sessions/recovery?examId=...&sessionId=...` 只为**正式已登录考生**查询其拥有的会话，返回 `active / expired / completed`；匿名及签名 guest 一律 401，其他学生无法读取会话记录。
- 微信小程序读取本机临时答卷时先向服务器恢复旧成绩，避免立即创建新的考试。交卷丢失响应会二次查询已提交结果；成功才清理本机答卷，失败则保留答案并允许后续重试。同步 `useRef` 防止确认弹窗打开前的多次快速点击。
- `api.ts` 禁止恢复旧考试时通过 `401` 自动更换游客／微信身份导致草稿丢失；登录过期时要求显式恢复原账号。其他普通 GET 的容错逻辑保持不变。

## 可复核验收证据

- `npm run test:exam-submit-recovery`：使用系统临时目录中的模拟考生和试卷，执行真实 `POST /api/grade` 与 `GET /api/exam-sessions/recovery`，验证首次提交、重复提交回原收据、篡改答案不能更改成绩、不同学生 404、模拟写入后中断、并发锁、无生产数据读写。
- 更新部署前候选及部署后定时权限巡检：匿名、Web guest、Miniapp guest 各 6 项拒绝权限（含新恢复 API）。
- 桌面及手机视口 Web Playwright E2E 在登录→答题→提交后再次请求恢复接口及重复评分，确认相同 attemptId。
- `npm run verify:public` 与 `npm run verify:miniapp`，以及四项 GitHub required CI，不得省略。

## 仍然受阻的设备级验收

微信官方开发工具及实机 G3/G4 仍没有 PASS 证据：Linux 工作站没有 Windows/macOS 微信 IDE；USB 三星 S8 当前前台为闲鱼，不能在未协调的情况下打断其既有会话。新改动允许通过 miniprogram-ci 生成体验码做测试，但正式上传仍受 `MINIAPP_QA_RECEIPT` 门禁保护。体验码不等于已发布。

## 边界

基于文件目录锁的幂等性只对**共享同一存储**的应用进程有效。若将考试数据迁往三个独立物理节点，应在数据库层使用 `UNIQUE(user_id,exam_id,session_id)` 和事务性提交与结果回读，而不能依赖单机文件锁宣称跨节点 Exactly Once。
