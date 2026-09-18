#!/usr/bin/env python3
"""CompetitionBank classifier MVP.
Classifies discovered files by competition/year/grade from filenames."""

import re

KEYWORDS = {
    "Kangaroo": ["kangaroo", "袋鼠"],
    "AMC": ["amc", "american mathematics"],
    "Australian_AMC": ["australian", "澳洲", "australia"],
    "UKMT": ["ukmt"],
}


def classify(name: str):
    text = name.lower()
    result = {"competition": "Unknown", "year": None, "grade": None}
    for comp, words in KEYWORDS.items():
        if any(w in text for w in words):
            result["competition"] = comp
            break
    year = re.search(r"20\d{2}", text)
    if year:
        result["year"] = int(year.group())
    grade = re.search(r"g\s?([1-9]|1[0-2])", text)
    if grade:
        result["grade"] = "G" + grade.group(1)
    return result


if __name__ == "__main__":
    import sys
    print(classify(" ".join(sys.argv[1:])))
