# R60 Unit 1：原书逐页核对与备课建议
来源为用户提供的 Kid's Box 1 原书扫描 PDF，第9—14页；源 SHA256: 67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d。

## 页码对应与教学边界
- PDF9/课本P2：Listen and point、Listen point and repeat；图片/听力活动，不能猜测台词。
- PDF10/课本P3：What's your name?、Goodbye、Hello I'm ...、1–10。未完成句型不能当标准朗读答案，数字英文拼写非页上原文。
- PDF11/课本P4：How old are you?、I'm ...；人物 Simon 6、Meera 8、Suzy 3、Stella 7。不要凭年龄为学生生成标准答案。
- PDF12/课本P5：blue green orange pink purple red yellow，按原书页脚顺序，适合单词跟读。歌曲/听辨依赖缺失的原版音频。
- PDF13/课本P6：S/Sid snake 的语音线索、What's your name?、How old are you?，只作朗读/发音备课，不能伪造原声。
- PDF14/课本P7：六格漫画 Listen to the story、Listen and say the number；没有可恢复的完整英文故事对白及官方音轨。

## 部署和发布策略
数据文件 ops/content/kids-box-student-1/unit1_source_notes.json 仅复制到私有教师教材目录 metadata/unit1_source_notes.json。
教师鉴权的原页 OCR 接口增加 source_note；不得放到公开前端资源或开放给未入班学生。
候选内容状态必须继续是 teacher_review_required。教师点击替换 OCR 乱码只改备课文本输入框；必须本人对照原书、勾选完成、保存 R59 审核记录，才能在原有作业界面挑选单词或句子发布。
没有文字候选的 PDF9/14 不显示快速替换按钮；所有需要原声的任务明确标记未提供原版音频。问题朗读与自由回答是不同评分任务。
验证：Backend 隔离PG18端到端、学生身份拒绝、源提示与原页匹配；前端390px浏览器从P5七种颜色词一键替换、老师审核保存、返回再用的全流程；R55/R56/R57回归；发布以主站SHA、公网JS与原子回退记录为准。
