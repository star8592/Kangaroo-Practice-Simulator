# R58｜Kid's Box 学生用书 1（私有教师教材库）

来源：Z890 /home/master/下载/KIDS BOX 学生用书1(1).pdf。
SHA256：67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d。
94页整本图像扫描，无原生文字层，无原教材音轨。
本地归档 /mnt/disk2/socthink-content-private/books/kids-box-student-1/，含原件、94张扫描页、18份PDF章节和84页OCR初稿。

## 教材目录（根据原书PDF第6页内容目录）
Unit1 Hello! PDF9-14；Unit2 My school PDF15-20；Unit3 Favourite toys PDF21-26；Unit4 My family PDF27-32。
Review1 Our world PDF33-34。
Unit5 Our pets PDF35-40；Unit6 My face PDF41-46；Unit7 Wild animals PDF47-52；Unit8 My clothes PDF53-58。
Review2 Our world PDF59-60。
Unit9 Fun time! PDF61-66；Unit10 At the funfair PDF67-72；Unit11 Our house PDF73-78；Unit12 Party time! PDF79-84。
Review3 Our world PDF85-86；Word list PDF87-92；前置页PDF1-8；致谢/封底PDF93-94。94/94页覆盖且无重叠。

## OCR与发布边界
84页首轮Tesseract.js英文OCR平均置信度42.8分，83页低于65分；所有文字为未校对草稿、0条允许自动评分。
教师必须对照原页逐行修改并确认，随后进入已有的智能教材分类、逐句/词核对、使用权确认、发布作业。
Listening/Sing/Say等活动的原始音频不在扫描PDF中，不能把普通OCR输出伪装成官方听力脚本。
所有扫描页面与章节PDF只在受统一微信身份+教师课堂权限保护的私有接口读取；不会写入Next public目录。学生仅看到老师选择并审核过的朗读/词汇作业。

## 接口和验收
私有数据目录：/var/lib/socthink/teacher-books/kids-box-student-1/。接口：/tenants/:tenant/classes/:classId/books；具体书本详情、受保护图片、OCR草稿和章节PDF。
隔离PostgreSQL18测试：教师可访问12单元18章节、94页、私有PDF图片和OCR；游客与学生不可访问整本书，5学生真实单词评分与原课堂回归通过。
手机浏览器测试：打开目录、看原书扫描页、纠正OCR、逐页确认，导入原有编辑器但不自动发布。Word/PDF和R56/R57作业回归均通过。
真实教师微信手机完整业务验收尚待实测。
