# SOC THINK Rust Catalog 接管资源页 /resources · B1（2026-11-16）

**状态：隔离候选已完成真实数据与浏览器验收；尚未切生产。**
上位架构见 `docs/architecture/SOCTHINK_NEXTJS_RUST_STRICT_BOUNDARY_ADR_20261116.md`。

## 1. 本次真正改了什么

- `src/app/resources/page.tsx` 不再导入 `listTrainingExamProfiles` 或 `buildTrainingResourceCatalog`，不在 Next.js 的请求处理过程中读取原始题库或重建业务目录。
- Next.js SSR 通过 `src/lib/rust-catalog-read.ts` 从 `127.0.0.1` 上的 Rust/Axum 查询**已通过准备就绪筛选的公开资源元数据**。服务端最多读取 5000 条、每次最多 100 条、检查页数/总数/ID唯一性、返回内容格式和题目启动路径，拒绝任意上游 URL。
- React `ResourceLibraryClient` 保留用户已熟悉的输入、筛选、18 条分页展示；它只改变当前屏幕显示，不承担原始题库、试卷准备就绪、真实权限和付费决定。
- Rust 无法访问时，SSR 展示明确“试卷目录暂时不可用”，**不会悄悄使用旧 TS 目录绕过 Rust**。本机 Next 16 Production 构建实测：Rust 停机后 SSR 返回 **HTTP 500**（不再伪装成健康 200）；真实 Chrome 完成客户端 hydration 后展示“试卷目录暂时不可用”并提供重试/返回入口。不把 500 当正常健康；后续生产前可再验收是否需要由网关返回语义更准确的 503。
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
- Rust 进程停止后，资源页真实返回 HTTP 500，Chrome 显示可读维护提示，不返回旧试卷目录。

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

## 8. 正式服务器 B1 独立只读部署实证（2026-11-17）

- XPS 使用 glibc 2.39 隔离容器编译 Rust Release；Z890 对最终二进制验证：x86-64 ELF、最高 GLIBC 2.34（不超过正式服务器 GLIBC 2.39），SHA256 为
  `85816a9891dd68026d8c6699f79fa3f707d11481ee94ed57e6f8dee09a51c680`。
- 上述程序已部署在 `socthink.cn` 生产主机的 `/opt/socthink-catalog/current/`，以独立 `socthink-catalog.service` 和最小权限 `socthink-catalog` 系统用户运行，只监听 `127.0.0.1:37871`。
- 当前生产内容工具只读生成的资源元数据是 450 条（可展示 419）；Rust 实际运行服务返回的 5 页资源数据与当前正式内容目录**逐条一致**，没有公开题目答案、私有文件路径或交易数据。
- 原 `socthink-math.service` 仍为 active，原 Next.js 内网监听 `127.0.0.1:3000`；现有公网 `https://socthink.cn/resources` 保持 HTTP 200，**尚未将 Next 页面切换到 Rust**。
- 运行中 Rust 的状态端点返回真实 `generatedAt/rows`，供下次内容发布时执行精确的内存代际对账。
- **生产脚本必须确保身份权限**：自动发布器以 root 执行，而 Rust 以专用用户运行；原子替换快照文件后必须恢复原有 UID/GID/0600，再发送 SIGHUP；回退亦如此。代码现已实现该恢复逻辑，待正式主机刷新测试确认。
- 这是一项**新增隔离只读服务**，没有替换主站页面、考试评分、微信登录、订单和支付事务，也没有修改原 Next 的发布 SHA。前端切换仍需独立的全链路回归、权限和一键回退。

**生产原子刷新已实测通过（2026-11-17）**：正式 Rust 目录 `generatedAt` 从 2026-11-17T00:01:48.100Z 更新至 2026-11-17T00:09:14.454Z，450 条资源保持一致，发布快照 SHA256 `7221a64bc41904cef62d7b3fe021f0a201799739b76884b905c05bc545d26739`，文件属主仍为 `socthink-catalog` 且权限为 0600，Rust 真实内存确认更新、Next 公网 `/resources` 仍返回 200。`ops/data/promote_student_ready.sh` 已新增成功发布后自动刷新 Rust 目录，以及数据回滚后重新发布旧目录的事件钩子；新钩子尚在 PR，**没有擅自替换正在运行的生产数据发布脚本**。
