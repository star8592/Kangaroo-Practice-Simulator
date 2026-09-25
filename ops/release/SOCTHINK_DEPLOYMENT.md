# socthink.cn 生产发布与运维手册

> 本文档是 Math Competition Lab / 国际数学竞赛训练中心在 https://socthink.cn 的正式生产发布规范。
> 目标是固定一条可重复、可验证、可回滚、不会误伤题库和用户数据的发布闭环。

---

## 1. 适用范围

仓库：

~~~text
GitHub:
star8592/Kangaroo-Practice-Simulator

Branch:
main
~~~

生产站：

~~~text
https://socthink.cn
~~~

正式发布链路：

~~~text
GitHub main
    ↓
本地测试节点同步
    ↓
本地生产构建
    ↓
本地独立端口 smoke test
    ↓
免密 SSH root@socthink.cn
    ↓
生产服务器 fetch/reset 到同一个 GitHub SHA
    ↓
生产构建
    ↓
systemd 重启
    ↓
服务器本机 smoke test
    ↓
公网 /api/release 精确 SHA 验证
~~~

本手册把“GitHub 是唯一代码源”作为最高约束。

---

## 2. 核心发布原则

### 2.1 GitHub 是唯一代码源

正式代码只允许以 GitHub main 为最终来源。

正式仓库：

~~~text
star8592/Kangaroo-Practice-Simulator
branch: main
~~~

发布脚本首先执行：

~~~bash
git fetch origin main
~~~

然后锁定：

~~~bash
git rev-parse origin/main
~~~

得到本次发布唯一目标 SHA。

生产服务器最终运行的代码必须与该 SHA 完全一致。

禁止把以下行为作为正式发布方式：

~~~text
直接在生产服务器编辑源码
直接在本地改源码后 rsync/scp 到服务器
本地未提交代码直接上线
服务器上手工 hotfix 后不回 GitHub
生产服务器维护独立于 main 的代码
~~~

否则会产生无法追踪的第三种版本。

### 2.2 本地主机只是测试节点

本地目录：

~~~text
/mnt/disk1/Code/Kangaroo-Practice-Simulator
~~~

本地节点职责：

~~~text
git pull / fetch
构建
测试
验收
发起部署
~~~

本地主机不是第二代码源。

正式发布脚本如果发现本地存在 tracked 修改，会拒绝发布。

### 2.3 生产数据绝不能被 Git 操作清理

生产服务器包含大量不进入 GitHub 的运行数据，例如：

~~~text
private/
public/local-assets/
用户数据
考试记录
题库 JSON
题目图片
解答素材
运行时生成内容
~~~

正式发布脚本强制遵守：

~~~text
绝不执行 git clean
~~~

这是生产数据安全的核心约束。

---

## 3. 当前生产环境

### 3.1 公网入口

~~~text
https://socthink.cn
~~~

当前 Nginx 将流量转发到：

~~~text
127.0.0.1:3000
~~~

### 3.2 SSH

测试节点可以免密连接：

~~~bash
ssh root@socthink.cn
~~~

发布脚本使用：

~~~text
root@socthink.cn
~~~

并采用 BatchMode，不等待人工密码输入。

验证命令：

~~~bash
ssh -o BatchMode=yes -o ConnectTimeout=10 root@socthink.cn 'echo SSH_OK'
~~~

预期：

~~~text
SSH_OK
~~~

### 3.3 生产应用目录

~~~text
/opt/socthink-math
~~~

该目录同时包含：

~~~text
Git 管理的代码
node_modules/
.next/
private/
public/
.release/
~~~

其中源码受 GitHub 控制，运行数据不会被 Git 清理。

### 3.4 systemd 服务

服务名：

~~~text
socthink-math.service
~~~

当前核心配置：

~~~ini
WorkingDirectory=/opt/socthink-math
ExecStart=/usr/bin/node /opt/socthink-math/node_modules/next/dist/bin/next start
Environment=NODE_ENV=production
Restart=always
~~~

查看状态：

~~~bash
ssh root@socthink.cn 'systemctl status socthink-math.service --no-pager -l'
~~~

重启：

~~~bash
ssh root@socthink.cn 'systemctl restart socthink-math.service'
~~~

查看最近日志：

~~~bash
ssh root@socthink.cn 'journalctl -u socthink-math.service -n 100 --no-pager'
~~~

实时日志：

~~~bash
ssh root@socthink.cn 'journalctl -u socthink-math.service -f'
~~~

---

## 4. 正式发布入口

正式发布脚本：

~~~text
ops/release/publish_socthink.sh
~~~

标准发布命令只有一条：

~~~bash
cd /mnt/disk1/Code/Kangaroo-Practice-Simulator
bash ops/release/publish_socthink.sh
~~~

正常情况下不要绕开该脚本手工部署。

---

## 5. 发布脚本完整流程

### 5.1 锁定 GitHub 目标 SHA

脚本执行：

~~~bash
git fetch origin main
TARGET_SHA="$(git rev-parse origin/main)"
~~~

这个 SHA 是整个发布过程中唯一可信版本标识。

### 5.2 检查本地 tracked 修改

脚本检查工作区与暂存区。

如果发现 tracked 文件被修改：

~~~text
立即终止发布
~~~

这样可以避免出现：

~~~text
GitHub A 版本
+
本地临时修改 B
=
生产实际运行 C 版本
~~~

### 5.3 本地 fast-forward 到 main

要求当前分支：

~~~text
main
~~~

执行：

~~~bash
git merge --ff-only origin/main
~~~

随后确认：

~~~text
LOCAL_SHA == TARGET_SHA
~~~

### 5.4 安装依赖

~~~bash
npm ci
~~~

正式发布统一使用 lockfile，不用 npm install 替代。

### 5.5 本地生产构建

~~~bash
npm run build
~~~

当前构建链会包含项目已有检查，例如：

~~~text
BRAND_AUDIT
competition identity
MAA scoring
MAA library
AIME sections
MAA smart
solution books
verified storyboards
verified store
TypeScript
Next.js production build
~~~

任何一步失败，发布停止。

---

## 6. 本地隔离 smoke test

正式服务可能已经运行，因此发布脚本不会拿旧服务冒充新版本测试。

脚本使用独立端口：

~~~text
3037
~~~

启动刚刚构建的新版本：

~~~bash
npm start -- -p 3037
~~~

然后执行：

~~~bash
python3 scripts/smoke_test.py --base http://127.0.0.1:3037
~~~

这样验证的是刚构建出来的 release candidate。

当前 smoke test 覆盖：

~~~text
身份认证
错误登录限流
考试题目读取
Australian AMC
MAA AMC
评分
考试 session
管理员权限隔离
学生分析
口算 session
个性化下一轮 API
session revocation
~~~

关键输出之一：

~~~text
arithmetic_next_session = true
~~~

---

## 7. 生产部署过程

本地测试通过后，通过：

~~~bash
ssh root@socthink.cn
~~~

进入生产部署。

目标目录：

~~~text
/opt/socthink-math
~~~

目标服务：

~~~text
socthink-math.service
~~~

---

## 8. 首次接管旧生产目录

历史上 /opt/socthink-math 不是 Git 仓库。

第一次按新规范接管时，脚本先创建代码备份，再初始化 Git。

备份目录：

~~~text
/opt/socthink-math-backups/
~~~

备份文件形式：

~~~text
legacy-YYYYMMDD-HHMMSS.tar.gz
~~~

首次备份排除：

~~~text
private/
public/
node_modules/
.next/
.git/
~~~

原因：

- private 是运行数据；
- public 中包含大量题目图片和本地资产；
- node_modules 可重新安装；
- .next 可重新构建；
- .git 在首次接管前不存在。

然后初始化：

~~~bash
git init
git remote add origin https://github.com/star8592/Kangaroo-Practice-Simulator.git
~~~

---

## 9. 生产代码同步规则

生产服务器执行：

~~~bash
git fetch --prune origin main
git cat-file -e "$TARGET_SHA^{commit}"
git reset --hard "$TARGET_SHA"
~~~

git reset --hard 只恢复 Git tracked 文件。

正式发布脚本不执行 git clean。

因此以下内容被保留：

~~~text
private/
public/local-assets/
用户数据
大型题目图片
运行时文件
~~~

---

## 10. 生产数据保护模型

生产目录可以分为两层。

### 10.1 GitHub 代码层

典型内容：

~~~text
src/
scripts/
ops/
docs/
package.json
package-lock.json
next.config.ts
tsconfig.json
VERSION
CHANGELOG-*.md
public 中少量 tracked 文件
~~~

这些内容允许由 Git 恢复。

### 10.2 生产运行数据层

典型内容：

~~~text
private/*
public/local-assets/*
.env*
.release/*
node_modules/
.next/
~~~

其中 private 可能包含：

~~~text
用户
考试记录
session
题库
解题数据
分析结果
口算历史
~~~

public/local-assets 主要包含：

~~~text
历年题目图片
本地提取资源
考试素材
大体积静态资源
~~~

正式发布不能删除这些内容。

---

## 11. 生产构建

生产服务器代码同步后执行：

~~~bash
npm ci
npm run build
~~~

这保证线上 .next 来自 TARGET_SHA，而不是旧构建缓存。

---

## 12. 服务重启与本机验收

构建通过后：

~~~bash
systemctl restart socthink-math.service
~~~

脚本等待：

~~~text
http://127.0.0.1:3000/api/release
~~~

恢复正常。

然后运行：

~~~bash
python3 scripts/smoke_test.py --base http://127.0.0.1:3000
~~~

如果服务器本机 smoke test 失败，发布不能算成功。

---

## 13. 发布身份接口

为了彻底解决“网站能打开，但到底是哪一版”的问题，项目提供：

~~~text
GET /api/release
~~~

源码：

~~~text
src/app/api/release/route.ts
~~~

公网查看：

~~~bash
curl -sS https://socthink.cn/api/release
~~~

示例：

~~~json
{
  "ok": true,
  "service": "math-competition-lab",
  "version": "1.0.0",
  "deployedSha": "3d6fc03267af1d8b3c3ed8d8ce47555d67610f2e"
}
~~~

version 来自：

~~~text
VERSION
~~~

deployedSha 来自：

~~~text
.release/deployed_sha
~~~

---

## 14. 真正上线的判定标准

以后不允许用下面这些现象单独证明“已经上线”：

~~~text
首页能打开
页面看起来一样
服务器进程存在
npm build 成功
~~~

正式判定必须同时满足：

~~~text
1. GitHub origin/main SHA = TARGET_SHA
2. 本地 npm ci 成功
3. 本地 npm run build 成功
4. 本地独立端口 smoke test 成功
5. SSH 连接成功
6. 生产服务器 fetch 到 TARGET_SHA
7. 生产 npm ci 成功
8. 生产 npm run build 成功
9. systemd 重启成功
10. 生产本机 smoke test 成功
11. 公网 /api/release HTTP 200
12. 公网 deployedSha == TARGET_SHA
13. 公网 version == VERSION
~~~

全部通过后，脚本输出：

~~~text
PUBLIC_RELEASE=PASS
~~~

只有看到这个结果，才能宣布发布完成。

---

## 15. 发布运行元数据

生产发布脚本写入：

~~~text
/opt/socthink-math/.release/
~~~

包含：

~~~text
deployed_sha
deployed_version
deployed_at
~~~

查看：

~~~bash
ssh root@socthink.cn 'cat /opt/socthink-math/.release/deployed_sha'
ssh root@socthink.cn 'cat /opt/socthink-math/.release/deployed_version'
ssh root@socthink.cn 'cat /opt/socthink-math/.release/deployed_at'
~~~

.release/ 已加入 .gitignore，不进入 GitHub。

---

## 16. v1.0.0 首次正式发布记录

首次按该规范完成生产发布：

~~~text
版本:
1.0.0

GitHub SHA:
3d6fc03267af1d8b3c3ed8d8ce47555d67610f2e

公网:
https://socthink.cn
~~~

验收：

~~~text
local build                  PASS
local smoke                  PASS
remote build                 PASS
remote smoke                 PASS
systemd restart              PASS
/api/release                 PASS
public version match         PASS
public SHA match             PASS
arithmetic_next_session      PASS
~~~

最终：

~~~text
PUBLIC_RELEASE=PASS
~~~

---

## 17. 标准发布 SOP

### Step 1：开发必须先进入 GitHub

所有正式修改完成后提交到 main。

### Step 2：执行唯一发布命令

~~~bash
cd /mnt/disk1/Code/Kangaroo-Practice-Simulator
bash ops/release/publish_socthink.sh
~~~

### Step 3：等待最终成功标志

成功必须看到类似：

~~~text
PUBLIC_RELEASE=PASS 1.0.0 <SHA>

[publish] SUCCESS:
https://socthink.cn is running 1.0.0 @ <SHA>
~~~

如果脚本中途退出，不得宣布上线。

### Step 4：独立公网复核

~~~bash
curl -sS https://socthink.cn/api/release
~~~

---

## 18. 日常快速检查

### 18.1 网站是否正常

~~~bash
curl -I https://socthink.cn
~~~

期望 HTTP 200。

### 18.2 当前线上版本

~~~bash
curl -sS https://socthink.cn/api/release
~~~

### 18.3 GitHub main SHA

~~~bash
cd /mnt/disk1/Code/Kangaroo-Practice-Simulator
git fetch origin main
git rev-parse origin/main
~~~

### 18.4 生产 Git SHA

~~~bash
ssh root@socthink.cn 'cd /opt/socthink-math && git rev-parse HEAD'
~~~

### 18.5 systemd 状态

~~~bash
ssh root@socthink.cn 'systemctl is-active socthink-math.service'
~~~

期望：

~~~text
active
~~~

### 18.6 生产本机接口

~~~bash
ssh root@socthink.cn 'curl -fsS http://127.0.0.1:3000/api/release'
~~~

### 18.7 Nginx

~~~bash
ssh root@socthink.cn 'nginx -t'
~~~

查看站点：

~~~bash
ssh root@socthink.cn 'cat /etc/nginx/sites-enabled/socthink.cn'
~~~

---

## 19. 自动回滚机制

如果生产部署中出现错误，脚本会尝试自动回滚。

对于已经完成 Git 接管的生产目录，发布前记录：

~~~text
PREV_SHA
~~~

失败时尝试：

~~~bash
git reset --hard "$PREV_SHA"
npm ci
npm run build
systemctl restart socthink-math.service
~~~

所以自动回滚目标是发布前正在运行的 Git commit。

---

## 20. 首次接管失败时的恢复

首次接管时没有 PREV_SHA。

因此脚本会先创建：

~~~text
/opt/socthink-math-backups/legacy-*.tar.gz
~~~

如果首次接管失败，可恢复旧代码备份。

生产运行数据 private 和 public 不依赖该代码包恢复，因为它们在首次备份时刻意排除，并一直保留在原位置。

---

## 21. 手工回滚指定 SHA

极端情况下可手工回滚：

~~~bash
ssh root@socthink.cn

cd /opt/socthink-math
git fetch origin main
git log --oneline -20

git reset --hard <GOOD_SHA>

npm ci
npm run build
systemctl restart socthink-math.service
~~~

然后重新运行：

~~~bash
python3 scripts/smoke_test.py --base http://127.0.0.1:3000
~~~

并更新发布元数据：

~~~bash
printf '%s
' '<GOOD_SHA>' > .release/deployed_sha
printf '%s
' '<VERSION>' > .release/deployed_version
date -Iseconds > .release/deployed_at
~~~

最后：

~~~bash
curl -sS https://socthink.cn/api/release
~~~

一般情况下优先用正式发布脚本，不鼓励手工回滚。

---

## 22. 常见故障排查

### 22.1 SSH 无法连接

~~~bash
ssh -vvv root@socthink.cn
~~~

或：

~~~bash
ssh -o BatchMode=yes -o ConnectTimeout=10 root@socthink.cn 'echo OK'
~~~

BatchMode 失败时，正式发布应直接停止。

### 22.2 npm ci 失败

检查：

~~~bash
node -v
npm -v
~~~

正式发布继续以 npm ci 为准，不用 npm install 临时绕过。

### 22.3 npm run build 失败

优先检查：

~~~text
TypeScript
Next.js build
prebuild tests
题库一致性
赛制验证
~~~

必须修复 GitHub 后重新发布。

### 22.4 systemd 启动失败

~~~bash
ssh root@socthink.cn '
systemctl status socthink-math.service --no-pager -l
journalctl -u socthink-math.service -n 200 --no-pager
'
~~~

### 22.5 服务器 3000 正常但公网异常

重点检查：

~~~text
Nginx
TLS
DNS
防火墙
反向代理
~~~

运行：

~~~bash
ssh root@socthink.cn 'nginx -t'
~~~

### 22.6 首页正常但怀疑仍是旧版本

不要通过截图或首页文字猜版本。

直接：

~~~bash
curl -sS https://socthink.cn/api/release
~~~

再与：

~~~bash
git rev-parse origin/main
~~~

比较。

### 22.7 /api/release 返回旧 SHA

说明生产运行版本不是 GitHub 最新 main，或者服务未重启到新构建。

标准处理：

~~~bash
bash ops/release/publish_socthink.sh
~~~

不要在生产服务器直接补文件。

---

## 23. 版本管理规范

仓库根目录：

~~~text
VERSION
~~~

当前：

~~~text
1.0.0
~~~

正式版本建议同时维护：

~~~text
VERSION
CHANGELOG-vX.Y.Z.md
~~~

例如：

~~~text
VERSION
1.1.0

CHANGELOG-v1.1.0.md
~~~

版本更新必须先提交 GitHub，再执行正式发布。

---

## 24. Changelog 要求

每个正式版本至少记录：

~~~text
版本号
发布日期
主要功能
修复内容
数据结构变化
部署注意事项
兼容性变化
验证结果
~~~

不要只写 update、fix、misc 这类无法用于回滚判断的内容。

---

## 25. 安全约束

### 25.1 不把 SSH 私钥写入仓库

当前本地到 root@socthink.cn 已经具备免密认证。

脚本只调用系统已有 SSH 身份。

严禁把以下内容写入 GitHub：

~~~text
private key
password
token
~~~

### 25.2 不覆盖生产 private 数据

未来任何发布脚本修改都必须继续禁止：

~~~text
git clean
rm -rf private
rsync --delete private
~~~

### 25.3 不把生产服务器当开发机

生产服务器只承担：

~~~text
fetch
reset
build
restart
verify
rollback
~~~

不应该执行：

~~~text
vim src/...
nano src/...
直接修改 package.json
生产 hotfix 不回 GitHub
~~~

---

## 26. GitHub Actions 与生产发布

当前 GitHub Actions 主要负责仓库代码构建验证。

真正的 socthink.cn 发布固定走：

~~~text
本地测试节点
    ↓
publish_socthink.sh
    ↓
免密 SSH
~~~

这是因为本地已经具备 root@socthink.cn 的免密连接能力。

如果未来改成 GitHub Actions 自动部署，需要正式配置并验证：

~~~text
SERVER_HOST
SERVER_USER
SERVER_SSH_KEY
APP_DIR
~~~

在完成迁移前，不要同时维护两套不同的生产发布逻辑。

---

## 27. 发布脚本可配置参数

脚本支持环境变量：

~~~text
ROOT
BRANCH
REMOTE_HOST
REMOTE_APP
REMOTE_SERVICE
PUBLIC_URL
LOCAL_TEST_PORT
~~~

默认值：

~~~text
BRANCH=main
REMOTE_HOST=root@socthink.cn
REMOTE_APP=/opt/socthink-math
REMOTE_SERVICE=socthink-math.service
PUBLIC_URL=https://socthink.cn
LOCAL_TEST_PORT=3037
~~~

正常发布一般不要覆盖这些默认值。

---

## 28. 发布完成定义 Definition of Done

一个版本只有满足以下全部条件才算完成：

- [ ] 所有正式代码已经进入 GitHub main
- [ ] 本地没有 tracked 修改
- [ ] 本地 SHA 与 origin/main 一致
- [ ] npm ci 成功
- [ ] npm run build 成功
- [ ] 本地独立端口 smoke test 成功
- [ ] SSH 免密连接成功
- [ ] 生产服务器 fetch 到目标 SHA
- [ ] 生产服务器 npm ci 成功
- [ ] 生产服务器 build 成功
- [ ] systemd restart 成功
- [ ] 生产本机 smoke test 成功
- [ ] 公网 HTTPS 正常
- [ ] /api/release 返回正确 VERSION
- [ ] /api/release 返回正确 deployedSha
- [ ] deployedSha 与 GitHub origin/main 完全一致

最后一项不满足，一律不算上线完成。

---

## 29. 最常用命令速查

### 正式发布

~~~bash
cd /mnt/disk1/Code/Kangaroo-Practice-Simulator
bash ops/release/publish_socthink.sh
~~~

### 查看公网版本

~~~bash
curl -sS https://socthink.cn/api/release
~~~

### 查看 GitHub 目标 SHA

~~~bash
cd /mnt/disk1/Code/Kangaroo-Practice-Simulator
git fetch origin main
git rev-parse origin/main
~~~

### 查看生产 SHA

~~~bash
ssh root@socthink.cn 'cd /opt/socthink-math && git rev-parse HEAD'
~~~

### 查看生产服务

~~~bash
ssh root@socthink.cn 'systemctl status socthink-math.service --no-pager -l'
~~~

### 查看生产日志

~~~bash
ssh root@socthink.cn 'journalctl -u socthink-math.service -n 100 --no-pager'
~~~

### 查看 Nginx

~~~bash
ssh root@socthink.cn 'nginx -t && cat /etc/nginx/sites-enabled/socthink.cn'
~~~

### 运行远端 smoke test

~~~bash
ssh root@socthink.cn 'cd /opt/socthink-math && python3 scripts/smoke_test.py --base http://127.0.0.1:3000'
~~~

---

## 30. 最终固定规则

今后针对 socthink.cn，统一执行：

~~~text
GitHub 是唯一代码源
        ↓
本地主机只负责测试和发起部署
        ↓
生产服务器只拉 GitHub 精确 SHA
        ↓
运行数据不进入 Git 清理范围
        ↓
本地/远端双重 smoke
        ↓
公网 /api/release 精确核验
        ↓
失败自动回滚
~~~

最重要的一句话：

> 只有当 https://socthink.cn/api/release 返回的 deployedSha 与 GitHub origin/main 完全一致时，才能宣布“发布完成”。

---

## 31. CI-green 生产机拉取式自动发布

从 2026-09-25 起，推荐把常规代码发布切换为生产机主动拉取，而不是把 root SSH 私钥保存到 GitHub Actions。

### 工作方式

~~~text
push main
    ↓
GitHub Actions: CI
    ↓
CI completed + success
    ↓
生产机 socthink-auto-deploy.timer 发现 origin/main 新 SHA
    ↓
再次通过 GitHub API 核验该 SHA 的 CI 为绿色
    ↓
精确 reset 到目标 SHA
    ↓
npm ci + production build
    ↓
写入 .release/deployed_sha
    ↓
restart socthink-math.service
    ↓
生产本机 /api/release + smoke_test
    ↓
公网 /api/release 最终核验
~~~

### 安装

首次安装在生产服务器执行：

~~~bash
cd /opt/socthink-math
bash ops/release/install_auto_deploy_server.sh
~~~

安装后包含：

- `/usr/local/sbin/socthink-auto-deploy`
- `socthink-auto-deploy.service`
- `socthink-auto-deploy.timer`

timer 默认每 2 分钟检查一次。没有新 SHA 时只执行一次轻量 `git fetch`；只有发现新 SHA 时才查询 GitHub Actions 状态。

### 安全规则

自动发布器必须满足：

- 只跟踪 `origin/main`
- 必须找到同一 SHA 的 `CI` workflow
- `CI.status` 必须为 `completed`
- `CI.conclusion` 必须为 `success`
- CI 缺失、失败、运行中或 GitHub API 不可达时禁止发布
- 禁止执行 `git clean`
- `private/`、`public/local-assets/` 和运行数据必须保留
- build、restart、本机 release receipt 或 smoke test 任一失败时自动回滚到上一 SHA
- 公网边缘短暂不可达只记录 WARN，不回滚已经通过本机 smoke 的版本

### 运维

查看 timer：

~~~bash
systemctl status socthink-auto-deploy.timer --no-pager -l
systemctl list-timers socthink-auto-deploy.timer --all
~~~

查看最近自动发布日志：

~~~bash
journalctl -u socthink-auto-deploy.service -n 200 --no-pager
~~~

手动立即检查一次：

~~~bash
systemctl start socthink-auto-deploy.service
~~~

现有 `.github/workflows/deploy.yml` 保留为人工应急发布入口；常规发布不再要求 GitHub 保存生产 root SSH 私钥。
