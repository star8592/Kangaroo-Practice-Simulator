#!/usr/bin/env python3
"""Checks for conservative XHS keyword rotation and one minimal seven-lane screenshot batch."""
from collections import Counter
from pathlib import Path
import json, os, hashlib

repo=Path(__file__).resolve().parents[1]
plan=json.loads((repo/"data/discovery/xhs-seven-lane-keyword-plan-20261031.json").read_text(encoding="utf-8"))
lanes=plan["lanes"]
assert plan["yearPriority"]==[2027,2026,2025,2024]
assert len(lanes)==7
assert {l["id"] for l in lanes}=={"school","math-competition","language","university","career","professional","interest"}
queries=[q for l in lanes for q in l["queries"]]
assert len(queries)==98
assert len(set(queries))==len(queries)
assert plan["maxPublicSearchQueriesPerHour"]<=4
assert plan["maxPublicSearchQueriesPerRolling24Hours"]<=28
assert plan["minimumBetweenQueriesSeconds"]>=12
assert "captcha_or_slider" in plan["stopConditions"]
print("XHS_KEYWORD_PLAN_PASS",len(lanes),"lanes",len(queries),"unique_queries")
p=repo/"data/discovery/xhs-seven-lane-search-batch-20261031.json"
if p.is_file():
 x=json.loads(p.read_text(encoding="utf-8"))
 assert x["queryCount"]==7
 assert {e["lane"] for e in x["entries"]}=={l["id"] for l in lanes}
 assert all(len(e["sha256"])==64 and e["sizeBytes"]>10000 for e in x["entries"])
 assert all(e["originalPaperDownloaded"] is False and e["commercialSaleAllowed"] is False for e in x["entries"])
 assert all(e["ocrStatus"]=="not_attempted" and e["state"]=="search_results_evidence_only" for e in x["entries"])
 assert "mnt/disk1" not in json.dumps(x)
 print("XHS_INITIAL_SEVEN_LANE_SEARCH_INDEX_PASS",len(x["entries"]))
