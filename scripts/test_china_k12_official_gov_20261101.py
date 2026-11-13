#!/usr/bin/env python3
"""No document in the gov archive may claim OCR, full question validation, or resale."""
from pathlib import Path
import json
from urllib.parse import urlsplit
root=Path(__file__).resolve().parents[1]
d=json.loads((root/"data/discovery/china-k12-official-gov-verified-20261101.json").read_text())
docs=d["documents"]
assert len(docs)==d["verifiedPdfCount"]>=16
assert sum(x["bytes"] for x in docs)==d["verifiedPdfBytes"]
assert sum(x["pages"] for x in docs)==d["verifiedPdfPages"]
assert len({x["originalUrl"] for x in docs})==len(docs)
assert d["pageByPageContentVerifiedCount"]==d["structuredExamCount"]==d["publicRedistributionLicenseVerifiedCount"]==d["saleEnabledCount"]==0
assert all(x["status"]=="gov_original_pdf_bytes_sha_and_pdf_pages_verified" for x in docs)
assert all(x["pageContentHumanReviewed"] is False and x["answerMatchedToPaperByQuestion"] is False for x in docs)
assert all(x["licensedForPublicRedistribution"] is False and x["saleEnabled"] is False for x in docs)
assert all(urlsplit(x["sourcePage"]).hostname in {"jyj.fuzhou.gov.cn","jdz.gov.cn"} for x in docs)
assert all(x["bytes"]>100 and x["pages"]>=1 and len(x["sha256"])==64 for x in docs)
assert d["imageOnlyFirstPageCount"]>=15
assert sum(d["verifiedPdfByProvince"].values())==len(docs)
assert any(x["roleFromOfficialLabel"]=="listening_transcript_not_audio" for x in docs)
print("K12_GOV_SOURCE_SHA_CONTENT_STATUS_TEST=PASS",len(docs))
