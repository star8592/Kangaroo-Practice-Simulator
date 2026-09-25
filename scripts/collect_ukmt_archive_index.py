#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from competition_rights import publication_policy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "private" / "source-registry" / "ukmt_archive_index.json"
BASE = "https://ukmt.org.uk"
SOURCE_ID = "ukmt-official"

def season_url(start: int, page: int = 1) -> str:
    season = f"{start}-{start + 1}"
    base = f"{BASE}/year-of-paper/{season}"
    return base if page == 1 else f"{base}/page/{page}"

def classify(title: str) -> str:
    t = title.lower()
    pairs = [
        ("junior mathematical challenge", "ukmt-jmc"),
        ("intermediate mathematical challenge", "ukmt-imc"),
        ("senior mathematical challenge", "ukmt-smc"),
        ("junior kangaroo", "ukmt-kangaroo"),
        ("primary kangaroo", "ukmt-kangaroo"),
        ("pink kangaroo", "ukmt-kangaroo"),
        ("grey kangaroo", "ukmt-kangaroo"),
        ("senior kangaroo", "ukmt-kangaroo"),
        ("andrew jobbings senior kangaroo", "ukmt-kangaroo"),
        ("british mathematical olympiad", "ukmt-bmo"),
        ("bmo", "ukmt-bmo"),
        ("junior mathematical olympiad", "ukmt-olympiad"),
        ("cayley olympiad", "ukmt-olympiad"),
        ("hamilton olympiad", "ukmt-olympiad"),
        ("maclaurin olympiad", "ukmt-olympiad"),
        ("mathematical olympiad for girls", "ukmt-mog"),
        ("mathematical competition for girls", "ukmt-mcg"),
    ]
    for needle, competition_id in pairs:
        if needle in t:
            return competition_id
    return "ukmt-other"

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--proxy", default=os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy"))
    ap.add_argument("--start-season", type=int, default=1998)
    ap.add_argument("--end-season", type=int, default=2025)
    args = ap.parse_args()

    policy = publication_policy(SOURCE_ID)
    if policy["publicQuestionDisplay"]:
        raise SystemExit("UKMT index must remain non-public under current rights policy")

    session = requests.Session()
    session.headers["User-Agent"] = "MathCompetitionLab metadata indexer/1.0"
    if args.proxy:
        session.proxies.update({"http": args.proxy, "https": args.proxy})

    records = []
    seasons = []
    for start in range(args.start_season, args.end_season + 1):
        season = f"{start}-{start + 1}"
        seen_urls = set()
        found = 0
        for page in range(1, 8):
            url = season_url(start, page)
            response = session.get(url, timeout=60)
            if response.status_code == 404:
                break
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            articles = soup.find_all("article")
            if not articles:
                break
            new_on_page = 0
            for article in articles:
                heading = article.find(["h2", "h3"])
                link = heading.find("a", href=True) if heading else None
                if not heading or not link:
                    continue
                title = heading.get_text(" ", strip=True)
                href = link["href"]
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                new_on_page += 1
                found += 1
                records.append({
                    "season": season,
                    "title": title,
                    "competitionId": classify(title),
                    "resourceUrl": href,
                    "sourceRegistryId": SOURCE_ID,
                    "rightsClass": policy["rightsClass"],
                    "publicQuestionDisplay": False,
                    "collectionMode": "metadata-index-only",
                })
            if new_on_page == 0:
                break
        if found:
            seasons.append(season)

    records.sort(key=lambda x: (x["season"], x["title"]))
    counts = {}
    for item in records:
        key = item["competitionId"]
        counts[key] = counts.get(key, 0) + 1

    payload = {
        "generatedAt": date.today().isoformat(),
        "sourceRegistryId": SOURCE_ID,
        "publicQuestionDisplay": False,
        "seasonRange": [seasons[0], seasons[-1]] if seasons else None,
        "seasonCount": len(seasons),
        "resourceCount": len(records),
        "byCompetitionId": counts,
        "records": records,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(
        f"UKMT_ARCHIVE_INDEX_OK seasons={len(seasons)} "
        f"resources={len(records)} range={payload['seasonRange']} by={counts}"
    )

if __name__ == "__main__":
    main()
