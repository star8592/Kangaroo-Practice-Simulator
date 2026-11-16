#!/usr/bin/env python3
"""Verify every physical image and derived private PDF plus provenance restrictions."""
from pathlib import Path
from collections import Counter
import hashlib,json,os,re,subprocess
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"data/discovery/jiangsu-2026-zhongkao-media-images-20261101.json"
PRIVATE=Path(os.environ["SOCTHINK_K12_OFFICIAL_ARCHIVE"])/"jiangsu-suzhou-yangzhou-2026"
d=json.loads(MANIFEST.read_text(encoding="utf8"))
assert d["mediaImagePages"]==105
assert d["failedImagePages"]==0
assert d["newImagePagesDownloaded"]+d["alreadyImagePagesShaVerified"]==105
assert d["privateAssembledPdfs"]==21 and d["privateAssembledPdfPages"]==105
assert d["mediaSections"]==21
assert d["physicalPaperCompleteVerified"] is False
assert d["humanPageOrderVerified"] is False
assert d["questionAnswerAlignmentVerified"] is False
assert d["ocrAllPagesVerified"] is False
assert d["commercialRedistributionRightVerified"] is False
assert d["publiclyPublished"] is False
assert d["sourceArticle"].startswith("https://jsnews.jschina.com.cn/")
imgs=d["images"]
assert len(imgs)==105
assert [r["imageIndexInArticle"] for r in imgs]==list(range(1,106))
seen={}
by=Counter()
all_bytes=0
for r in imgs:
    assert r["status"] in {"archived_raw_media_image","already_archived_sha_verified"}
    assert r["sourceUrl"].startswith("https://jcdn.xhby.net/dams-res/")
    assert r["role"] in {"paper","answer"}
    assert r["city"] in {"苏州","扬州"}
    assert re.fullmatch(r"[0-9a-f]{64}",r["sha256"])
    assert not Path(r["fileName"]).is_absolute()
    p=PRIVATE/r["fileName"]
    assert p.is_file()
    with p.open("rb") as f:raw=f.read()
    assert len(raw)==r["bytes"] and hashlib.sha256(raw).hexdigest()==r["sha256"]
    with Image.open(p) as im:
        assert im.format=="PNG" and im.size==(r["width"],r["height"])
        assert im.width>=650 and im.height>=750
        im.verify()
    seen.setdefault(r["sha256"],[]).append(r["fileName"])
    by[(r["city"],r["subject"],r["role"])]+=1
    all_bytes+=len(raw)
assert all_bytes==d["archivedOriginalImageBytes"]
pbytes=0
for group in d["sections"]:
    k=(group["city"],group["subject"],group["role"])
    assert group["status"]=="private_pdf_assembled_pdfinfo_verified"
    assert by[k]==group["mediaPages"]==group["pages"]
    p=PRIVATE/group["fileName"]
    assert p.is_file() and p.stat().st_size==group["bytes"]
    assert hashlib.sha256(p.read_bytes()).hexdigest()==group["sha256"]
    cmd=subprocess.run(["pdfinfo",str(p)],capture_output=True,text=True,timeout=20)
    assert cmd.returncode==0
    m=re.search(r"^Pages:\s*(\d+)",cmd.stdout,re.M)
    assert m and int(m.group(1))==group["pages"]
    pbytes+=p.stat().st_size
suzhou=[x for x in d["sections"] if x["city"]=="苏州"]
yangzhou=[x for x in d["sections"] if x["city"]=="扬州"]
assert len(suzhou)==14 and len(yangzhou)==7
assert len({x["subject"] for x in suzhou})==7 and len({x["subject"] for x in yangzhou})==7
assert sum(x["pages"] for x in suzhou)==65
assert sum(x["pages"] for x in yangzhou)==40
print("JIANGSU_2026_105_MEDIA_IMAGES_SHA_AND_DIMENSIONS_PASS",len(imgs),"bytes",all_bytes)
print("JIANGSU_2026_21_PRIVATE_PDFS_PAGES_AND_SHA_PASS",len(d["sections"]),"bytes",pbytes)
print("SUZHOU_7_PAPERS_AND_7_ANSWERS_PAGE_GROUPS_PASS",len(suzhou))
print("YANGZHOU_7_PAPER_PAGE_GROUPS_PASS",len(yangzhou))
print("DUPLICATE_IMAGE_SHA_GROUPS",sum(len(v)>1 for v in seen.values()))
