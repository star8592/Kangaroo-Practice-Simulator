# AccentLab Next R5 — 两次真实单词录音 A/B 与麦克风异步安全

日期：2026-11-18。范围：Next.js 候选 \`/english/pronunciation/next-lab\` 的 \`FocusedWordPractice\`，不改正式 Vue V3、Rust 评分协议、微信、教师课堂、支付或学生历史。

## 问题与行为

1. 旧实现一点击「录这个词并评分」即 revoke 当前 Blob URL，因此不能自听两次录音；权限被拒绝后也没有旧录音可回放。
2. 旧实现等待 \`getUserMedia\` 的期间还处于 idle，快速双击可能打开两个录音请求；组件已卸载或孩子换词后旧 promise/recorder/fetch 回调可能写错状态。
3. R5 仅保存**当前所选单词的最近两次成功且符合大小校验的独立 MediaRecorder Blob**：A（上一次）和 B（这一次）。第一段录音单独显示 B，第二段后出现双录音对比；第三段成功后销毁最旧 URL，自动变为 B→A、最新→B。失败、拒绝麦克风或评分 503 均保留已有 A/B；换词和卸载销毁全部当前页临时对象。
4. 在 A/B 下方提供「更清楚／差不多／还要练」儿童自主听辨；这是本地状态，不作为声学模型、教师结论或自动进步判断，也不写入数据库。评分仅在 Rust 响应含有效 0–100 数字时展示，显示为实验参考分。
5. 权限请求前同步设置 operationRef 防重复，UI 进入 requesting 并允许取消；每次录音拥有代数 token；迟到的设备 stream 必须立即 stop tracks，过期 onstop、onerror、评分请求不能更新新的练习。卸载立即 abort score 请求、停止设备并 revoke 两条 URL。录音停止异常立即结束状态锁。

## 验收边界

新增 \`tests/e2e/native-focused-word-ab-r5.spec.ts\`，由现有 CI 的桌面 Chromium 和 Pixel 7 手机两分片真实浏览器执行，使用内置模拟麦克风和受控服务端评分响应；验证连续三次独立 Blob、第三次轮换、拒绝授权保留既有录音、取消等待、同步双击防重复、换词/换句后迟到权限回调关闭 tracks、未发生过期评分上传及窄屏无横向溢出。

**待回执：** PR 对应 commit 的 CI quality 与两组 browser-e2e-shard 最终绿色状态；线上正式录音、儿童设备权限、真实 Rust 评分准确性和微信教师试课仍须独立验收。不得凭测试音宣称儿童发音改善，亦不得仅凭 PR 合并宣称已生产部署。正式发布仍受原有 main CI-green 原子部署及失败自动回退约束，且应读取公网部署 SHA。
