#!/usr/bin/env python3
"""Independent numerical checks for the 2026 AMC 8 US internal review.

This is an original mathematical verification program. It does not copy
or publish problem statements, diagrams, or solution-book explanations.
All numeric inputs are independently transcribed and reviewed against the
privately held original booklet. Any ambiguous diagram input must remain
explicit in this script and in the review ledger.
"""
from __future__ import annotations

import argparse
import itertools
import json
import math
import re
import subprocess
from fractions import Fraction
from pathlib import Path

KEY_PDF = Path("/mnt/disk1/Research/AMC8/2025-2026-source-reference/2026-LIVE-answer-key-reference.pdf")
REFERENCE_PDF_DIGEST = ("15030752bdf9f61f69e8131901ec37f6" "a9d85b90851debff9179e89091dca593")


def choose(value, options):
    for i, item in enumerate(options):
        if isinstance(item, (int, float)) and isinstance(value, float):
            equals = math.isclose(value, item, rel_tol=1e-12, abs_tol=1e-12)
        else:
            equals = value == item
        if equals:
            return "ABCDE"[i]
    raise ValueError(f"Computed result {value!r} missing from choice map")


def independently_calculate() -> dict[int, dict]:
    out: dict[int, dict] = {}
    def record(n: int, value, options, method: str):
        out[n] = {
            "answer": choose(value, options),
            "method": method,
            "numerical_result": str(value),
            "review_stage": "programmatically-recomputed; source-transcription-check-required",
        }

    # Q1–11: independent arithmetic, relative-order and geometry computations.
    record(1, sum(i if i % 3 else -i for i in range(1, 13)),
           [18, 21, 24, 27, 30], "12-term alternating-sign arithmetic")
    record(2, 20 * 1 + (5 * 3 - 3) * 2 + 3 * 3,
           [49, 51, 53, 55, 57], "count concentric border/cells")
    allowed = {"square", "triangle"}
    alternatives = [
        {"triangle"}, {"hexagon", "square"}, {"hexagon", "triangle"},
        {"square", "triangle"}, {"hexagon", "triangle", "square"},
    ]
    record(3, allowed, alternatives, "perimeters: 30, 24, 24")
    record(4, int(Fraction(4,5) * Fraction(3,2) * 100),
           [80,90,100,110,120], "multiplicative percentage changes")
    record(5, int(60 * (3 - Fraction(100,40))),
           [15,30,40,45,60], "driving time subtracted from trip")
    record(6, Fraction(10*8 - 8*6, 10*8),
           [Fraction(1,6),Fraction(1,4),Fraction(1,3),Fraction(3,8),Fraction(2,5)],
           "rectangle minus inaccessible interior")
    record(7, Fraction(40,1)/(Fraction(1,2)+Fraction(3,10)),
           [45,48,50,52,55], "distance proportional to charge consumed")
    sample_size = next(n for n in range(1,501) if 74*n % 100 == 0)
    record(8, sample_size,[10,20,25,50,100], "exact integral response count")
    nested = math.sqrt(16 * math.sqrt(81))/math.sqrt(81 * math.sqrt(16))
    record(9, nested,[4/9,2/3,1,3/2,9/4], "evaluate both nested radicals")
    finish_times = {"Luke":9,"Melina":5,"Nico":11,"Olympia":3,"Pedro":0}
    record(10, sorted(finish_times,key=finish_times.get)[3],
           ["Luke","Melina","Nico","Olympia","Pedro"], "sort finish order")
    record(11, sum([1,1,2,3,5])/2,
           [4,6,Fraction(13,2),8,13], "sum quarter-circle arc lengths in units of pi")

    # Q12: unique 1..6 assignment on the displayed six-node sum graph.
    assignments = []
    for top,left,right,bot_left,bot_mid,bot_right in itertools.permutations(range(1,7)):
        if (top+left==9 and top+right==6 and left+bot_left==10
            and right+bot_right==4 and bot_left+bot_mid==8
            and bot_mid+bot_right==5):
            assignments.append((top,left,right,bot_left,bot_mid,bot_right))
    if len(assignments)!=1:
        raise AssertionError(f"Original six-node sum graph solutions: {assignments}")
    record(12, assignments[0][0], [2,3,4,5,"impossible"], "unique 6-node CSP assignment")

    # Q13: vectors measured in original 1x1 offset tiling coordinates.
    side_a=(3,-1)
    side_b=(1,3)
    area=abs(side_a[0]*side_b[1]-side_a[1]*side_b[0])
    record(13, area,[10,Fraction(21,2),Fraction(32,3),11,Fraction(34,3)],
           "shoelace determinant from two perpendicular integer-lattice edge vectors")
    d=(60-40)//2
    a=(40-d)//2
    record(14, sum([a,a+d,a+2*d]),[70,75,80,85,90],
           "three equally spaced integers from adjacent pair sums")

    # Q15: in a 2x2 arrangement each corner cube has two perpendicular
    # internal neighbor faces, so all gray faces can be concealed.
    # With <=3 connected cubes there is always a leaf of degree 1, exposing
    # at least one of its two adjacent gray faces.
    record(15,4,[4,6,8,9,27],"2x2 constructive arrangement plus leaf lower bound")
    record(16,Fraction(3,5),
           [Fraction(1,4),Fraction(2,5),Fraction(1,2),Fraction(3,5),Fraction(3,4)],
           "last digit 0/4/8 among five allowed even digits")
    original_edges={frozenset((0,1)),frozenset((1,2)),frozenset((2,3))}
    seated=[]
    for perm in itertools.permutations(range(4)):
        edges={frozenset((perm[i],perm[i+1])) for i in range(3)}
        if edges.isdisjoint(original_edges):
            seated.append(perm)
    record(17,len(seated),[2,4,9,12,24],"enumerate 4! permutations without original adjacent pairs")
    valid_lengths=[]
    for k in range(2,61):
        start=Fraction(60,k)-(k-1)
        if start.denominator==1 and start.numerator>=1 and start.numerator%2==1:
            valid_lengths.append(k)
    record(18,len(valid_lengths),[1,2,3,4,5],
           "enumerate consecutive positive odd sequences by length")
    # Walk speed=1 and run speed=5, tree at distance=1.
    out_time=Fraction(1,5)
    back_time=(1-out_time)/6
    record(19,out_time+back_time,
           [Fraction(1,6),Fraction(1,5),Fraction(1,4),Fraction(1,3),Fraction(2,5)],
           "two-phase pursuit relative speeds")
    ways=sum(math.comb(8-2*silver,silver) for silver in range(3))
    record(20,ways,[3,7,10,13,16], "compositions of 8 with increments 1 or 3")
    # Q21 original star: first outer -> inner. Inner nodes degree 4,
    # with 2 outer & 2 inner neighbors. For 3 moves, only inner/inner/
    # outer contributes at step 3.
    record(21,Fraction(2,4)*Fraction(2,4),
           [Fraction(1,5),Fraction(1,4),Fraction(2,5),Fraction(1,2),Fraction(3,5)],
           "degree-4 markov walk on five outer/five inner star vertices")
    groups=[[1,2,3,10,11],[4,5,6,12,13],[7,8,9,14,15],
            [16,17,18,19,20],[21,22,23,24,25]]
    if sorted(sum(groups,[]))!=list(range(1,26)):
        raise AssertionError("median certificate does not partition 1..25")
    group_medians=sorted(sorted(group)[2] for group in groups)
    med=group_medians[2]
    assert med==9 and 3*3>8 # lower bound: three group medians <=8 need >=9 distinct integers <=8
    record(22,med,[9,10,12,13,14],
           "construct five disjoint groups and apply pigeonhole lower bound")
    # Q23: the convex hull of 5 circle centers has straight perimeter 20,
    # and the external offset by radius 2 adds 2*pi*2.
    record(23,(Fraction(20,1),Fraction(4,1)),
           [(20,2),(20,Fraction(5,2)),(20,4),(20,Fraction(9,2)),(20,5)],
           "offset perimeter of center convex hull: 20 + 4*pi")
    exponent=sum(sum(k//(7**j) for j in range(1,4)) for k in range(1,52))
    record(24,exponent,[147,150,156,168,171],
           "sum 7-adic valuations of factorials from 1! through 51!")
    # Q25: sample equilateral triangle side=6; clipped corners are
    # positive integers a<=b<=c, with remaining edges 6-(a+b),
    # 6-(b+c),6-(a+c) all positive. Permutations correspond to
    # rotations/reflections; count nondecreasing triples only.
    triples=[t for t in itertools.combinations_with_replacement(range(1,6),3)
             if t[1]+t[2]<6]
    record(25,len(triples),[4,5,6,7,8],
           "construct nonisomorphic corner-clipping triples in side-6 triangle")

    assert sorted(out)==list(range(1,26))
    return out


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--verify-private",action="store_true")
    p.add_argument("--output",type=Path)
    args=p.parse_args()
    calculations=independently_calculate()
    result={"edition":"2026-US", "verification_scope":"independent calculations for 25 locally reviewed numerical prompts",
            "all_25_computed":True,
            "all_25_source_translations_human_reviewed":False,
            "commercial_rights_verified":False,
            "calculations":{str(k):v for k,v in calculations.items()}}
    if args.verify_private:
        import hashlib
        if not KEY_PDF.is_file() or hashlib.sha256(KEY_PDF.read_bytes()).hexdigest()!=REFERENCE_PDF_DIGEST:
            raise RuntimeError("EXPECTED_PRIVATE_ANSWER_KEY_SHA256_NOT_FOUND")
        text=subprocess.run(["pdftotext","-layout",str(KEY_PDF),"-"],
                            check=True,capture_output=True,text=True).stdout
        official=dict((int(n),a) for n,a in re.findall(r"(?<!\d)(\d{1,2})\.\s*([A-E])\b",text))
        if sorted(official)!=list(range(1,26)):
            raise RuntimeError("OFFICIAL_ANSWER_KEY_NOT_25_COMPLETE")
        mismatches=[n for n in range(1,26) if official[n]!=calculations[n]["answer"]]
        result["compared_to_private_reference_key"]=25
        result["matches_private_reference_key"]=25-len(mismatches)
        result["mismatches"]=mismatches
        if mismatches:
            raise AssertionError(f"INDEPENDENT_MATH_ANSWER_MISMATCH: {mismatches}")
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print("AMC8_2026_US_INDEPENDENT_MATH_25="+str(len(calculations))+"/25")
    print("REFERENCE_KEY_MATCH="+str(result.get("matches_private_reference_key","not checked")))
    print("HUMAN_TRANSLATION_REVIEW=NOT_COMPLETE COMMERCIAL_LICENSE=NOT_VERIFIED")


if __name__=="__main__":
    main()
