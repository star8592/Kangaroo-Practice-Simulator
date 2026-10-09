# 旧手动部署工作流退役与统一发布器

日期：2026-10-10。变更级别：L3（生产发布基础设施）。

## 风险与根因

原手动 deploy.yml 采用生产目录 git reset --hard、npm ci、npm run build、root SSH 以及过时的一次性 Pre-A 数据上传，与已经运行的 CI-green、候选烟测、不可变发布和自动回滚形成平行发布路径。即使只在 workflow_dispatch 时执行，依然可能无意绕过统一发布门禁。

## 新流程

保留人工发布入口，但它只接受 main 分支的显式40位 Git SHA，并校验请求的 SHA 与 GitHub main 完全一致。使用 GitHub SSH 私钥而非密码回退，连接生产服务器后执行唯一操作：systemctl start socthink-auto-deploy.service。实际构建和切换全部由现有服务核验 CI 绿灯、运行 candidate、检查考试权限、保留可回滚的不可变旧版本。最后通过公网发布回执和游客隐私接口验证精确 SHA。

数据晋升继续使用单独的审核脚本与备份，不再混杂进手动源代码发布。

## 真实验收门禁

scripts/test_manual_deploy_contract.py 被纳入 npm run verify:public，包含七类违规变异用例，禁止 reset、直接 npm 生产构建、跳过公网回执、密码回退与直接重启生产应用。发布完成还需 PR CI、main CI、生产 SHA 对齐；实际人工触发是否成功必须通过 GitHub workflow run 单独确认，不能仅用代码审查结果替代。

## 未消除的风险

现有 GitHub SSH 身份仍可能为生产 root；下一步应采用仅可启动指定发布 systemd unit 的受限账号。GitHub required approving review count 仍为0，高风险发布流程需保留独立审核/项目负责人确认。缺少 SSH 私钥时此应急入口 fail-closed，不影响原定时自动发布。
