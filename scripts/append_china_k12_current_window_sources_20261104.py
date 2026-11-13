#!/usr/bin/env python3
"""Idempotently append verified source metadata; never download or archive third-party papers."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "data/discovery/china-k12-current-window-external-leads-20261104.json"
OBSERVED = "2026-11-04T17:27:09+00:00"


def upsert(items: list[dict], item: dict, key: str = "id") -> None:
    for i, current in enumerate(items):
        if current.get(key) == item[key]:
            items[i] = item
            return
    items.append(item)


def main() -> None:
    data = json.loads(FILE.read_text(encoding="utf8"))
    data["observedAtUtc"] = OBSERVED
    records = data["records"]

    # Same Shiyan exam event, three subject leads. Do not split this into three exam events.
    shiyan = next(x for x in records if x["id"] == "hubei-shiyan-dongfeng-g12-biology-2026-10")
    shiyan["subjects"] = ["语文", "物理", "生物"]
    shiyan["actualExamDate"] = "2026-10-16"
    shiyan["actualExamDateEvidence"] = "第三方语文试题预览直接展示卷头日期；非学校官网原件，待原卷复核。"
    shiyan["sourceUrls"] = list(dict.fromkeys(shiyan["sourceUrls"] + [
        "https://jx.panqjy.cn/doc-18912094.html",
        "https://www.ht88.com/downinfo/1035484.html"
    ]))
    shiyan["schoolIdentityStatus"] = "third_party_title_cross_source_correlated"
    shiyan["downloadStatus"] = "membership_or_points_gates_not_attempted"
    shiyan["evidence"]["crossSourceHeaderEvidence"] = {
        "sourceUrl": "https://www.ht88.com/downinfo/1035484.html",
        "subject": "语文",
        "fileFormat": "DOCX",
        "fileSizeLabel": "57 KB",
        "pagePublicationDate": "2026-10-26T09:06:45",
        "examHeaderDate": "2026-10-16",
        "examHeaderDuration": "150分钟",
        "examHeaderScore": 150,
        "previewTextVisible": True,
        "downloadGate": "2 download points per file; not attempted",
        "rightsStatus": "unknown"
    }
    shiyan["evidence"]["additionalSubjectEvidence"] = [
        {
            "sourceUrl": "https://jx.panqjy.cn/doc-18912094.html",
            "subject": "物理",
            "listedFiles": 2,
            "paperAndAnswerListed": True,
            "previewCounter": "1/7",
            "downloadGate": "membership_or_points_required; not attempted",
            "rightsStatus": "unknown"
        },
        {
            "sourceUrl": "https://jx.panqjy.cn/doc-18912083.html",
            "subject": "生物",
            "listedFiles": 2,
            "paperAndAnswerListed": True,
            "previewCounter": "1/9",
            "downloadGate": "membership_required; not attempted",
            "rightsStatus": "unknown"
        }
    ]
    shiyan["paperFileDownloaded"] = False
    shiyan["answerFileDownloaded"] = False
    shiyan["audioFileDownloaded"] = False
    shiyan["allPagesChecked"] = False
    shiyan["archiveStatus"] = "not_archived"
    shiyan["archivedBytes"] = 0
    shiyan["rightsStatus"] = "unknown"
    shiyan["state"] = "third_party_lead_only"

    new_records = [
        {
            "id": "hubei-shashi-high3-2026-10",
            "eventGroupId": "hubei-shashi-high3-2026-10-stage",
            "queueClass": "paper_candidate",
            "regionKey": "hubei_other_cities",
            "province": "湖北省",
            "city": "荆州市",
            "school": "湖北省沙市中学",
            "schoolIdentityStatus": "third_party_title_only",
            "grade": "高三（2027届）",
            "subjects": ["历史", "地理", "政治", "生物", "英语", "语文"],
            "eventLabel": "湖北省沙市中学2026—2027学年高三上学期10月阶段检测",
            "actualExamDate": None,
            "publicationDate": "2026-10-31",
            "sourceType": "third_party_resource_platform",
            "sourceUrls": ["https://www.yishijuan.com/mobile/gaozhongshijuan/2645.html"],
            "evidence": {
                "listedSubjects": ["历史", "地理", "政治", "生物", "英语", "语文"],
                "listedFiles": 6,
                "shareProvider": "百度网盘",
                "publicShareCode": "6677",
                "note": "页面仅列出文件名并提供公开分享入口；没有取得原件字节、卷头、页数或授权。"
            },
            "downloadStatus": "public_share_link_listed_not_fetched",
            "paperFileDownloaded": False,
            "answerFileDownloaded": False,
            "audioFileDownloaded": False,
            "allPagesChecked": False,
            "archiveStatus": "not_archived",
            "archivedBytes": 0,
            "rightsStatus": "unknown",
            "state": "third_party_lead_only"
        },
        {
            "id": "hubei-chutian-alliance-g12-2026-10",
            "eventGroupId": "hubei-chutian-alliance-g12-2026-10-stage",
            "queueClass": "paper_candidate",
            "regionKey": "hubei_other_cities",
            "province": "湖北省",
            "city": None,
            "school": None,
            "schoolIdentityStatus": "alliance_label_only",
            "grade": "高三（2027届）",
            "subjects": ["化学", "历史", "地理", "思想政治", "数学", "物理", "生物", "英语", "语文"],
            "eventLabel": "湖北楚天协作体2026—2027学年高三上学期10月阶段检测",
            "actualExamDate": None,
            "publicationDate": "2026-10-31",
            "sourceType": "third_party_resource_platform",
            "sourceUrls": ["https://www.yishijuan.com/mobile/gaozhongshijuan/2644.html"],
            "evidence": {
                "listedSubjects": ["化学", "历史", "地理", "思想政治", "数学", "物理", "生物", "英语", "语文"],
                "listedFiles": 17,
                "paperAndAnswerComponentsListed": True,
                "shareProvider": "百度网盘",
                "publicShareCode": "6677",
                "note": "全科清单与答案名称可见；组织学校、实际考试日、原卷卷头和字节均未核实。"
            },
            "downloadStatus": "public_share_link_listed_not_fetched",
            "paperFileDownloaded": False,
            "answerFileDownloaded": False,
            "audioFileDownloaded": False,
            "allPagesChecked": False,
            "archiveStatus": "not_archived",
            "archivedBytes": 0,
            "rightsStatus": "unknown",
            "state": "third_party_lead_only"
        },
        {
            "id": "anhui-wanyu-tianyi-g12-2026-10",
            "eventGroupId": "anhui-wanyu-tianyi-g12-2026-10-joint",
            "queueClass": "paper_candidate",
            "regionKey": "anhui",
            "province": "安徽省",
            "city": None,
            "school": None,
            "schoolIdentityStatus": "alliance_label_only",
            "grade": "高三（2027届）",
            "subjects": ["化学", "历史", "地理", "政治", "数学", "物理", "生物", "英语", "语文"],
            "eventLabel": "安徽天一皖豫名校联盟2026—2027学年高三上学期10月联考",
            "actualExamDate": None,
            "publicationDate": "2026-10-30",
            "sourceType": "third_party_resource_platform",
            "sourceUrls": ["https://www.yishijuan.com/mobile/gaozhongshijuan/2632.html"],
            "evidence": {
                "listedSubjects": ["化学", "历史", "地理", "政治", "数学", "物理", "生物", "英语", "语文"],
                "listedFiles": 14,
                "shareProvider": "百度网盘",
                "publicShareCode": "6677",
                "note": "页面列出分科试卷/答案文件名；未访问网盘、未下载、未核卷头和实际考试日期。"
            },
            "downloadStatus": "public_share_link_listed_not_fetched",
            "paperFileDownloaded": False,
            "answerFileDownloaded": False,
            "audioFileDownloaded": False,
            "allPagesChecked": False,
            "archiveStatus": "not_archived",
            "archivedBytes": 0,
            "rightsStatus": "unknown",
            "state": "third_party_lead_only"
        },
        {
            "id": "zhejiang-2026-provincial-zhongkao",
            "eventGroupId": "zhejiang-2026-provincial-zhongkao",
            "queueClass": "paper_candidate",
            "regionKey": "zhejiang",
            "province": "浙江省",
            "city": "全省11个设区市",
            "school": None,
            "schoolIdentityStatus": "provincial_exam_policy_verified_paper_source_third_party",
            "grade": "初三毕业年级",
            "subjects": ["语文", "数学", "英语", "科学", "社会"],
            "eventLabel": "2026年浙江省初中学业水平考试（五科省级统一命题）",
            "actualExamDate": "2026-06-20/21",
            "publicationDate": None,
            "sourceObservedAtUtc": OBSERVED,
            "sourceType": "third_party_resource_platform",
            "sourceUrls": ["https://zhekaotong.cn/download/2026-zhejiang-math"],
            "evidence": {
                "pageClaim": "2026年浙江省中考数学真题，全省统考，适用11个地市",
                "policyCrossCheck": [
                    "https://zlzx.zjamr.zj.gov.cn/news/330800145/6467.html",
                    "https://news.hangzhou.com.cn/zjnews/content/2026-04/02/content_9200321.htm"
                ],
                "policyFinding": "浙江2024年起语文、数学、英语、科学、社会五科省级统一命题；2026年考试日期为6月20日至21日。",
                "visiblePreview": "仅显示数学试卷开头部分，未覆盖完整试卷。",
                "listedFiles": [
                    {"kind": "original_paper", "format": "DOCX", "sizeLabel": "0.9 MB"},
                    {"kind": "answer_and_analysis", "format": "DOCX", "sizeLabel": "2.5 MB"}
                ],
                "directDownloadEndpoints": [
                    {
                        "url": "https://zhekaotong.cn/api/papers-archive/files/40f93040-09f2-4b19-bcf3-0a98148b5920/download",
                        "webFetchStatus": 403,
                        "z890NormalHeadStatus": 403
                    },
                    {
                        "url": "https://zhekaotong.cn/api/papers-archive/files/6854a79b-168e-474e-a8b6-3b8b3d2f7dd7/download",
                        "webFetchStatus": 403,
                        "z890NormalHeadStatus": 403
                    }
                ],
                "otherSubjectPages": {
                    "语文": "https://zhekaotong.cn/download/2026-zhejiang-chinese",
                    "英语": "https://zhekaotong.cn/download/2026-zhejiang-english",
                    "科学": "https://zhekaotong.cn/download/2026-zhejiang-science",
                    "社会": "https://zhekaotong.cn/download/2026-zhejiang-social"
                },
                "otherSubjectPageStatus": "fetch_timeouts; no retry or bypass",
                "rightsStatus": "unknown"
            },
            "downloadStatus": "download_endpoints_http_403_no_bypass",
            "paperFileDownloaded": False,
            "answerFileDownloaded": False,
            "audioFileDownloaded": False,
            "allPagesChecked": False,
            "archiveStatus": "not_archived",
            "archivedBytes": 0,
            "rightsStatus": "unknown",
            "state": "third_party_lead_only"
        },
        {
            "id": "liaoning-shenyang-no2-g10-2026-10",
            "eventGroupId": "liaoning-shenyang-no2-g10-2026-10-monthly",
            "queueClass": "paper_candidate",
            "regionKey": "liaoning",
            "province": "辽宁省",
            "city": "沈阳市",
            "school": "沈阳市第二中学",
            "schoolIdentityStatus": "third_party_title_only",
            "grade": "高一（2026级）",
            "subjects": ["思想政治", "语文", "英语", "物理", "数学", "生物", "化学", "地理"],
            "eventLabel": "沈阳二中2026—2027学年高一上学期10月月考",
            "actualExamDate": None,
            "publicationDate": "2026-11-03T15:57:58",
            "sourceType": "public_education_resource_article",
            "sourceUrls": ["https://www.yeyulingfeng.com/a/1302429.html"],
            "evidence": {
                "listedSubjects": ["思想政治", "语文", "英语", "物理", "数学", "生物", "化学", "地理"],
                "listedFiles": 8,
                "englishAudioFilenameListed": "2026.10沈阳二中高一上学期10月月考英语听力.mp3",
                "fileAccess": "article image lists file names only; no public direct file URL",
                "note": "音频仅文件名线索，未取得音频字节、时长、声道或内容。"
            },
            "downloadStatus": "public_article_filelist_only_no_direct_file_url",
            "paperFileDownloaded": False,
            "answerFileDownloaded": False,
            "audioFileDownloaded": False,
            "allPagesChecked": False,
            "archiveStatus": "not_archived",
            "archivedBytes": 0,
            "rightsStatus": "unknown",
            "state": "third_party_lead_only"
        },
        {
            "id": "wuhu-grade9-physics-chemistry-practical-2026",
            "eventGroupId": "wuhu-grade9-physics-chemistry-practical-2026",
            "queueClass": "official_attachment",
            "regionKey": "anhui",
            "province": "安徽省",
            "city": "芜湖市",
            "school": None,
            "schoolIdentityStatus": "official_city_education_bureau_notice",
            "grade": "初三毕业年级",
            "subjects": ["物理", "化学"],
            "eventLabel": "2026年芜湖市初中学业水平理化实验操作考试",
            "actualExamDate": None,
            "scheduledExamDate": "2026-05-13/17",
            "publicationDate": "2026-05-08T09:00:00",
            "sourceType": "official_government_notice",
            "sourceUrls": ["https://jyj.wuhu.gov.cn/xwzx/tzgg/8927379.html"],
            "sourceAuthorityStatus": "official_notice_confirmed",
            "evidence": {
                "attachmentLabels": [
                    "芜湖市2026年初中学业水平物理实验操作考试试题.pdf",
                    "芜湖市2026年初中学业水平化学实验操作考试试题.pdf"
                ],
                "attachmentUrls": [
                    "https://jyj.wuhu.gov.cn/group4/M00/07/84/rBwdT2n8VIyAEakxAAPRZ3vN2Fc585.pdf",
                    "https://jyj.wuhu.gov.cn/group4/M00/07/84/rBwdT2n8VIyAXBRKAAQiyvy3RYM604.pdf"
                ],
                "normalPublicHeadResults": {
                    "physics": "TLS handshake timeout",
                    "chemistry": "HTTP 403"
                },
                "webFetchResults": {
                    "physics": 403,
                    "chemistry": 403
                },
                "note": "一次正常公开HEAD/GET尝试失败后停止；未换域名、代理、凭证或绕过。"
            },
            "downloadStatus": "official_attachment_tls_timeout_and_403_no_bypass",
            "paperFileDownloaded": False,
            "answerFileDownloaded": False,
            "audioFileDownloaded": False,
            "allPagesChecked": False,
            "archiveStatus": "not_archived",
            "archivedBytes": 0,
            "rightsStatus": "not_stated",
            "state": "official_source_confirmed_attachment_bytes_unavailable"
        }
    ]
    for item in new_records:
        upsert(records, item)

    event_watch = {
        "id": "wuhan-2026-autumn-midterm-schedule-watch",
        "sourceUrls": [
            "https://www.yeyulingfeng.com/a/1259000.html",
            "https://www.yeyulingfeng.com/a/1269633.html",
            "https://www.jf900.com/news/9552.html"
        ],
        "sourceType": "third_party_local_education_information_and_tutoring_pages",
        "publicationDates": ["2026-10-27T11:55:36", "2026-10-28T21:19:34"],
        "reportedDates": {
            "primary": "some schools reported 2026-11-01/05; other schools 2026-11-23/28",
            "juniorHigh": "multiple district/school schedules reported 2026-11-03/13",
            "seniorHigh": "some schools reported 2026-11-03/13"
        },
        "paperFilesFound": 0,
        "state": "schedule_watch_only_not_exam_paper",
        "verification": "third-party schedule summary only; confirm the exact school, exam event and date from school notices or original paper headers."
    }
    upsert(data["eventWatch"], event_watch)

    data["rules"] = list(dict.fromkeys(data["rules"] + [
        "2026浙江中考五科省级统一命题有政策交叉证据；第三方下载端点403仍不计原卷。",
        "武汉11月期中安排页面仅作事件监控；没有卷头和原件字节不得升级为试卷。",
        "同一考试事件多学科来源合并到一个eventGroupId；学科文件数不等于考试事件数。"
    ]))

    # All records in this queue are leads until bytes, integrity and rights are independently checked.
    assert len({x["eventGroupId"] for x in records}) == len(records), "duplicate eventGroupId"
    for x in records:
        assert x["paperFileDownloaded"] is False
        assert x["answerFileDownloaded"] is False
        assert x["audioFileDownloaded"] is False
        assert x["archiveStatus"] == "not_archived"
        assert x["archivedBytes"] == 0
    assert all(v == 0 for v in data["collectionMetrics"].values())
    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print("K12_SOURCE_BATCH_APPEND=PASS", "events", len(records), "event_watch", len(data["eventWatch"]))
    print("K12_NEW_ARCHIVED_BYTES=0 VERIFIED_PAPERS=0 VERIFIED_ANSWERS=0 VERIFIED_AUDIO=0")


if __name__ == "__main__":
    main()
