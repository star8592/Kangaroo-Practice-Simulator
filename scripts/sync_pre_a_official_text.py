#!/usr/bin/env python3
import json,re,subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LIB=Path("/mnt/disk1/master_data/Education/Australian_AMC_Library/01_AMT_Official/06_Official_Supplied/Pre_A_Samples")

CONFIG=[
    (1, ROOT/"private/exams/au-amc-pre-a-sample-1.json", LIB/"Sample_1.pdf", range(2,13), range(13,22)),
    (2, ROOT/"private/exams/au-amc-pre-a-sample-2.json", LIB/"Sample_2.pdf", range(2,13), range(13,23)),
]

def page_text(pdf,page):
    return subprocess.check_output(
        ["pdftotext","-f",str(page),"-l",str(page),"-layout",str(pdf),"-"],
        stderr=subprocess.DEVNULL,text=True,errors="ignore"
    )

def split_questions(text):
    matches=list(re.finditer(r"(?m)^\s*(\d{1,2})\.\s+",text))
    out={}
    for i,m in enumerate(matches):
        q=int(m.group(1))
        end=matches[i+1].start() if i+1<len(matches) else len(text)
        block=text[m.end():end]
        # drop answer-choice area / page footer
        cut=re.search(r"(?m)^\s*\(A\)\s*",block)
        if cut: block=block[:cut.start()]
        block=re.sub(r"(?m)^\s*(Questions?\s+\d+.*|\d+\s*)$","",block)
        out[q]=block.strip()
    return out

def clean_en(block):
    lines=[]
    for line in block.splitlines():
        line=re.sub(r"\s+"," ",line).strip()
        if not line: continue
        if line.lower().startswith("pre-a sample questions"): continue
        lines.append(line)
    return re.sub(r"\s+"," "," ".join(lines)).strip()

def clean_zh(block):
    # Keep CJK, digits, common math punctuation, and meaningful all-caps English tokens
    phrase=" ".join(re.findall(r"\b[A-Z]{2,}(?:\s+[A-Z]{2,})+\b",block))
    chunks=re.findall(r"[\u4e00-\u9fff0-9０-９，。？！?、：；（）()＋+－\-×÷＝=<>]+",block)
    text="".join(chunks)
    text=re.sub(r"^[0-9０-９]+","",text)
    if phrase and phrase not in text:
        # Preserve letter-manipulation strings such as the sentence in Sample 2 Q25.
        first_sentence=text
        if "有一个句子" in text:
            text=text.replace("有一个句子","有一个句子："+phrase,1)
        else:
            text=(text+" "+phrase).strip()
    return text.strip()

def collect(pdf,pages,lang):
    out={}; page_map={}
    for p in pages:
        blocks=split_questions(page_text(pdf,p))
        for q,b in blocks.items():
            out[q]=clean_en(b) if lang=="en" else clean_zh(b)
            page_map[q]=p
    return out,page_map

for sample,exam_path,pdf,zh_pages,en_pages in CONFIG:
    zh,zpages=collect(pdf,zh_pages,"zh")
    en,epages=collect(pdf,en_pages,"en")
    data=json.loads(exam_path.read_text())
    missing=[]
    for q in data.get("questions",[]):
        n=int(q["questionNo"])
        if n not in zh or n not in en:
            missing.append(n); continue
        q["stem"]=zh[n]
        q["stemEn"]=en[n]
        q["assetUrlZh"]=q.get("studentAssetUrlZh")
        q["assetUrlEn"]=q.get("studentAssetUrlEn")
        q["assetUrl"]=q.get("studentAssetUrlEn") or q.get("studentAssetUrlZh")
        meta=q.setdefault("sourceMeta",{})
        meta["sourcePageZh"]=zpages[n]
        meta["sourcePageEn"]=epages[n]
        meta["textLayer"]="pdftotext-layout"
    # Symbol-rich questions need explicit text because PDF extraction strips glyphs.
    if sample==1:
        q8=data["questions"][7]
        q8["answer"]="C"
        q8.setdefault("sourceMeta",{})["answerCorrection"]="Supplied answer page says A; original Kangaroo wording requires no-rotation overlay and local option C is the exact segment union. Corrected A -> C on 2026-09-23."
        q20=data["questions"][19]
        q20["stem"]="如图，字母 A、B、C、D、E、F 分别代表6个人。箭头从一个人指向另一个人，表示前者比后者高。例如 B→A 表示 B 比 A 高。请问谁最矮？"
    # Known source-layer quirks / independently verified correction.
    if sample==2:
        q9=data["questions"][8]
        q9["stem"]="两个苹果一共6美分，两个梨一共8美分。一个苹果和一个梨一共多少钱？"
        q9["stemEn"]="Two apples together cost 6 cents. Two pears together cost 8 cents. How much do one apple and one pear cost together?"
        q19=data["questions"][18]
        q19["stem"]="一个立方体的六个面分别标有 ♣、♦、♥、♠、□、○。图中展示了同一个立方体的两种摆放方式。请问 □ 的对面是哪一个符号？"
        q19["stemEn"]="The six faces of a cube are marked ♣, ♦, ♥, ♠, □ and ○. The same cube is shown in two positions. Which symbol is opposite □?"
        q19["answer"]="A"
        q19.setdefault("sourceMeta",{})["answerCorrection"]="Independent cube-adjacency verification: square is opposite circle; corrected D -> A on 2026-09-23."
    if missing:
        raise SystemExit(f"sample {sample} missing questions: {missing}")
    tmp=exam_path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
    tmp.replace(exam_path)
    print(f"PRE_A_SYNC sample={sample} questions={len(data['questions'])} zh={len(zh)} en={len(en)}")
