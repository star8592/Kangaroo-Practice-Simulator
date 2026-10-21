# SEAMO native WeChat practice — release contract (2026-10-21)

This patch prepares native SEAMO Grade 1 and Grade 2 revised **independent foundational practice**, not official SEAMO papers or official scoring. A successful Taro build does not mean the WeChat version is released.

## Native availability gate

- Only the two published revised paper IDs are eligible: `seamo-original-g1-revised-1` (15 questions/40 minutes) and `seamo-original-g2-revised-1` (25 questions/90 minutes).
- Native readiness requires the complete corresponding bilingual (Chinese AND English) question-and-options audio corpus, with a valid content-addressed URL and nontrivial MP3 file available in the current server runtime. The API does not switch `miniappReady` on when a single track is missing.
- Historical v1 practice remains direct-loadable on Web for previous attempts but does not enter the native miniapp candidate catalogue.
- Unsupported native deep links check the audio gate **before** creating an exam session and offer a copyable working Web URL.

## Practice timing and recovery

- The miniapp uses `session.startedAt` and `serverNow` to derive a monotonic session-bound remaining-time display. Opening an old draft or returning after app background does not restart 40/90-minute timing.
- At zero, a single guarded automatic grade submission is attempted. Late answer edits are blocked. Existing idempotent grade/result recovery prevents repeated attempts after a lost reply. Canceling a manual submission confirmation cannot defeat an expiry that happened during the confirmation dialog.
- The backend currently allows a ten-minute post-timer session grace: devices that remain closed past server expiry need further recovery policy before claiming robust delayed submission. This is an independently scored practice timer, not an official proctoring clock.

## Release requirements

1. `npm run test:seamo`, `npm run verify:public`, WeChat miniapp typecheck and real Taro compilation, authentication and event contracts, and browser regressions must all pass.
2. Produce 80 revised-question MP3s (40 Chinese and 40 English), audit their correctness and audio duration, additively publish them **without replacing existing competitions' audio**, verify on HTTPS from production and retest the API `miniappReady` flag.
3. Open the WeChat miniapp in developer tools and on a phone. Verify both grades, Chinese and English full question+choices voice, seek/pause/restart, timer resume, numeric inputs, answer draft, auto-submit, grade recovery and parental login.
4. WeChat preview upload, approval and production release require separate verifiable receipts. Do not claim miniapp launch from backend deploy alone.
