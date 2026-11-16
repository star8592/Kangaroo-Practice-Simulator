#!/usr/bin/env python3
"""Neutral OCR engine scoring over paired human-reviewed gold and predictions (JSONL).

No OCR model inference, download, or credentials. Evaluates outputs from any model,
including an optional ChatGPT/manual run, under identical ground truth.
"""
from __future__ import annotations
import argparse
from collections import defaultdict, Counter
import json
import math
import re
from pathlib import Path
from difflib import SequenceMatcher


def read_jsonl(path: Path) -> list[dict]:
    records=[]
    for line_no,line in enumerate(path.read_text(encoding="utf-8").splitlines(),1):
        if not line.strip():continue
        item=json.loads(line)
        if not isinstance(item,dict):raise ValueError(f"{path}:{line_no}: expected object")
        records.append(item)
    return records


def edit_distance(a: str,b: str) -> int:
    n,m=len(a),len(b)
    if n < m:a,b=b,a;n,m=m,n
    previous=list(range(m+1))
    for i,ch_a in enumerate(a,1):
        current=[i]+[0]*m
        for j,ch_b in enumerate(b,1):
            current[j]=min(current[j-1]+1,previous[j]+1,previous[j-1]+(ch_a!=ch_b))
        previous=current
    return previous[m]


def norm_text(s: str) -> str:
    # OCR transcription: ignore only layout spaces; retain all digits, sign,
    # punctuation, question order, math delimiters and original Chinese.
    return re.sub(r"\s+","",s).replace("\u00a0","")


def math_canonical_text(text: str) -> str:
    """Limited syntax equivalences, NOT arithmetic reasoning or OCR corrections.

    Retains digits and operators; converts LaTeX spelling and typographic
    variants representing the same math into one comparable form.
    """
    s=text
    s=re.sub(r"\\\((.*?)\\\)",lambda m:m.group(1),s,flags=re.DOTALL)
    s=re.sub(r"\\frac\{(\d+)\}\{(\d+)\}",lambda m:m.group(1)+"/"+m.group(2),s)
    s=re.sub(r"\\sqrt\{([^{}]+)\}",lambda m:"√"+m.group(1),s)
    for latex,symbol in (("\\times","×"),("\\div","÷"),("\\neq","≠"),
                         ("\\leq","≤"),("\\geq","≥")):
        s=s.replace(latex,symbol)
    for exp,symbol in (("^2","²"),("^3","³")):
        s=s.replace(exp,symbol)
    return norm_text(s).translate(str.maketrans({"（":"(", "）":")"}))


def insertion_ratio(gold: str,pred: str) -> float:
    ops=SequenceMatcher(None,gold,pred,autojunk=False).get_opcodes()
    added=sum(j2-j1 for action,i1,i2,j1,j2 in ops if action in ("insert","replace"))
    # Not a semantic hallucination score, only a false-addition proxy.
    return added/max(1,len(gold))


def latex_norm(s: str) -> str:
    return re.sub(r"\s+","",s).replace(r"\left","").replace(r"\right","")


def digits(s: str) -> list[str]:
    return re.findall(r"\d+(?:\.\d+)?",s)


def score_one(gold: dict, pred: dict) -> dict:
    expected=norm_text(gold["text"])
    seen=norm_text(pred["text"])
    if not expected:raise ValueError("Reference must not be empty")
    dist=edit_distance(expected,seen)
    canonical_gold=math_canonical_text(gold["text"])
    canonical_pred=math_canonical_text(pred["text"])
    canonical_distance=edit_distance(canonical_gold,canonical_pred)
    dgold=digits(expected)
    dpred=digits(seen)
    symbols=gold.get("critical_symbols",[])
    if not isinstance(symbols,list):raise ValueError("critical_symbols must be list")
    # Keep multiplicities: e.g. three minus signs must remain three.
    critical_missing=sum(max(0,expected.count(sym)-seen.count(sym)) for sym in set(symbols))
    ref_formulas=gold.get("formulas",[])
    pred_formulas=pred.get("formulas",[])
    equal=sum(1 for a,b in zip(ref_formulas,pred_formulas) if latex_norm(a)==latex_norm(b))
    return {
        "category":gold["category"],
        "cer_edits":dist,"cer_chars":len(expected),
        "math_canonical_edits":canonical_distance,"math_canonical_chars":len(canonical_gold),
        "numeric_exact":dgold==dpred,
        "math_canonical_numeric_exact":digits(canonical_gold)==digits(canonical_pred),
        "critical_missing":critical_missing,
        "critical_total":sum(expected.count(sym) for sym in set(symbols)),
        "formula_exact":equal,"formula_total":len(ref_formulas),
        "insertion_ratio_proxy":insertion_ratio(expected,seen),
        "latency_ms":pred.get("latency_ms"),
        "human_reviewed":gold.get("human_reviewed",False),
        "has_unreadable_source":gold.get("has_unreadable_source",False)
    }


def analyze(gold_rows: list[dict], prediction_rows: list[dict]) -> dict:
    gold={}
    for r in gold_rows:
        if not r.get("id") or not r.get("category") or "text" not in r:
            raise ValueError("Each gold row requires id, category, text")
        if r["id"] in gold:raise ValueError("Duplicate ground truth id: "+r["id"])
        gold[r["id"]]=r
    predictions=defaultdict(dict)
    for p in prediction_rows:
        if not p.get("engine") or not p.get("id") or "text" not in p:
            raise ValueError("Each prediction requires engine, id, text")
        if p["id"] not in gold:
            raise ValueError(f"Unknown gold ID: {p['id']}")
        if p["id"] in predictions[p["engine"]]:
            raise ValueError(f"Duplicate prediction for {p['engine']}: {p['id']}")
        predictions[p["engine"]][p["id"]]=p
    output={}
    for engine,preds in sorted(predictions.items()):
        rows=[]
        for gid in gold:
            if gid not in preds:continue
            rows.append((gid,score_one(gold[gid],preds[gid])))
        if not rows:continue
        vals=[x for _,x in rows]
        n=len(vals)
        total_chars=sum(v["cer_chars"] for v in vals)
        by_cat={}
        for category in sorted({v["category"] for v in vals}):
            sub=[v for v in vals if v["category"]==category]
            by_cat[category]={
                "samples":len(sub),
                "cer":sum(x["cer_edits"] for x in sub)/sum(x["cer_chars"] for x in sub),
                "numeric_exact_rate":sum(x["numeric_exact"] for x in sub)/len(sub),
            }
        lat=[v["latency_ms"] for v in vals if isinstance(v["latency_ms"],(int,float)) and v["latency_ms"]>=0]
        total_ft=sum(v["formula_total"] for v in vals)
        total_crit=sum(v["critical_total"] for v in vals)
        output[engine]={
            "samples":n,"coverage":n/len(gold),
            "overall_cer":sum(v["cer_edits"] for v in vals)/total_chars,
            "math_canonical_cer":sum(v["math_canonical_edits"] for v in vals)/sum(v["math_canonical_chars"] for v in vals),
            "numeric_exact_rate":sum(v["numeric_exact"] for v in vals)/n,
            "math_canonical_numeric_exact_rate":sum(v["math_canonical_numeric_exact"] for v in vals)/n,
            "formula_exact_rate":(sum(v["formula_exact"] for v in vals)/total_ft if total_ft else None),
            "critical_symbol_recall":(1-sum(v["critical_missing"] for v in vals)/total_crit if total_crit else None),
            "insertion_ratio_proxy_avg":sum(v["insertion_ratio_proxy"] for v in vals)/n,
            "latency_ms_mean":sum(lat)/len(lat) if lat else None,
            "unreadable_source_count":sum(v["has_unreadable_source"] for v in vals),
            "human_reviewed_reference_count":sum(v["human_reviewed"] for v in vals),
            "by_category":by_cat,
            "error_samples":sorted([
                {"id":k,"category":v["category"],"cer":v["cer_edits"]/v["cer_chars"],
                 "numeric_exact":v["numeric_exact"],
                 "critical_missing":v["critical_missing"]}
                for k,v in rows
            ],key=lambda x:x["cer"],reverse=True)[:30],
        }
    if not output:
        raise ValueError("No comparable model predictions supplied")
    counts=[(name,v["samples"]) for name,v in output.items()]
    return {
        "schemaVersion":1,
        "referenceCount":len(gold),
        "engines":output,
        "pairingWarning":"Engine scores with different sample coverage are not comparable. Compare only paired identical test IDs.",
        "quantitiesWarning":"CER and insertion_ratio_proxy are text-difference metrics, not proof of semantic hallucination or human approval."
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--gold",type=Path,required=True)
    p.add_argument("--predictions",type=Path,required=True)
    p.add_argument("--out",type=Path)
    args=p.parse_args()
    result=analyze(read_jsonl(args.gold),read_jsonl(args.predictions))
    text=json.dumps(result,ensure_ascii=False,indent=2)
    if args.out:
        args.out.parent.mkdir(parents=True,exist_ok=True)
        args.out.write_text(text+"\n",encoding="utf-8")
    print(text)


if __name__=="__main__":main()
