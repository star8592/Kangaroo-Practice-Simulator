#!/usr/bin/env python3
"""Positive and mutation tests for the production exam-preservation gate."""
import copy
import importlib.util
from pathlib import Path

path = Path(__file__).with_name("guard_release_inventory.py")
spec = importlib.util.spec_from_file_location("release_inventory_guard", path)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

OLD = "a" * 40
NEW = "b" * 40
BASELINE = {
    "ok": True, "deployedSha": OLD, "gitSha": OLD,
    "rawInventory": {
        "papers": 418, "questions": 10868,
        "byCompetition": {"kangaroo": 0, "australian-amc": 87, "maa-amc": 42, "cemc": 49}
    },
    "trainingInventory": {
        "papers": 417, "smartProfiles": 31,
        "byCompetition": {"kangaroo": 239, "australian-amc": 87, "maa-amc": 42, "cemc": 49}
    },
}
CANDIDATE = copy.deepcopy(BASELINE)
CANDIDATE["deployedSha"] = NEW
CANDIDATE["gitSha"] = NEW


def rejected(before, after, target=NEW):
    try:
        guard.compare(before, after, target)
    except guard.InventoryRegression:
        return
    raise AssertionError("Unsafe release candidate was accepted")


assert guard.compare(BASELINE, CANDIDATE, NEW)["trainingPapers"] == 417
assert guard.compare(BASELINE, CANDIDATE, NEW)["rawQuestions"] == 10868

cases = 0
for field, subfield in [
    ("rawInventory", "papers"), ("rawInventory", "questions"),
    ("trainingInventory", "papers"), ("trainingInventory", "smartProfiles"),
]:
    mutated = copy.deepcopy(CANDIDATE)
    mutated[field][subfield] -= 1
    rejected(BASELINE, mutated)
    cases += 1

for section in ["rawInventory", "trainingInventory"]:
    mutated = copy.deepcopy(CANDIDATE)
    mutated[section]["byCompetition"]["cemc"] -= 1
    rejected(BASELINE, mutated)
    cases += 1
    mutated = copy.deepcopy(CANDIDATE)
    del mutated[section]["byCompetition"]["maa-amc"]
    rejected(BASELINE, mutated)
    cases += 1
    mutated = copy.deepcopy(CANDIDATE)
    mutated[section] = None
    rejected(BASELINE, mutated)
    cases += 1

mutated = copy.deepcopy(CANDIDATE)
mutated["deployedSha"] = OLD
rejected(BASELINE, mutated)
cases += 1
mutated = copy.deepcopy(CANDIDATE)
mutated["gitSha"] = OLD
rejected(BASELINE, mutated)
cases += 1
mutated = copy.deepcopy(BASELINE)
mutated["trainingInventory"]["papers"] = 0
rejected(mutated, CANDIDATE)
cases += 1
mutated = copy.deepcopy(BASELINE)
mutated["rawInventory"]["questions"] = 0
rejected(mutated, CANDIDATE)
cases += 1
mutated = copy.deepcopy(CANDIDATE)
mutated["trainingInventory"]["papers"] = True
rejected(BASELINE, mutated)
cases += 1
mutated = copy.deepcopy(CANDIDATE)
mutated["rawInventory"]["byCompetition"]["cemc"] = -1
rejected(BASELINE, mutated)
cases += 1
rejected(BASELINE, CANDIDATE, "not-a-sha")
cases += 1

for invalid in [
    "http://evil.example/api/release", "https://socthink.cn/api/release",
    "http://127.0.0.1:3000/api/grade", "http://localhost:3000/api/release?token=secret",
]:
    try:
        guard.fetch_release(invalid)
    except guard.InventoryRegression:
        pass
    else:
        raise AssertionError("Unsafe inventory source accepted: " + invalid)
    cases += 1

assert "guard_release_inventory.py" in Path(__file__).parents[1].joinpath(
    "ops/release/auto_deploy_server.sh").read_text()
print("RELEASE_INVENTORY_MUTATIONS=PASS positives=2 negatives=" + str(cases)
      + " production_baseline=418/10868/417 gate_wired=PASS")
