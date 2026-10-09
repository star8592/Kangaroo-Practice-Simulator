# 中国数学竞赛管家：赛事目录与备赛清单（2026-10-09）

## 范围

首批共5项：华杯赛、走美杯、希望杯、全国中学生数学奥林匹克竞赛、中国女子数学奥林匹克。Web /competitions 与微信小程序「我的比赛」统一读取数据，学生可保存备赛清单进度。

目录中的历史赛事资料不代表当届有中国内地报名资格。只有核实当届、当赛区、实际主办方与官方公告后才允许发布报名地址、报名截止、考试时间、考点及线上/线下要求；当前不产生任何未证实的日期倒计时。

## 信息核验原则

- 2025—2028教育部全国性中小学生竞赛名单有47项。其中全国中学生数学奥林匹克竞赛面向普通高中；华杯赛、希望杯、走美杯不得当作该名单内的全国性赛事宣传。
- 希望杯2026年国际、港澳赛区活动不等于中国内地赛区开放报名。
- 赛事名称与中国数学会名义的主办授权必须核实；不得因网站声称「官方」就认定为正式报名入口。
- 当前的流程清单是本站建议，无当届官方截止时间，统一标记“待核验”；清单包含资格核验、报名准备、数学备赛、线上或线下设备/考点检查、赛后成绩归档。

## 数据与接口

- 基础目录：src/lib/china-math-competitions.ts
- 备赛任务：src/lib/china-math-companion.ts
- Web：src/components/ChinaCompetitionDirectory.tsx
- 小程序：apps/miniapp/src/pages/events/index.tsx
- API：GET /api/miniapp/china-competitions，公开目录；只有已登录学生返回该学生私有完成进度。
- API：GET/PATCH /api/competition-companion/progress，沿用学生登录权限检查及完成状态。
- 原有小程序 /api/miniapp/companions 只展示经过当届安排确认的赛事，不把本目录无赛程事项冒充进行中的正式比赛。

## 验收及待办

- npm run test:china-companions：5项条目、25条备赛任务、无虚构日期、国外AMC任务不退化。
- 静态检查、登录完成状态、微信实机进入与发布需要工程门禁分开验收。
- 以后新增赛事届次，应单独记录来源、发布时间、地区、组别、实际举办形式、报名节点和复核时间。

## 来源（核验快照）

- 教育部：https://www.moe.gov.cn/srcsite/A29/202510/t20251029_1418393.html
- 中国数学会：https://www.cms.org.cn/Home/comp/comp.html
- 华杯赛历史暂停报道：https://www.xinhuanet.com/politics/2018-03/03/c_1122480371.htm
- 希望杯国际活动：https://www.hopemath.world/ （不代表中国内地报名开放）
