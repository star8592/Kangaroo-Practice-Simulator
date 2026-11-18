# AccentLab Next R6 — 整句麦克风权限竞态防护与回归

日期：2026-11-19；范围：Next.js 原生候选 `/english/pronunciation/next-lab` 的 **整句跟读** `NativePronunciationTrial`。前一轮 R5 已处理单词 A/B；本轮补齐整句，不更改 Rust 分数协议、不重做认证/支付、保留 Vue V3 正式工作台。

## 风险与处理

- 旧版 `beginPractice()` 在 `getUserMedia()` 返回前只能依赖异步 React stage 更新，连续点击存在重复申请设备权限的窗口；离开页面或旧权限请求迟到时，可能继续使用旧 stream 或跑到录音流程。
- 本轮在调用 `getUserMedia()` **之前**使用同步 `operationRef` 锁与递增 generation token；页面显示明确的「正在等待麦克风授权」和「取消等待麦克风」。旧申请即使后来获准，也立即 stop 该 MediaStream 的全部 tracks，不播示范、不录音、不上传。
- 每个异步参考音播放、提示音完成、录音回调、Rust 评分请求都核对所属 generation；整句评分请求支持 AbortController，卸载时 abort；卸载时 detach recorder handlers、stop tracks、close AudioContext、pause reference。
- 录音太短、无识别到说话、异常或评分失败后，释放同步锁。录音器错误不再继续把异常 blob 送往 Rust，也不制造分数。
- 实验评分仅在 Rust 返回有限且处于 0—100 范围内的数字时呈现。此轮不改变评分数值算法，不能视为儿童口音准确率提高。

## 可复现自动验收

`tests/e2e/native-sentence-permission-r6.spec.ts`：
1. 同一事件循环内连续点击两次，只产生一个麦克风申请；在等待期间禁用换句，取消后换句成功；迟到 stream tracks 全部停止，无旧录音上传。
2. 用户拒绝授权后界面解锁，仍能切换句子，绝不制造分数。
3. 取消第一次申请后发起第二次；第一次迟到不干扰第二次，两个取消的 streams 均释放，且没有过期的评分请求。

测试使用浏览器内置模拟麦克风和受控后端，不读取真人录音、不向生产 Rust 评分接口上传。所有改动仅在独立 PR 分支完成，必须先通过现有质量门禁与桌面/手机浏览器分片；CI 失败不得强行合并。生产上线需既有自动回退部署与精确公网 SHA 双重核查。

## 实体设备状态与 E3 边界

2026-11-19 设备检索：S22 Zoria Agent **离线**，不得宣称已完成手机实机测试。Z890 USB 调试可见另一台三星 SM-G9910（Android 15），但其前台正在运行闲鱼且屏幕醒着；为避免打断操作，未发起 Chrome 切换/录音权限/真实上传。待有空闲授权手机再验证麦克风权限、微信内置浏览器、真实录音 A/B 与试听操作。儿童口音评分准确率须有人工标注语料和指标回执。
