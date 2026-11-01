# SOC THINK｜武汉K12扩容、剑桥KET/PET仿真规格与真实支付核查（2026-10-31）

## 1. 武汉K12：实际归档数与新发现的区别

原先 `data/discovery/wuhan-grade6-thirdparty-index-20261031.json` 有 **99条武汉六年级资料目录线索**（英语44、数学41、语文13、其他1）；公开页面索引不等于已取得原卷，真题文件核验0。

本次实际浏览武汉教育资源网公开列表 **16页**，新增 **334条** 与旧99条按URL去重后合计 **433条**，无页面访问失败。新334条依年级：G1 27、G2 45、G3 43、G4 41、G5 40、小升初50、九年级英语38、九年级数学50；依科目：数学154、英语113、语文59、其他8。现有公开目录主要涵盖2024—2026年资料，学年度中有2026—2027，但绝不能将未来2027届试卷称为已经举行的2027年考试。

详细索引：`data/discovery/wuhan-k12-expanded-index-20261031.json`；采集程序：`scripts/discover_wuhan_k12_extended_20261031.py`；回归：`scripts/test_wuhan_k12_expanded_20261031.py`。GB18030和UTF-8真实混合编码已处理；未把GB页面的乱码条目错丢；新增334条明确 state=third_party_public_listing_only、文件下载0、原卷核验0、商用授权未验。真实原件需要通过考试发布学校或正规许可来源取得，不能把资源商城目录当文件。

下一轮优先武汉9年级数学/物理/英语元调四调、中考、三至六年级英语听力MP3与试卷-答案配对，继续补齐一年级至五年级和2024—2026各区的月考、期中、期末；来源标记地区、年级、学科、考试类别、学期、原卷完整性和答案类型。尽量追溯市教育局/考试机构和学校的直接发布页面。

## 2. KET/PET：正式考试结构事实与现有资料

来自 Cambridge English 2026-10-31 官方说明：

- **KET = A2 Key for Schools**：读写60分钟，7个Part、32题，成绩权重50%；听力约30分钟，5个Part、25题，占25%；口语2个Part，两人考试约8—10分钟，占25%。读写各Part题数 [6,7,5,6,6,1,1]、听力各Part [5,5,5,5,5]，听力录音各播两次。写作第6部分至少25词，第7部分至少35词，分别最高15分。官方题型说明：https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/format/
- **PET = B1 Preliminary for Schools**：阅读45分钟、6个Part/32题，占25%；写作45分钟，2部分（邮件和文章/故事二选一），每部分约100词，占25%；听力约30分钟、4部分/25题，占25%；口语4部分，两人约10—12分钟，占25%。阅读各Part [5,5,5,5,6,6]、听力 [7,6,6,6]，录音各播两次。官方说明：https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/
- Digital与paper的题型相同但交互机制不同；剑桥官方有官方的数字样题和纸笔样题，注意样题与实考电脑界面仍可能有小差异。KET for Schools和PET for Schools优先适配国内中小学，成人版另建同格式但题材不同的内容包。
- **成绩不能乱算**：真实写作/口语需专门评分量表；不得以客观题正确率直接换算成剑桥官方等级分数。AI口语模拟不冒充真人考官正式成绩。

官方网站：KET https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/preparation/ ；PET https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/preparation/ 。

### Z890实有剑桥资料

保存在 Z890 私有 `private/raw-source-archive/2024-2027/language/year-agnostic/` 下，KET **31份PDF**、PET **25份PDF**，合计 **56份、995页、177,476,315字节**，逐份已验证原件PDF签名、SHA-256和页数；其中 **55份** 通过名称与原有剑桥官方公开源URL匹配，1份还需单独核查原来源。资料主要是答案、评分说明、教师手册、听力文本稿、练习/教学文件，不是56套完整全真模拟题。

索引：`data/discovery/cambridge-ket-pet-audit-20261031.json`；程序 `scripts/audit_cambridge_ket_pet_archive_20261031.py`；测试 `scripts/test_cambridge_ket_pet_archive_20261031.py`。不把实际PDF字节提交GitHub、不计商业可售卷数。

### 已写入产品的第一版能力

- `src/lib/cambridge-ket-pet.ts`：官方结构化考试规格、模块时限、权重、各Part题数、写作词数和音频重复规则。
- `fullMockBankCompleteness()`：只有Part题目数量已审校、听力完整、口语/评卷标准及权限等材料齐全，才能被标为完整模拟卷；暂时均未达到。
- `src/lib/cambridge-starter-questions.ts`：8道SOCTHINK独立编写的KET/PET阅读短练习，非剑桥官方试题。
- `src/app/english/ket-pet/page.tsx`、`src/components/CambridgeStarterPractice.tsx`：响应式网页入口，切换KET/PET、逐题单选、交卷反馈与解析、官方规则与样卷链接。旧考试目录 `ket-pet` 链接此入口。
- 验收 `scripts/test_cambridge_ket_pet_formats.ts`：官方考试部件数、题目总数、时长、权重、模拟卷数据完整性限制、独立原创体验题正确答案字段一致。**这只是阅读短练习可玩 + 仿真规格底座，不是完整模考上线。**

下一阶段按“阅读 → 写作 → 听力（各题原声两遍）→ 口语互动 → 成绩报告”完善所有Part和声音播放；第一阶段重点KET/PET for Schools，不把普通作文评分当官方考官成绩。通过完整题库审核后才显示“全真模拟”。

## 3. 生产支付：实测不是猜测

Z890通过root免密SSH连接到正在运行的 `socthink.cn` 正式服务器；正式服务active；PostgreSQL `socthink_billing_prod` 和专用账户存在；商户字段配置完整、Native产品授权标记和定时查单worker启用；`ops/payment/audit_checkout_readiness.py --json` 的唯一标记阻塞为 **NEW_CHARGES_DISABLED**。

实际运行值：`SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=0`。现场公开 `GET /api/access/catalog` 返回 `checkoutAvailable=false`；真实匿名 `POST /api/payments/wechat/checkout` 返回 **HTTP503**、`{"code":"WEB_NATIVE_DISABLED"}`。这个测试不会生成实际订单或扣款，证明新单阻断真实存在，而非登录失败。正式版本 `ed86c88c0c851004701a64ba03fd1ccc46559d19`，说明PR里的新KET/PET页面**尚未部署**。

**当前买家还不能实际付钱**。若要正式开放，需要受控开启唯一新收款开关、确认SKU可交付且回调/查单真实可用，之后由授权买家完成一笔小额真单的 Native下单→扫码支付→微信确认→账本paid→自动权益→下载实际内容→对账。现有PLUS/PRO仍是previewOnly，不得误导。测试中不擅自打开正式收款、也不制造资金交易。

已通过当前会话只读核查，无变更生产服务或密钥。

## 三线优先级

1. 武汉K12：更多地区/年级公开源、提高原版文件与配套答案实际入库比例。
2. 英语：先把KET/PET for Schools做成完整、可核验的分模块模考，再扩展FCE、YLE、雅思等；真实听力、写作、口语不能用普通数学选择题机制代替。
3. 支付：唯一主链恢复新单收款，完成真单验收后再给可交付SKU发布正式购买链接，不新建支付系统或第二本账。
