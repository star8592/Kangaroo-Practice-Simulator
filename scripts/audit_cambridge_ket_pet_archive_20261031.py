#!/usr/bin/env python3
"""Audit already-held official KET/PET references; do not re-download content."""
import hashlib,json,re,subprocess
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
PRIVATE=Path("/mnt/disk1/Code/Kangaroo-Practice-Simulator/private/raw-source-archive/2024-2027/language/year-agnostic")
OLD=json.loads((ROOT/"data/discovery/official-original-mass-sweep-20261031.json").read_text(encoding="utf8"))
lookups={}
for e in OLD["files"]:
    if "cambridgeenglish.org" not in e.get("originalUrl",""):continue
    url=e["originalUrl"]
    lookups[urlsplit(url).path.split("/")[-1].lower()]=e
def sha_file(p:Path)->str:
    sha=hashlib.sha256()
    with p.open("rb") as file:
        for b in iter(lambda:file.read(2**20),b""):sha.update(b)
    return sha.hexdigest()
def page_count(p:Path)->int|None:
    try:
        result=subprocess.run(["pdfinfo",str(p)],capture_output=True,text=True,timeout=10)
        m=re.search(r"^Pages:\s*(\d+)",result.stdout,re.M)
        return int(m.group(1)) if m and result.returncode==0 else None
    except (OSError,subprocess.TimeoutExpired):return None
def kind(s):
    if "answer-key" in s:return "official_answer_key"
    if "tapescript" in s:return "official_listening_transcript"
    if "examiner-comment" in s:return "official_speaking_examiner_feedback"
    if "writing-checklist" in s:return "official_writing_rubric_reference"
    if "handbook" in s:return "official_teacher_handbook"
    if "information-for-candidate" in s:return "official_candidate_information"
    if "sample-test" in s:return "official_sample_related_pdf"
    if "guide" in s:return "official_teaching_guide"
    if "activities" in s:return "official_practice_activities"
    return "official_preparation_resource_other"
def main():
    entries=[]
    for level,folder in (("KET","cambridgekey"),("PET","cambridgepet")):
        items=sorted((PRIVATE/folder).glob("*.pdf"))
        for p in items:
            assert p.is_file() and p.stat().st_size>300
            with p.open("rb") as f:
                assert f.read(5)==b"%PDF-",(level,p.name)
            slug=p.name.split("_",1)[-1]
            lookup=lookups.get(slug.lower())
            pages=page_count(p)
            assert pages is not None and pages>0,(level,p.name)
            entries.append({
              "id":hashlib.sha256(p.name.encode()).hexdigest()[:20],
              "level":level,"cefr":"A2" if level=="KET" else "B1",
              "filename":slug,
              "sha256":sha_file(p),
              "bytes":p.stat().st_size,"pdfPageCount":pages,
              "documentType":kind(slug.lower()),
              "publishedSourceUrl":lookup.get("originalUrl") if lookup else None,
              "sourcePage":lookup.get("sourcePage") if lookup else
                    ("https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/preparation/" if level=="KET" else
                     "https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/preparation/"),
              "sourceMatchedByFilename":bool(lookup),
              "originalExamPaperVerified":False,
              "listeningAudioAvailableInThisPdf":False,
              "completeExamMockReady":False,
              "commercialRedistributionAllowed":False,
            })
    result={
      "schemaVersion":1,"auditedOn":"2026-10-31",
      "scope":"Previously archived Cambridge public teacher prep material, not 56 full mock exams",
      "sourceDirectory":"private/raw-source-archive/2024-2027/language/year-agnostic",
      "totalFiles":len(entries),"filesByLevel":dict(Counter(x["level"] for x in entries)),
      "totalBytes":sum(x["bytes"] for x in entries),
      "totalPdfPages":sum(x["pdfPageCount"] for x in entries),
      "kindBreakdown":dict(Counter(x["documentType"] for x in entries)),
      "matchedOfficialSourceUrls":sum(bool(x["sourceMatchedByFilename"]) for x in entries),
      "completeSimulatorExamCount":0,
      "files":entries,
    }
    p=ROOT/"data/discovery/cambridge-ket-pet-audit-20261031.json"
    p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("CAMBRIDGE_LOCAL_AUDIT",result["totalFiles"],result["filesByLevel"],"PDF_PAGES",result["totalPdfPages"],
         "SOURCE_MATCHED",result["matchedOfficialSourceUrls"],"BYTES",result["totalBytes"])
if __name__=="__main__":main()
