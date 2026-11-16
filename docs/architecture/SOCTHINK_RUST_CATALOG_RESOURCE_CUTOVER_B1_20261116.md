# SOC THINK Rust Catalog 接管资源页 /resources · B1（2026-11-16）

**状态：隔离候选已完成真实数据与浏览器验收；尚未切生产。**
上位架构见 `docs/architecture/SOCTHINK_NEXTJS_RUST_STRICT_BOUNDARY_ADR_20261116.md`。

## 1. 本次真正改了什么

- `src/app/resources/page.tsx` 不再导入 `listTrainingExamProfiles` 或 `buildTrainingResourceCatalog`，不在 Next.js 的请求处理过程中读取原始题库或重建业务目录。
- Next.js SSR 通过 `src/lib/rust-catalog-read.ts` 从 `127.0.0.1` 上的 Rust/Axum 查询**已通过准备就绪筛选的公开资源元数据**。服务端最多读取 5000 条、每次最多 100 条、检查页数/总数/ID唯一性、返回内容格式和题目启动路径，拒绝任意上游 URL。
- React `ResourceLibraryClient` 保留用户已熟悉的输入、筛选、18 条分页展示；它只改变当前屏幕显示，不承担原始题库、试卷准备就绪、真实权限和付费决定。
- Rust 无法访问时，SSR 展示明确“试卷目录暂时不可用”，**不会悄悄使用旧 TS 目录绕过 Rust**。当前容错呈现是 HTTP 200 的维护提示，生产是否改为 503/专用错误页面属于必须额外验证项，不能以 200 代表服务健康。
- 不增加任何 `src/app/api/**` 业务 Route Handler。已有 91 个 Next 旧 API、54 个含写方法文件的迁移清单继续严格执行。

## 2. 事实和局限

- `backend/socthink-core` 已有只读 `/v1/catalog/resources` Rust 处理器；本次直接复用，不并列开发另一套 Rust 服务。
- **当前资源元数据快照仍由原 TypeScript `listTrainingExamProfiles` + `buildTrainingResourceCatalog` 在离线发布阶段生成。** 也就是说，前端页面运行时已改用 Rust，但题库准备就绪规则仍需在 B2 进一步移入 Rust 或明确交给内容发布管线。这是本次的真实剩余工作，不能宣称已经100%消除 TypeScript 后端业务逻辑。
- 不动数学答题、登录、微信支付、发音/职业专项引擎和任何正式生产数据库。
- 当前 Next SSR 要求 `SOCTHINK_RUST_CATALOG_INTERNAL_URL=http://127.0.0.1:37871`；Rust 通过 `SOCTHINK_RUST_BIND=127.0.0.1:37871` 绑定。**两进程必须共享同一网络命名空间**；若 Next 部署在独立容器，严禁使用虚假的 `127.0.0.1` 连接另一个容器，必须先改经审核的受控内部互联与入站规则。绝不能暴露未授权的 Rust 测试端口。

## 3. 本地完整库存验收（Z890 隔离工作区）

从原工程已有私有 `private/exams` **只读导出元数据快照**到临时文件，不向公开目录提交题卷、答案或内部路径。隔离工作树对目录的临时符号链接导出后解除，避免 Turbopack 编译路径逃逸问题；原仓库私有资料无修改。

真实快照数据：
- 共 **450** 条元数据：**396 历年试卷、4 样题、19 练习卷、31 智能组卷**；
- 资源页以前就过滤掉 31 条 smart，故实际显示 **419**；
- Rust 现有查询器和 TypeScript 过滤参考实现 **79 组组合/分页结果完全一致**；
- Next Rust SSR 读取与快照中的非 smart 资源 **419 条完全一致**；
- 拒绝指向非 loopback 上游、对不可用 Rust 返回明确异常；
- Next 16 真实 build 通过；
- 本机 Rust+Next 同时启动后真实 Chrome：桌面 `/resources` 显示 419、首屏 18 个卡片且筛选 2026 有效；390px 手机显示 419、横向溢出为 0；
- Rust 进程停止后，网页改显示目录不可用，不返回旧试卷目录。

**以上仅为候选工作树和本机运行结果。生产服务是否启动、服务器隔离端口、对象存储刷新、全站 CI 和精确 SHA 尚需切换验收。**

## 4. 生产切换必须按最短路径处理

1. **确实可用的私有 Rust 目录服务**：在现有主站同一服务器/网络命名空间启动一个已验证 Rust 二进制，使用私有目录元数据快照，不允许公开端口；锁定版本/资源数/快照 SHA。
2. **快照发布闭环**：现有正式资料入库事务完成后才生成新快照，原子替换，通过 SIGHUP 刷新 Rust 内存索引；失败保留最后一份已知完整版本。当前测试只证明这套 Rust 热更新能力存在，不代表生产调度已接线。
3. **Next 候选切换**：部署时设置精确 `SOCTHINK_RUST_CATALOG_INTERNAL_URL`，确认 Next 与 Rust 真实内网连通，验证 `/resources` 显示 419 或与当前生产准备就绪快照一致的数量、筛选、手机和搜索。
4. **故障与回退**：Rust 停机时禁止展示过时数据/误售，提示准确；自动回退到此前经过验证的整套版本，并确认旧资源与评分入口正常。
5. **生产核验**：确认公网部署 SHA、Rust 版本、快照 SHA、机房访问日志，和保留的答题/评分/支付合同。回退后不得让两个不同数据权威同时写入。

当前新功能待合并阶段**不要直接让正常生产的 /resources 请求依赖未部署 Rust**，也不要为了允许不完整上线而在 Next 重新引入长期 TS fallback。

## 5. 实际复现命令（仅隔离开发环境）

```bash
# 在已经具备真实试卷库存的隔离开发机，先只读导出公开元数据：
npx tsx scripts/export_training_resource_catalog.ts > /tmp/soc-catalog.json

# 使用已有 Rust Core，在同一机器启动 loopback 服务：
cargo test --locked --manifest-path backend/socthink-core/Cargo.toml
cargo build --locked --manifest-path backend/socthink-core/Cargo.toml
SOCTHINK_CATALOG_SNAPSHOT=/tmp/soc-catalog.json \
SOCTHINK_RUST_BIND=127.0.0.1:37871 \
 backend/socthink-core/target/debug/socthink-catalog-api

# 在另一终端执行（仅本机已完成 Rust 服务时）：
SOCTHINK_CATALOG_SNAPSHOT=/tmp/soc-catalog.json \
SOCTHINK_RUST_CATALOG_INTERNAL_URL=http://127.0.0.1:37871 \
 npx tsx scripts/test_rust_catalog_ssr_parity.ts

SOCTHINK_CATALOG_SNAPSHOT=/tmp/soc-catalog.json \
SOCTHINK_RUST_CATALOG_TEST_URL=http://127.0.0.1:37871 \
 npx tsx scripts/test_rust_catalog_live_parity.ts

npm run test:rust-resource-boundary
```

## 6. 继续推进顺序

本次只迁**目录请求读取层**。下一阶段应完善 Rust 的内容发布/准备就绪判断和生产同机服务编排，然后迁考试会话/交卷/评分。正式唯一业务权威不可通过 React 内部评分/Next API 写回绕开。整个重构遵循“Rust 单体、主站统一认证/计费、学科适配引擎可独立”的长期原则。
